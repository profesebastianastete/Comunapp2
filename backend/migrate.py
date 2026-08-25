"""Migración de esquema de ComunApp.

Agrega las columnas que faltan a las tablas ya existentes. `create_all`
crea tablas nuevas pero NUNCA ejecuta ALTER TABLE, así que cuando un modelo
gana una columna (ej: `telefono`), la base desplegada no la tiene y las
consultas fallan. Este script cierra esa brecha.

Uso (dentro de backend/, en Railway Shell o con el .venv activo):
    python3 migrate.py

Es idempotente: solo agrega lo que falta, nunca modifica ni borra nada.
"""
from sqlalchemy import inspect, text

from database import Base, engine
import models  # noqa: F401 — registra todos los modelos en Base.metadata


def migrar() -> None:
    # Primero, las tablas que no existan.
    Base.metadata.create_all(bind=engine)

    insp = inspect(engine)
    agregadas = 0
    for nombre, tabla in Base.metadata.tables.items():
        if not insp.has_table(nombre):
            continue
        existentes = {c["name"].lower() for c in insp.get_columns(nombre)}
        for col in tabla.columns:
            if col.name.lower() in existentes:
                continue
            try:
                tipo = col.type.compile(engine.dialect)
                with engine.begin() as conn:
                    # ADD COLUMN sin DEFAULT en línea; el default se aplica con un
                    # UPDATE parametrizado (un JSON con llaves rompería text()).
                    conn.execute(text(f"ALTER TABLE {nombre} ADD COLUMN {col.name} {tipo}"))
                    valor = None
                    if col.default is not None:
                        arg = getattr(col.default, "arg", None)
                        if arg is not None:
                            valor = arg() if callable(arg) else arg
                    if valor is not None:
                        conn.execute(
                            text(f"UPDATE {nombre} SET {col.name} = :v WHERE {col.name} IS NULL"),
                            {"v": valor},
                        )
                print(f"[migrate] + {nombre}.{col.name} ({tipo})")
                agregadas += 1
            except Exception as exc:  # noqa: BLE001
                print(f"[migrate] No se pudo agregar {nombre}.{col.name}: {exc!r}")

    if agregadas:
        print(f"[migrate] Listo: {agregadas} columna(s) agregada(s).")
    else:
        print("[migrate] El esquema ya está al día; no hubo nada que agregar.")


if __name__ == "__main__":
    migrar()
