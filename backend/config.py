"""Configuración central de la API. Lee variables de entorno (Railway las inyecta)."""
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Railway inyecta DATABASE_URL (PostgreSQL). En local cae a SQLite.
    database_url: str = "sqlite:///./comunapp.db"

    # Seguridad
    secret_key: str = "cambia-esta-clave-en-produccion"
    jwt_algorithm: str = "HS256"
    access_token_minutes: int = 60 * 12  # 12 horas

    # CORS: orígenes aceptados, separados por coma. Se configura mediante la
    # variable de entorno / secreto CORS_ORIGINS (Railway: Service → Variables).
    #   CORS_ORIGINS=https://comunapp.up.railway.app,https://admin.ejemplo.cl
    # Vacío (default) = modo restringido: solo *.up.railway.app y localhost
    #   (cubre Railway + desarrollo local sin configurar nada).
    # "*" = permite CUALQUIER origen. No usar en producción: deja sin efecto
    #   la protección CORS (solo útil para desarrollo/debugging).
    cors_origins: str = ""

    # Mercado Pago (opcional, para cobros reales)
    mp_access_token: str = ""  # token de la PLATAFORMA (recibe webhooks si las comunidades no tienen propio)

    # URL pública de esta API (la usará Mercado Pago para el webhook de pagos).
    # En Railway: https://TU-SERVICIO.up.railway.app
    base_url: str = ""
    # URL pública del frontend (para los back_urls del Checkout Pro)
    frontend_url: str = ""

    # Correo (SMTP). Si no está configurado, los mensajes se registran en el log
    # (útil en desarrollo) y la app sigue funcionando igual.
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_pass: str = ""
    smtp_from: str = "ComunApp <no-responder@comunapp.cl>"

    @property
    def cors_list(self) -> list[str]:
        # Normaliza: recorta espacios y la barra final. No se convierte a
        # minúsculas porque CORSMiddleware compara el header Origin de forma
        # exacta (los hostnames ya llegan en minúsculas de los navegadores).
        return [o.strip().rstrip("/") for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
