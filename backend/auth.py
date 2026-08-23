"""Autenticación: hash de contraseñas, tokens JWT y guardas por rol (RBAC).

Hashing: PBKDF2-SHA256 con la librería estándar (sin dependencias frágiles).
Sigue verificando hashes antiguos en bcrypt ($2b$...) para no bloquear cuentas
existentes; el login los migra a PBKDF2 automáticamente.
"""
import hashlib
import hmac
import os
from datetime import datetime, timedelta
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from config import get_settings
from database import get_db
from models import MiembroComunidad, Usuario

# passlib solo se usa como compatibilidad con hashes bcrypt antiguos.
try:
    from passlib.context import CryptContext
    _pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")
except Exception:  # pragma: no cover
    _pwd = None

_PBKDF2_ITER = 240_000
bearer = HTTPBearer(auto_error=False)
s = get_settings()


def hash_password(plain: str) -> str:
    salt = os.urandom(16)
    dk = hashlib.pbkdf2_hmac("sha256", plain.encode("utf-8"), salt, _PBKDF2_ITER)
    return f"pbkdf2_sha256${_PBKDF2_ITER}${salt.hex()}${dk.hex()}"


def es_hash_legado(hashed: str) -> bool:
    return hashed.startswith(("$2a$", "$2b$", "$2y$"))


def _verifica_pbkdf2(plain: str, hashed: str) -> bool:
    try:
        _, it, salt_hex, hash_hex = hashed.split("$")
        dk = hashlib.pbkdf2_hmac("sha256", plain.encode("utf-8"),
                                 bytes.fromhex(salt_hex), int(it))
        return hmac.compare_digest(dk.hex(), hash_hex)
    except Exception:
        return False


def _verifica_bcrypt_legado(plain: str, hashed: str) -> bool:
    """Verifica hashes bcrypt antiguos ($2a$/$2b$/$2y$) SIN depender de passlib.

    Usa el módulo `bcrypt` directamente (está fijado en requirements), que es
    confiable. passlib queda solo como último respaldo si acaso está disponible.
    """
    # 1) bcrypt directo — la vía robusta
    try:
        import bcrypt
        candidato = hashed
        # bcrypt.checkpw espera $2a$/$2b$; normalizamos $2y$ a $2b$
        if candidato.startswith("$2y$"):
            candidato = "$2b$" + candidato[4:]
        if bcrypt.checkpw(plain.encode("utf-8"), candidato.encode("utf-8")):
            return True
    except Exception:
        pass
    # 2) respaldo: passlib (solo si logró inicializarse)
    if _pwd is not None:
        try:
            return _pwd.verify(plain, hashed)
        except Exception:
            return False
    return False


def verify_password(plain: str, hashed: str) -> bool:
    if not hashed:
        return False
    if hashed.startswith("pbkdf2_sha256$"):
        return _verifica_pbkdf2(plain, hashed)
    if es_hash_legado(hashed):
        return _verifica_bcrypt_legado(plain, hashed)
    return False


def crear_token(usuario_id: str, rol: str, comunidad_id: Optional[str], unidad: Optional[str]) -> str:
    expira = datetime.utcnow() + timedelta(minutes=s.access_token_minutes)
    return jwt.encode(
        {"sub": usuario_id, "rol": rol, "comunidad_id": comunidad_id, "unidad": unidad, "exp": expira},
        s.secret_key, algorithm=s.jwt_algorithm,
    )


def decodificar(token: str) -> dict:
    try:
        return jwt.decode(token, s.secret_key, algorithms=[s.jwt_algorithm])
    except JWTError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Sesión inválida o expirada.")


def usuario_actual(cred: Optional[HTTPAuthorizationCredentials] = Depends(bearer)) -> dict:
    """Devuelve el payload del JWT. Lanza 401 si no hay token válido."""
    if not cred:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Falta el token de acceso.")
    return decodificar(cred.credentials)


def require_roles(*roles: str):
    """Guarda RBAC: el token debe tener uno de los roles permitidos.

    Uso:  @router.post("/x", dependencies=[Depends(require_roles("ADMIN", "COMITE"))])
    """
    def guardia(payload: dict = Depends(usuario_actual)) -> dict:
        if payload.get("rol") not in roles:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "No tienes permisos para esta acción.")
        return payload
    return guardia


def get_usuario_db(payload: dict = Depends(usuario_actual), db: Session = Depends(get_db)) -> Usuario:
    """Usuario ORM a partir del token (para verificar `activo`, etc.)."""
    u = db.get(Usuario, payload["sub"])
    if not u or not u.activo:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Cuenta no disponible.")
    return u


def comunidad_del_token(payload: dict = Depends(usuario_actual)) -> str:
    """comunidad_id del token (los superadmin no tienen una fija)."""
    cid = payload.get("comunidad_id")
    if not cid:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "El token no está asociado a una comunidad.")
    return cid
