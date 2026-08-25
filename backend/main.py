"""Punto de entrada de la API ComunApp (FastAPI).

Railway ejecuta:  uvicorn main:app --host 0.0.0.0 --port $PORT
Docs interactivas en /docs · health check en /health
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import get_settings
from database import Base, SessionLocal, engine, sincronizar_esquema
from routers import api, mp

# Versión del backend. Se expone en /api/diagnostico para confirmar en
# producción qué código está corriendo (aumenta al hacer cambios).
BACKEND_VERSION = "2.1-cors"

s = get_settings()

# Crea las tablas al arrancar (en producción real usa Alembic para migraciones).
Base.metadata.create_all(bind=engine)
# create_all no hace ALTER: agrega las columnas nuevas que falten (ej: telefono).
try:
    sincronizar_esquema()
except Exception as exc:  # la API debe arrancar igual
    print(f"[esquema] ERROR al sincronizar: {exc!r}")


def bootstrap_datos_iniciales():
    """Primer arranque: si la base está vacía, siembra el superadmin y los
    datos demo para que la aplicación sea utilizable de inmediato (Railway).

    Es idempotente: solo corre cuando no existe ningún usuario.
    """
    from models import Usuario
    from seed import asegurar_superadmin, garantizar_cuentas_demo, seed_all

    # Bloque 1: sembrado completo de datos demo (solo con la base vacía).
    sesion = SessionLocal()
    try:
        if sesion.query(Usuario).count() == 0:
            seed_all(sesion)
            print("[bootstrap] Base vacía → datos demo sembrados "
                  "(superadmin: equipo@comunapp.cl / admin123).")
        else:
            print("[bootstrap] Base con datos → no se siembra.")
    except Exception as exc:  # la API debe arrancar igual; el error queda en el log
        sesion.rollback()
        print(f"[bootstrap] ERROR al sembrar datos: {exc!r}")
    finally:
        sesion.close()

    # Bloque 2: garantía determinista del superadmin. Es independiente del
    # bloque anterior para correr AUN si el sembrado completo falló.
    sesion = SessionLocal()
    try:
        estado_sa = asegurar_superadmin(sesion)
        if estado_sa in ("creado", "reparado"):
            print(f"[bootstrap] Superadmin {estado_sa} (equipo@comunapp.cl / admin123).")
    except Exception as exc:
        sesion.rollback()
        print(f"[bootstrap] ERROR al asegurar el superadmin: {exc!r}")
    finally:
        sesion.close()

    # Bloque 3: reparación de hashes legacy de las demás cuentas demo.
    sesion = SessionLocal()
    try:
        reparadas = garantizar_cuentas_demo(sesion)
        if reparadas:
            print(f"[bootstrap] {reparadas} contraseña(s) demo reparadas a PBKDF2.")
    except Exception as exc:
        sesion.rollback()
        print(f"[bootstrap] ERROR al reparar cuentas demo: {exc!r}")
    finally:
        sesion.close()


bootstrap_datos_iniciales()

app = FastAPI(
    title="ComunApp API",
    description="Backend multi-tenant para la administración de comunidades, parcelas y edificios.",
    version="1.0.0",
)

# CORS incondicional: acepta CUALQUIER origen. Es seguro aquí porque la
# autenticación usa Bearer tokens (no cookies), así que no hay credenciales que
# proteger con CORS. Se ignora a propósito la variable CORS_ORIGINS para que una
# configuración antigua no vuelva a bloquear el despliegue.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api.router)
app.include_router(mp.router)  # Mercado Pago: credenciales, cobros y webhook


@app.get("/health", tags=["sistema"])
def health():
    """Railway usa este endpoint para verificar que el servicio está vivo."""
    return {"status": "ok", "app": "comunapp-api"}


@app.get("/api/diagnostico", tags=["sistema"])
def diagnostico():
    """Estado de la base (público, sin datos sensibles).

    Útil tras desplegar en Railway: si `usuarios` es 0, el bootstrap no corrió.
    """
    from models import Comunidad, Usuario
    sesion = SessionLocal()
    try:
        return {
            "status": "ok",
            # Sube este número cuando cambies el backend para confirmar en
            # producción que la nueva versión está desplegada.
            "version": BACKEND_VERSION,
            "usuarios": sesion.query(Usuario).count(),
            "comunidades": sesion.query(Comunidad).count(),
            "base": "postgresql" if "postgres" in s.database_url else "sqlite (efímera en Railway)",
        }
    finally:
        sesion.close()


@app.get("/", tags=["sistema"])
def root():
    return {
        "app": "ComunApp API",
        "docs": "/docs",
        "health": "/health",
        "estado": "en línea",
    }
