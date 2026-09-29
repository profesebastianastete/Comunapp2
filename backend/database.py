"""Conexión SQLAlchemy. Railway entrega DATABASE_URL (PostgreSQL)."""
import re

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from config import get_settings

s = get_settings()
url = s.database_url

# SQLite necesita check_same_thread; PostgreSQL no.
kwargs = {"connect_args": {"check_same_thread": False}} if url.startswith("sqlite") else {}

engine = create_engine(url, pool_pre_ping=True, **kwargs)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


class Base(DeclarativeBase):
    pass


def get_db():
    """Dependencia de FastAPI: una sesión por request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# Identificadores SQL seguros: letra o guion bajo inicial, luego letras,
# dígitos o guiones bajos; máximo 63 caracteres (longitud de PostgreSQL).
_IDENTIFICADOR_RE = re.compile(r"^[A-Za-z_][A-Za-z0-9_]{0,62}$")


def _identificador_seguro(nombre: str) -> str:
    """Valida un identificador (tabla/columna) antes de insertarlo en DDL.

    El nombre proviene de los modelos SQLAlchemy (no del usuario), pero si un
    modelo se ve comprometido podría contener SQL arbitrario. Rechazar todo lo
    que no sea un identificador plano cierra ese canal de inyección.
    """
    if not _IDENTIFICADOR_RE.match(nombre):
        raise ValueError(f"Identificador SQL no válido: {nombre!r}")
    return nombre


def sincronizar_esquema():
    """Agrega columnas nuevas a tablas ya existentes.

    `Base.metadata.create_all` crea tablas faltantes pero NUNCA ejecuta
    ALTER TABLE: cuando un modelo gana una columna (ej: `telefono`), la base
    desplegada no la tiene y todas las consultas fallan. Este helper compara
    el modelo con la base viva y agrega las columnas que falten. Corre en cada
    arranque; es idempotente y nunca tumba la API (cada ALTER va protegido).
    """
    from sqlalchemy import inspect, text

    insp = inspect(engine)
    for nombre, tabla in Base.metadata.tables.items():
        if not insp.has_table(nombre):
            continue  # la crea create_all
        existentes = {c["name"].lower() for c in insp.get_columns(nombre)}
        for col in tabla.columns:
            if col.name.lower() in existentes:
                continue
            try:
                # Validación anti inyección: tabla, columna y tipo deben ser
                # identificadores/DDL planos antes de interpolarse en el SQL.
                tabla_sql = _identificador_seguro(nombre)
                col_sql = _identificador_seguro(col.name)
                tipo = col.type.compile(engine.dialect)
                if not re.fullmatch(r"[A-Za-z0-9_ ,()\[\]]+", tipo):
                    raise ValueError(f"Tipo SQL no válido: {tipo!r}")
                with engine.begin() as conn:
                    # ADD COLUMN sin DEFAULT en línea: el valor por defecto se
                    # aplica después con un UPDATE parametrizado. Así un default
                    # con llaves (JSON) jamás se interpreta como parámetro de
                    # text() (error "bind parameter 'true'").
                    conn.execute(text(f"ALTER TABLE {tabla_sql} ADD COLUMN {col_sql} {tipo}"))
                    valor = None
                    if col.default is not None:
                        arg = getattr(col.default, "arg", None)
                        if arg is not None:
                            valor = arg() if callable(arg) else arg
                    if valor is not None:
                        conn.execute(
                            text(f"UPDATE {tabla_sql} SET {col_sql} = :v WHERE {col_sql} IS NULL"),
                            {"v": valor},
                        )
                print(f"[esquema] Columna agregada: {nombre}.{col.name} ({tipo})")
            except Exception as exc:  # noqa: BLE001 — nunca romper el arranque
                print(f"[esquema] No se pudo agregar {nombre}.{col.name}: {exc!r}")
