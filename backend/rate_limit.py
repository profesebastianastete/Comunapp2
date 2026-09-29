"""Rate limiting (slowapi): protección contra fuerza bruta y abuso.

Límites por clave compuesta IP + identidad:
- Los endpoints públicos anónimos (login, confirmar-email) se limitan por IP
  Y por el correo intentado (normalizado), para que un atacante no rote IPs
  y enumere/pruebe contraseñas sobre una misma cuenta sin límite.
- Los endpoints autenticados se limitan además por el `sub` del JWT (si lo
  hay), para castigar abuso por usuario sin penalizar a todos los que
  comparten una IP NAT (edificios/comunidades enteras tras una sola IP).

IMPORTANTE (despliegue detrás de proxy, como Railway): la app debe correr con
`uvicorn --proxy-headers --forwarded-allow-ips="*"` para que slowapi vea la IP
real del cliente en X-Forwarded-For y no la del proxy. Esto ya está configurado
en Procfile / railway.toml.

En memoria single-process es suficiente para el despliegue actual (1 instancia).
Si se escalan réplicas, mover el storage a Redis:
    limiter = Limiter(key_func=..., default_limits=[], storage_uri="redis://...")
"""
import json
from typing import Optional

from fastapi import HTTPException, Request, status
from jose import JWTError, jwt
from slowapi import Limiter
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware


def ip_cliente(request: Request) -> str:
    """IP real del cliente, respetando X-Forwarded-For (despliegue tras proxy).

    Cuando la app corre detrás de Railway/proxies, `request.client.host` es la
    IP del proxy; la del cliente va en el primer elemento de X-Forwarded-For.
    Si no hay header, se usa client.host. Equivale a arrancar con
    `uvicorn --proxy-headers`, pero funciona incluso sin esa bandera.
    """
    xff = request.headers.get("x-forwarded-for", "")
    if xff:
        primera = xff.split(",")[0].strip()
        if primera:
            return primera[:64]
    if request.client and request.client.host:
        return request.client.host
    return "127.0.0.1"


# Límites sugeridos para los endpoints sensibles (se usan en routers/api.py).
LOGIN_LIMIT = "5/minute"            # fuerza bruta + enumeración de usuarios
AUTH_GENERIC_LIMIT = "10/minute"    # confirmar-email, refresh, logout
ESCRITURA_LIMIT = "60/minute"       # POST/PUT/DELETE autenticados en general


# Caché del cuerpo crudo de las peticiones a /api/auth/*, indexada por id del
# objeto Request (los objetos Request viven mientras se evalúa el key_fn).
_bodies_cache: dict[int, bytes] = {}


def _identidad_email(request: Request) -> Optional[str]:
    """Correo del cuerpo JSON (login/confirmación), normalizado.

    Lee el body desde `request._body` (Starlette lo cachea tras el primer
    `.body()` — ver cachear_body_middleware) o desde la caché propia. Si el
    body aún no está disponible o no es JSON válido, simplemente no se agrega
    esta dimensión al key: el límite por IP sigue aplicando.
    """
    try:
        raw = getattr(request, "_body", None)
        if raw is None:
            raw = _bodies_cache.get(id(request))
        if raw is None:
            return None
        data = json.loads(raw or b"{}")
        email = data.get("email")
        if isinstance(email, str) and email.strip():
            return email.strip().lower()[:160]
    except Exception:
        pass
    return None


async def cachear_body_middleware(request: Request, call_next):
    """Middleware: fuerza la lectura (y caché interna de Starlette) del body en
    los POST de /api/auth ANTES de que slowapi evalúe el key_fn.

    Starlette almacena el cuerpo en `request._body` tras el primer `await
    request.body()`, así que el endpoint puede volver a leerlo sin problema
    (no consume el stream). Se limita a /api/auth y a métodos con body para no
    tocar uploads ni el resto de la API.
    """
    if (request.method in ("POST", "PUT", "PATCH")
            and request.url.path.startswith("/api/auth")):
        try:
            content_type = request.headers.get("content-type", "")
            if "multipart" not in content_type:
                _bodies_cache[id(request)] = await request.body()
                if len(_bodies_cache) > 512:  # cota anti-fuga de memoria
                    _bodies_cache.clear()
                    _bodies_cache[id(request)] = request._body  # type: ignore[attr-defined]
        except Exception:
            pass
    return await call_next(request)


