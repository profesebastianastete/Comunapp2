"""Configuración central de la API. Lee variables de entorno (Railway las inyecta)."""
import os
from functools import lru_cache

from pydantic import ValidationError, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Railway inyecta DATABASE_URL (PostgreSQL). En local cae a SQLite.
    database_url: str = "sqlite:///./comunapp.db"

    # Seguridad
    # SECRET_KEY es OBLIGATORIA: se obtiene exclusivamente de la variable de
    # entorno / secreto (local: backend/.env; Railway: Service → Variables o
    # Secrets). Ya no existe un valor hardcodeado por defecto: si falta, la app
    # falla al arrancar con un mensaje claro (ver get_settings) en lugar de
    # firmar los JWT con una clave conocida y pública.
    secret_key: str
    jwt_algorithm: str = "HS256"
    # Access token de vida CORTA (15 min): si un token se filtra, la ventana de
    # abuso es mínima. La sesión se mantiene con un refresh token OPACO de
    # larga vida (se envía solo a /api/auth/refresh; nunca autoriza endpoints
    # de datos). El refresh vive en la tabla `refresh_tokens` solo como hash
    # SHA-256 → es REVOCABLE (logout, cambio de contraseña, cuenta desactivada)
    # y se ROTA en cada renovación. No necesita firma propia: al ser opaco,
    # su validez se comprueba en la base, no criptográficamente.
    access_token_minutes: int = 15
    refresh_token_days: int = 7

    @field_validator("secret_key")
    @classmethod
    def _secret_key_no_vacia(cls, v: str) -> str:
        """Rechaza SECRET_KEY vacía o solo espacios (trata el valor como secreto)."""
        v = v.strip()
        if not v:
            raise ValueError(
                "SECRET_KEY está vacía: definí la variable de entorno / secreto "
                "con una cadena larga y aleatoria"
            )
        return v

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
    """Instancia la configuración desde variables de entorno / secretos.

    SECRET_KEY es obligatoria: se lee de la variable de entorno (o del .env
    local). Si falta, no se usa ningún valor hardcodeado de respaldo: se
    detiene el arranque con un error explícito para evitar firmar JWTs con una
    clave pública/conocida.
    """
    try:
        return Settings()  # type: ignore[call-arg]
    except ValidationError as exc:
        missing = {e["loc"][0] for e in exc.errors() if e.get("loc")}
        if "secret_key" in missing or not os.environ.get("SECRET_KEY", "").strip():
            raise RuntimeError(
                "Falta la variable de entorno SECRET_KEY (secreto obligatorio "
                "para firmar los tokens JWT).\n"
                "  · Local:      creá backend/.env con SECRET_KEY=<cadena larga y aleatoria>\n"
                "                (generá una con:  python -c \"import secrets; print(secrets.token_urlsafe(64))\")\n"
                "  · Railway:    Service → Variables → agregá SECRET_KEY como secreto.\n"
                "No se permite arrancar con una clave por defecto hardcodeada."
            ) from exc
        raise
