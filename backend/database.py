"""Conexión SQLAlchemy. Railway entrega DATABASE_URL (PostgreSQL)."""
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
                tipo = col.type.compile(engine.dialect)
                ddl = f"ALTER TABLE {nombre} ADD COLUMN {col.name} {tipo}"
                # Default escalar (no callable) para no dejar NULLs en filas viejas
                if col.default is not None:
                    arg = getattr(col.default, "arg", None)
                    if arg is not None and not callable(arg):
                        ddl += f" DEFAULT {arg!r}"
                with engine.begin() as conn:
                    conn.execute(text(ddl))
                print(f"[esquema] Columna agregada: {nombre}.{col.name} ({tipo})")
            except Exception as exc:  # noqa: BLE001 — nunca romper el arranque
                print(f"[esquema] No se pudo agregar {nombre}.{col.name}: {exc!r}")