def key_auth_endpoint(request: Request) -> str:
    """Clave para endpoints de auth públicos: IP + correo intentado.

    Ej.: "ip=1.2.3.4|email=vecino@x.cl" → 5/min POR cuenta y POR IP.
    """
    partes = [f"ip={ip_cliente(request)}"]
    email = _identidad_email(request)
    if email:
        partes.append(f"email={email}")
    return "|".join(partes)


def key_usuario_o_ip(request: Request) -> str:
    """Clave para endpoints autenticados: `sub` del JWT si hay, si no la IP.

    No valida firma/expiración (eso lo hace la dependencia de auth del
    endpoint); aquí solo se extrae una identidad *orientativa* para el bucket
    del limiter. Un header spoofeado solo alcanza su propio bucket (limitado
    también por IP cuando el token es inválido → cae a IP).
    """
    header = request.headers.get("authorization", "")
    if header.lower().startswith("bearer "):
        try:
            payload = jwt.decode(header[7:], key=None, options={"verify_signature": False})
            sub = payload.get("sub")
            if sub:
                return f"user={sub}"
        except JWTError:
            pass
    return f"ip={ip_cliente(request)}"


limiter = Limiter(
    key_func=key_usuario_o_ip,   # bucket por usuario (sub del JWT) o IP
    default_limits=[],           # sin límite global: se aplican por endpoint
    # headers_enabled OFF a propósito: slowapi inyecta los X-RateLimit-* solo
    # cuando el handler declara un parámetro `response: Response`; varios de
    # nuestros handlers devuelven dict sin ese parámetro y la inyección lanza
    # error. El limiter sigue contando y respondiendo 429 igual.
    headers_enabled=False,
    strategy="fixed-window",
)

# Decoradores listos para usar en los routers. `limit_*` exige que el handler
# reciba `request: Request` (requisito de slowapi); `limiter.limit` con
# key_func explícito se usa en handlers sin request (p. ej. el webhook MP).
limit_login = limiter.limit(LOGIN_LIMIT, key_func=key_auth_endpoint)
limit_auth = limiter.limit(AUTH_GENERIC_LIMIT, key_func=key_auth_endpoint)
limit_escritura = limiter.limit(ESCRITURA_LIMIT)


def marcado(f):
    """Decorator auxiliar: marca un handler con límite EXPLÍCITO de auth.

    `_aplicar_limit_escritura` (routers/api.py) salta estas rutas al agregar la
    cota genérica de escritura, evitando dobles límites sobre login/refresh/
    logout/confirmar-email/cambiar-password. Uso:

        @router.post("/auth/login")
        @limit_login
        @marcado
        def login(...)

    Nota: slowapi exige que el handler reciba `request: Request`; los
    decorators de límite conservan la firma vía functools.wraps.
    """
    f._has_explicit_limit = True
    return f

# Excepción 429 amigable (mismo estilo que el resto de la API).
def _excedido(request: Request, exc: RateLimitExceeded):
    raise HTTPException(
        status.HTTP_429_TOO_MANY_REQUESTS,
        "Demasiados intentos. Esperá un momento antes de reintentar.",
        headers={"Retry-After": str(getattr(exc, "retry_after", 60) or 60)},
    )


def registrar_rate_limit(app) -> None:
    """Conecta slowapi a la app FastAPI (llamar una vez en main.py)."""
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _excedido)
    app.add_middleware(SlowAPIMiddleware)
