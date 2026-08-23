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

    # CORS: separa por coma los orígenes permitidos (la URL pública del frontend)
    cors_origins: str = "http://localhost:3000,http://localhost:5173"

    # Mercado Pago (opcional, para cobros reales)
    mp_access_token: str = ""  # token de la PLATAFORMA (recibe webhooks si las comunidades no tienen propio)

    # URL pública de esta API (la usará Mercado Pago para el webhook de pagos).
    # En Railway: https://TU-SERVICIO.up.railway.app
    base_url: str = ""
    # URL pública del frontend (para los back_urls del Checkout Pro)
    frontend_url: str = ""

    @property
    def cors_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
