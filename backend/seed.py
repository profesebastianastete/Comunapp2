"""Siembra datos de demostración en la base de datos.

Uso (dentro de backend/, en Railway Shell o con el .venv activo):
    python3 seed.py                      # siembra sin tocar contraseñas existentes
    python3 seed.py --reset-passwords    # además restaura las contraseñas demo
    bash reset_passwords.sh              # atajo (detecta python3/python solo)

Idempotente: si un registro ya existe, no lo duplica.
"""
import sys
from datetime import date, datetime, timedelta

from database import Base, SessionLocal, engine
from models import (Aviso, Cobro, Comunidad, Factura, MiembroComunidad, Movimiento, Pago,
                    Usuario)
from auth import hash_password

PERIODO = datetime.utcnow().strftime("%Y-%m")

PRECIO = {"COMITE": 0, "PARCELAS": 29900, "CUSTOM": 89000}
NOMBRE = {"COMITE": "Comité", "PARCELAS": "Comunidad de Parcelas", "CUSTOM": "Personalizado"}

# Cuentas demo: (email, nombre, contraseña, rol_global)
CUENTAS_DEMO = [
    ("equipo@comunapp.cl", "Sebastian Astete", "admin123", "SUPERADMIN"),
    ("admin@losalamos.cl", "Rodrigo Fuentes", "admin123", None),
    ("comite@losalamos.cl", "Carla Méndez", "comite123", None),
    ("maria@demo.cl", "María López", "demo123", None),
    ("jorge@demo.cl", "Jorge Salas", "demo123", None),
    ("sofia@torresdelparque.cl", "Sofía Núñez", "admin123", None),
]


def seed_all(s, reset_passwords: bool = False) -> None:
    """Siembra superadmin, comunidades demo, usuarios, cobros, movimientos, avisos
    y facturación SaaS. `s` es una sesión de SQLAlchemy abierta."""

    def dias(n):
        return datetime.utcnow() - timedelta(days=n)

    def usuario(email, nombre, clave, rol_global=None):
        u = s.query(Usuario).filter_by(email=email).first()
        if u:
            # Mantiene el nombre de las cuentas demo sincronizado con esta semilla
            # (corrige bases antiguas que quedaron con nombres genéricos previos).
            if u.nombre != nombre:
                u.nombre = nombre
            # Solo si se pide explícitamente, restaura la contraseña demo
            # (recuperación cuando nadie puede entrar).
            if reset_passwords:
                u.password_hash = hash_password(clave)
                u.activo = True
            return u
        u = Usuario(nombre=nombre, email=email, password_hash=hash_password(clave),
                    rol_global=rol_global)
        s.add(u)
        s.flush()
        return u

    def miembro(u, c, rol, unidad=None):
        existe = s.query(MiembroComunidad).filter_by(usuario_id=u.id, comunidad_id=c.id).first()
        if not existe:
            s.add(MiembroComunidad(usuario_id=u.id, comunidad_id=c.id, rol=rol, unidad=unidad))

    def comunidad(nombre, direccion, ciudad, unidades, plan, mp=False, mp_email=None):
        c = s.query(Comunidad).filter_by(nombre=nombre).first()
        if c:
            return c
        c = Comunidad(nombre=nombre, direccion=direccion, ciudad=ciudad, unidades=unidades,
                      plan=plan, mp_conectada=mp, mp_email=mp_email,
                      mp_fecha=datetime.utcnow() if mp else None)
        s.add(c)
        s.flush()
        return c

    # ── SOLO el superadmin. Sin comunidades ni usuarios demo. ──
    # El administrador crea las comunidades reales desde el panel y da de alta
    # a los vecinos, que reciben confirmación por correo.
    for email, nombre, clave, rol_global in CUENTAS_DEMO[:1]:
        usuario(email, nombre, clave, rol_global=rol_global)

    s.commit()


def garantizar_cuentas_demo(s) -> int:
    """Garantiza que cada cuenta demo pueda iniciar sesión tras un despliegue.

    Si una cuenta demo existe pero su hash quedó con un formato antiguo
    incompatible (bcrypt de la era passlib), lo re-hashea en PBKDF2 con la
    contraseña demo conocida. No toca cuentas nuevas ni contraseñas que el
    usuario haya cambiado (esas ya están en PBKDF2 y verifican bien).

    Devuelve cuántas contraseñas se repararon.
    """
    from auth import es_hash_legado, hash_password

    reparadas = 0
    for email, _nombre, clave, _rol in CUENTAS_DEMO:
        u = s.query(Usuario).filter_by(email=email).first()
        if not u:
            continue  # si no existe, el sembrado completo la crea
        if es_hash_legado(u.password_hash):
            u.password_hash = hash_password(clave)
            u.activo = True
            reparadas += 1
    if reparadas:
        s.commit()
    return reparadas


def asegurar_superadmin(s) -> str:
    """Garantiza de forma DETERMINISTA que el superadmin exista y pueda entrar.

    Corre en cada arranque (no solo con la base vacía). Tres casos:
      1. No existe            → se crea con la contraseña demo (PBKDF2).
      2. Existe con hash malo → se re-hashea con la contraseña demo.
      3. Existe y verifica    → no se toca.

    Devuelve "creado" | "reparado" | "ok".
    """
    from auth import es_hash_legado, hash_password, verify_password

    email, nombre, clave, rol = CUENTAS_DEMO[0]  # el superadmin
    u = s.query(Usuario).filter_by(email=email).first()
    if not u:
        s.add(Usuario(nombre=nombre, email=email, password_hash=hash_password(clave),
                      rol_global=rol, activo=True))
        s.commit()
        return "creado"
    # Si el hash no verifica con la contraseña demo (antiguo o corrupto), se repara.
    if not verify_password(clave, u.password_hash) or es_hash_legado(u.password_hash):
        u.password_hash = hash_password(clave)
        u.activo = True
        if u.rol_global != rol:
            u.rol_global = rol
        s.commit()
        return "reparado"
    return "ok"


if __name__ == "__main__":
    reset = "--reset-passwords" in sys.argv[1:]
    Base.metadata.create_all(bind=engine)
    sesion = SessionLocal()
    try:
        seed_all(sesion, reset_passwords=reset)
    finally:
        sesion.close()
    print("Datos demo sembrados correctamente" + (" (contraseñas restauradas)." if reset else "."))
    print("Credenciales:  equipo@comunapp.cl / admin123 (superadmin)")
    print("               admin@losalamos.cl / admin123   ·   maria@demo.cl / demo123")
