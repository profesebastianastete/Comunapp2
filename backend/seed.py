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

    # ── superadmin + comunidades ──
    for email, nombre, clave, rol_global in CUENTAS_DEMO[:1]:
        usuario(email, nombre, clave, rol_global=rol_global)

    alamos = comunidad("Los Álamos", "Camino El Bosque km 4", "Pucón", 28, "PARCELAS",
                       mp=True, mp_email="tesoreria@losalamos.cl")
    torres = comunidad("Torres del Parque", "Av. Los Aromos 1520", "Temuco", 42, "COMITE")

    admin = usuario("admin@losalamos.cl", "Rodrigo Fuentes", "admin123")
    miembro(admin, alamos, "ADMIN")
    comite = usuario("comite@losalamos.cl", "Carla Méndez", "comite123")
    miembro(comite, alamos, "COMITE")
    maria = usuario("maria@demo.cl", "María López", "demo123")
    miembro(maria, alamos, "PROPIETARIO", "P-14")
    jorge = usuario("jorge@demo.cl", "Jorge Salas", "demo123")
    miembro(jorge, alamos, "ARRENDATARIO", "P-07")
    sofia = usuario("sofia@torresdelparque.cl", "Sofía Núñez", "admin123")
    miembro(sofia, torres, "ADMIN")

    # ── cobros del mes + algunos pagos ──
    unidades = [("P-03", True), ("P-07", True), ("P-14", False), ("P-18", True),
                ("P-21", False), ("P-25", True)]
    for un, pagado in unidades:
        existe = s.query(Cobro).filter_by(comunidad_id=alamos.id, unidad=un, periodo=PERIODO,
                                          concepto="Pagos del mes").first()
        if not existe:
            estado = "PAGADO" if pagado else "PENDIENTE"
            cb = Cobro(comunidad_id=alamos.id, unidad=un, periodo=PERIODO, concepto="Pagos del mes",
                       monto=55000, estado=estado, vencimiento=date.today())
            s.add(cb)
            s.flush()
            if pagado:
                s.add(Pago(comunidad_id=alamos.id, cobro_id=cb.id, unidad=un, monto=55000,
                           metodo="Mercado Pago", referencia="MP-%s" % un.replace("-", "")))
                s.add(Movimiento(comunidad_id=alamos.id, fecha=date.today(), tipo="INGRESO",
                                 categoria="Pagos del mes", descripcion="Pago %s · Pagos del mes" % un,
                                 monto=55000))

    # ── movimientos de transparencia ──
    movs = [
        ("INGRESO", "Pagos del mes", "Recaudación del mes", 220000, 3),
        ("GASTO", "Mantención", "Poda y jardinería áreas verdes", 85000, 28),
        ("GASTO", "Servicios", "Electricidad áreas comunes", 46500, 25),
        ("GASTO", "Personal", "Conserjería y guardia", 140000, 20),
    ]
    for tipo, cat, desc, monto, d in movs:
        existe = s.query(Movimiento).filter_by(comunidad_id=alamos.id, descripcion=desc).first()
        if not existe:
            s.add(Movimiento(comunidad_id=alamos.id, fecha=dias(d).date(), tipo=tipo,
                             categoria=cat, descripcion=desc, monto=monto, conciliado=True))

    # ── avisos ──
    if not s.query(Aviso).filter_by(comunidad_id=alamos.id, titulo="Pago del mes ya disponible").first():
        s.add(Aviso(comunidad_id=alamos.id, titulo="Pago del mes ya disponible",
                    cuerpo="Ya puedes pagar el mes desde tu cuenta con Mercado Pago. Vence el día 10.",
                    tipo="INFORMATIVO", autor="Comité"))

    # ── facturación SaaS (cobro mensual a cada comunidad) ──
    for i in range(5, -1, -1):
        per = (datetime.utcnow() - timedelta(days=30 * i)).strftime("%Y-%m")
        for c in (alamos, torres):
            existe = s.query(Factura).filter_by(comunidad_id=c.id, periodo=per).first()
            if not existe:
                s.add(Factura(comunidad_id=c.id, periodo=per, plan=NOMBRE[c.plan],
                              monto=PRECIO[c.plan],
                              estado="PENDIENTE" if per == PERIODO else "PAGADA",
                              fecha=datetime.utcnow() - timedelta(days=30 * i)))

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
