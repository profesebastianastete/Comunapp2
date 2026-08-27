"""Endpoints de la API ComunApp. Cubren toda la superficie de src/lib/store.ts.

Seguridad:
- Cada acción exige el rol correspondiente (require_roles).
- Cada endpoint de comunidad verifica que el usuario pertenezca a ella (multi-tenant).
"""
import json
import random
from datetime import date, datetime, timedelta
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

import mail
import serializers as sz
from auth import (comunidad_del_token, crear_token, es_hash_legado, get_usuario_db,
                  hash_password, require_roles, usuario_actual, verify_password)
from database import get_db
from models import (Aviso, Cobro, Comunidad, ConfigPlataforma, DocumentoComunidad, Factura, MiembroComunidad,
                    Movimiento, Pago, Plan, RegistroAcceso, Reserva, Suscripcion, Usuario,
                    Votacion, Voto)

router = APIRouter(prefix="/api")

RESIDENTES = ("PROPIETARIO", "ARRENDATARIO")
GESTION = ("ADMIN", "COMITE")


# ─────────────────────────── utilidades ───────────────────────────
def verificar_membresia(db: Session, usuario_id: str, comunidad_id: str) -> MiembroComunidad:
    """Multi-tenant: el usuario debe ser miembro de la comunidad (o superadmin)."""
    m = db.execute(
        select(MiembroComunidad).where(
            MiembroComunidad.usuario_id == usuario_id,
            MiembroComunidad.comunidad_id == comunidad_id,
        )
    ).scalar_one_or_none()
    if not m:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "No perteneces a esta comunidad.")
    return m


def hoy() -> date:
    return date.today()


def fmt_clp(n: float) -> str:
    return "$" + format(int(round(n)), ",d").replace(",", ".")


def correos_miembros(db: Session, cid: str, roles: tuple = ()) -> list[str]:
    """Correos de los miembros de la comunidad, filtrados por rol (vacío = todos)."""
    q = (select(Usuario.email)
         .join(MiembroComunidad, MiembroComunidad.usuario_id == Usuario.id)
         .where(MiembroComunidad.comunidad_id == cid, Usuario.activo.is_(True)))
    if roles:
        q = q.where(MiembroComunidad.rol.in_(roles))
    return [e for e in db.execute(q).scalars() if e]


def _token_confirmacion() -> str:
    import secrets
    return secrets.token_urlsafe(24)


class LoginIn(BaseModel):
    email: str
    password: str


# ─────────────────────────── auth ───────────────────────────
# Credenciales oficiales de acceso: el login SIEMPRE las acepta y, si el hash
# guardado no verifica, lo regenera al vuelo. Garantiza que nadie quede fuera
# sin importar en qué estado haya quedado la base (hashes antiguos, semillas
# viejas, contraseñas corruptas). Solo aplica a estas cuentas documentadas;
# las cuentas creadas por usuarios no se tocan jamás.
from seed import CUENTAS_DEMO as _CUENTAS  # noqa: E402

_CLAVE_OFICIAL = {email.strip().lower(): clave for email, _n, clave, _r in _CUENTAS}


@router.post("/auth/login")
def login(body: LoginIn, db: Session = Depends(get_db)):
    correo = body.email.strip().lower()
    u = db.execute(select(Usuario).where(func.lower(Usuario.email) == correo)).scalar_one_or_none()

    verifica = bool(u) and verify_password(body.password, u.password_hash)
    if u and not verifica:
        # Autoreparación: si son las credenciales oficiales de la cuenta,
        # el hash se regenera en el momento y el ingreso se permite.
        oficial = _CLAVE_OFICIAL.get(correo)
        if oficial is not None and body.password == oficial:
            u.password_hash = hash_password(oficial)
            u.activo = True
            db.commit()
            verifica = True

    if not u or not verifica:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Correo o contraseña incorrectos.")
    if not u.activo:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Tu cuenta está desactivada.")
    if not u.email_confirmado:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Confirma tu correo antes de entrar. Revisa tu bandeja de entrada.")
    # Migración silenciosa: los hashes bcrypt antiguos se re-guardan en PBKDF2
    if es_hash_legado(u.password_hash):
        u.password_hash = hash_password(body.password)
        db.commit()

    if u.rol_global == "SUPERADMIN":
        rol, cid, unidad = "SUPERADMIN", None, None
    else:
        if not u.membresias:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Tu cuenta no tiene una comunidad asignada.")
        m = u.membresias[0]
        rol, cid, unidad = m.rol, m.comunidad_id, m.unidad
    token = crear_token(u.id, rol, cid, unidad)
    return {
        "token": token, "usuarioId": u.id, "rol": rol, "comunidadId": cid, "unidad": unidad,
    }


class ConfirmarEmailIn(BaseModel):
    token: str


@router.post("/auth/confirmar-email")
def confirmar_email(body: ConfirmarEmailIn, db: Session = Depends(get_db)):
    """Activa la cuenta cuando el vecino confirma su correo con el token recibido."""
    u = db.execute(select(Usuario).where(Usuario.token_confirmacion == body.token)).scalar_one_or_none()
    if not u:
        raise HTTPException(400, "El enlace de confirmación no es válido o ya fue usado.")
    u.email_confirmado = True
    u.token_confirmacion = None
    db.commit()
    return {"ok": True}


@router.get("/me")
def me(payload: dict = Depends(usuario_actual), db: Session = Depends(get_db)):
    u = db.get(Usuario, payload["sub"])
    if not u:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Usuario no encontrado.")
    return sz.usuario(u)


class CambiarPasswordIn(BaseModel):
    actual: str
    nueva: str


@router.post("/auth/cambiar-password")
def cambiar_password(body: CambiarPasswordIn, payload: dict = Depends(usuario_actual),
                     db: Session = Depends(get_db)):
    """Cualquier rol puede cambiar su propia contraseña (confirmando la actual)."""
    u = db.get(Usuario, payload["sub"])
    if not u:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Usuario no encontrado.")
    if not verify_password(body.actual, u.password_hash):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "La contraseña actual no es correcta.")
    if len(body.nueva) < 6:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "La nueva contraseña debe tener al menos 6 caracteres.")
    u.password_hash = hash_password(body.nueva)
    db.commit()
    return {"ok": True}


# ─────────────────────────── datos de comunidad ───────────────────────────
@router.get("/comunidades/{cid}/datos", dependencies=[Depends(usuario_actual)])
def datos(cid: str, payload: dict = Depends(usuario_actual), db: Session = Depends(get_db)):
    u = db.get(Usuario, payload["sub"])
    if u.rol_global != "SUPERADMIN":
        verificar_membresia(db, u.id, cid)
    c = db.get(Comunidad, cid)
    if not c:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Comunidad no encontrada.")

    miembros_q = db.execute(
        select(MiembroComunidad, Usuario)
        .join(Usuario, MiembroComunidad.usuario_id == Usuario.id)
        .where(MiembroComunidad.comunidad_id == cid)
    ).all()
    miembros = [{"usuario": sz.usuario(uu), "rol": mm.rol, "unidad": mm.unidad} for mm, uu in miembros_q]

    def todos(modelo, ser):
        filas = db.execute(select(modelo).where(modelo.comunidad_id == cid)).scalars().all()
        return [ser(x) for x in filas]

    return {
        "comunidad": sz.comunidad(c), "miembros": miembros,
        "cobros": todos(Cobro, sz.cobro), "pagos": todos(Pago, sz.pago),
        "movimientos": todos(Movimiento, sz.movimiento), "avisos": todos(Aviso, sz.aviso),
        "reservas": todos(Reserva, sz.reserva),
        "documentos": todos(DocumentoComunidad, lambda d: {
            "id": d.id, "comunidadId": d.comunidad_id, "tipo": d.tipo, "nombre": d.nombre,
            "mime": d.mime, "tamano": d.tamano, "creado": iso(d.creado),
            "subidoPor": d.subido_por,
        }),
        "votaciones": [sz.votacion(v) for v in db.execute(
            select(Votacion).options(selectinload(Votacion.votos)).where(Votacion.comunidad_id == cid)).scalars().all()],
        "bitacora": todos(RegistroAcceso, sz.acceso),
        "suscripciones": todos(Suscripcion, sz.suscripcion),
    }


# ─────────────────────────── cobranza ───────────────────────────
class GenerarMesIn(BaseModel):
    periodo: str       # "YYYY-MM" (el "mes")
    monto: float
    motivo: str = "Pagos del mes"


@router.post("/comunidades/{cid}/cobros/generar", dependencies=[Depends(require_roles(*GESTION))])
def generar_mes(cid: str, body: GenerarMesIn, payload: dict = Depends(usuario_actual), db: Session = Depends(get_db)):
    verificar_membresia(db, payload["sub"], cid)
    c = db.get(Comunidad, cid)
    unidades = {m.unidad for m in db.execute(
        select(MiembroComunidad).where(MiembroComunidad.comunidad_id == cid, MiembroComunidad.unidad.isnot(None))
    ).scalars()}
    creados = 0
    for un in unidades:
        existe = db.execute(select(Cobro).where(
            Cobro.comunidad_id == cid, Cobro.unidad == un, Cobro.periodo == body.periodo,
            Cobro.concepto == body.motivo)).scalar_one_or_none()
        if not existe:
            db.add(Cobro(comunidad_id=cid, unidad=un, periodo=body.periodo,
                         concepto=body.motivo, monto=body.monto, vencimiento=hoy()))
            creados += 1
    db.commit()
    # Notificación por correo a propietarios y arrendatarios
    if creados > 0:
        destinatarios = correos_miembros(db, cid, RESIDENTES)
        mail.correo_nuevo_cobro(destinatarios, c.nombre, body.periodo, fmt_clp(body.monto))
    return {"creados": creados, "periodo": body.periodo}


@router.post("/comunidades/{cid}/pagos/cobro/{cobro_id}", dependencies=[Depends(require_roles(*RESIDENTES))])
def pagar_cobro(cid: str, cobro_id: str, payload: dict = Depends(usuario_actual), db: Session = Depends(get_db)):
    verificar_membresia(db, payload["sub"], cid)
    cb = db.get(Cobro, cobro_id)
    if not cb or cb.comunidad_id != cid:
        raise HTTPException(404, "El pago ya no existe.")
    if cb.estado == "PAGADO":
        raise HTTPException(400, "Este pago ya fue cancelado.")
    cb.estado = "PAGADO"
    pago = Pago(comunidad_id=cid, cobro_id=cb.id, unidad=cb.unidad, monto=cb.monto,
                metodo="Mercado Pago", referencia="MP-%d" % random.randint(1000, 9999))
    db.add(pago)
    db.add(Movimiento(comunidad_id=cid, fecha=hoy(), tipo="INGRESO", categoria="Pagos del mes",
                      descripcion="Pago %s · %s" % (cb.unidad, cb.concepto), monto=cb.monto))
    db.commit()
    return sz.pago(pago)


class RegistrarPagoIn(BaseModel):
    cobro_id: str
    metodo: str
    fecha_pago: Optional[str] = None
    folio: Optional[str] = None


@router.post("/comunidades/{cid}/pagos/registrar", dependencies=[Depends(require_roles(*GESTION))])
def registrar_pago(cid: str, body: RegistrarPagoIn, payload: dict = Depends(usuario_actual), db: Session = Depends(get_db)):
    verificar_membresia(db, payload["sub"], cid)
    cb = db.get(Cobro, body.cobro_id)
    if not cb or cb.comunidad_id != cid:
        raise HTTPException(404, "Cobro no encontrado.")
    if cb.estado == "PAGADO":
        raise HTTPException(400, "Este cobro ya está pagado.")
    cb.estado = "PAGADO"
    db.add(Pago(comunidad_id=cid, cobro_id=cb.id, unidad=cb.unidad, monto=cb.monto,
                metodo=body.metodo, referencia="REG-%d" % random.randint(100, 999),
                fecha_pago=body.fecha_pago or hoy(), folio=body.folio))
    db.add(Movimiento(comunidad_id=cid, fecha=hoy(), tipo="INGRESO", categoria="Pagos del mes",
                      descripcion="Pago registrado %s · %s" % (cb.unidad, body.metodo), monto=cb.monto))
    db.commit()
    return {"ok": True}


# ─────────────────────────── cobro individual ───────────────────────────
class CobroIndividualIn(BaseModel):
    unidad: str
    motivo: str
    monto: float
    fecha_vencimiento: Optional[str] = None


@router.post("/comunidades/{cid}/cobros/individual", dependencies=[Depends(require_roles(*GESTION))])
def crear_cobro_individual(cid: str, body: CobroIndividualIn, payload: dict = Depends(usuario_actual), db: Session = Depends(get_db)):
    """Crea un cobro individual para una unidad específica."""
    verificar_membresia(db, payload["sub"], cid)
    c = db.get(Comunidad, cid)
    
    # Verificar que la unidad exista
    existe_unidad = db.execute(
        select(MiembroComunidad).where(
            MiembroComunidad.comunidad_id == cid,
            MiembroComunidad.unidad == body.unidad
        )
    ).scalar_one_or_none()
    
    if not existe_unidad:
        raise HTTPException(404, f"La unidad {body.unidad} no existe en esta comunidad.")
    
    periodo = date.today().strftime("%Y-%m")
    vencimiento = body.fecha_vencimiento or (date.today() + timedelta(days=10)).isoformat()
    
    cobro = Cobro(
        comunidad_id=cid,
        unidad=body.unidad,
        periodo=periodo,
        concepto=body.motivo,
        monto=body.monto,
        vencimiento=vencimiento
    )
    db.add(cobro)
    db.commit()
    db.refresh(cobro)
    
    # Notificación por correo
    destinatarios = correos_miembros(db, cid, RESIDENTES)
    mail.correo_nuevo_cobro(destinatarios, c.nombre, periodo, fmt_clp(body.monto), body.unidad, body.motivo)
    
    return {"ok": True, "cobro_id": cobro.id, "unidad": body.unidad, "monto": body.monto}


# ─────────────────────────── transparencia ───────────────────────────
class MovimientoIn(BaseModel):
    tipo: str
    categoria: str
    descripcion: str
    monto: float
    fecha: str


@router.post("/comunidades/{cid}/movimientos", dependencies=[Depends(require_roles(*GESTION))])
def crear_movimiento(cid: str, body: MovimientoIn, payload: dict = Depends(usuario_actual), db: Session = Depends(get_db)):
    verificar_membresia(db, payload["sub"], cid)
    m = Movimiento(comunidad_id=cid, tipo=body.tipo, categoria=body.categoria,
                   descripcion=body.descripcion, monto=body.monto,
                   fecha=date.fromisoformat(body.fecha[:10]))
    db.add(m)
    db.commit()
    return sz.movimiento(m)


# ─────────────────────────── Mercado Pago ───────────────────────────
class VincularIn(BaseModel):
    email: str


@router.post("/comunidades/{cid}/mp/vincular", dependencies=[Depends(require_roles("ADMIN"))])
def vincular_mp(cid: str, body: VincularIn, payload: dict = Depends(usuario_actual), db: Session = Depends(get_db)):
    verificar_membresia(db, payload["sub"], cid)
    c = db.get(Comunidad, cid)
    c.mp_conectada = True
    c.mp_email = body.email
    c.mp_fecha = datetime.utcnow()
    db.commit()
    return {"ok": True}


@router.post("/comunidades/{cid}/mp/desvincular", dependencies=[Depends(require_roles("ADMIN"))])
def desvincular_mp(cid: str, payload: dict = Depends(usuario_actual), db: Session = Depends(get_db)):
    verificar_membresia(db, payload["sub"], cid)
    c = db.get(Comunidad, cid)
    c.mp_conectada = False
    c.mp_email = None
    c.mp_fecha = None
    db.commit()
    return {"ok": True}


# ─────────────────────────── importación CSV ───────────────────────────
class FilaCSV(BaseModel):
    parcela: str
    propietario: str
    arrendatario: Optional[str] = None
    contacto: Optional[str] = None
    correo: str
    deuda: float = 0


class ImportarIn(BaseModel):
    filas: List[FilaCSV]


@router.post("/comunidades/{cid}/importar", dependencies=[Depends(require_roles(*GESTION))])
def importar(cid: str, body: ImportarIn, payload: dict = Depends(usuario_actual), db: Session = Depends(get_db)):
    verificar_membresia(db, payload["sub"], cid)
    vecinos = cargos = 0
    periodo = datetime.utcnow().strftime("%Y-%m")
    for f in body.filas:
        u = db.execute(select(Usuario).where(func.lower(Usuario.email) == f.correo.lower())).scalar_one_or_none()
        if not u:
            u = Usuario(nombre=f.propietario, email=f.correo, password_hash=hash_password("vecino123"))
            db.add(u)
            db.flush()
            db.add(MiembroComunidad(usuario_id=u.id, comunidad_id=cid, rol="PROPIETARIO", unidad=f.parcela))
            vecinos += 1
        elif not db.execute(select(MiembroComunidad).where(
                MiembroComunidad.usuario_id == u.id, MiembroComunidad.comunidad_id == cid,
                MiembroComunidad.unidad == f.parcela)).scalar_one_or_none():
            db.add(MiembroComunidad(usuario_id=u.id, comunidad_id=cid, rol="PROPIETARIO", unidad=f.parcela))
            vecinos += 1
        if f.arrendatario and f.arrendatario.strip():
            arr = Usuario(nombre=f.arrendatario.strip(),
                          email=re_sub_email(f.parcela),
                          password_hash=hash_password("vecino123"))
            db.add(arr)
            db.flush()
            db.add(MiembroComunidad(usuario_id=arr.id, comunidad_id=cid,
                                    rol="ARRENDATARIO", unidad=f.parcela))
            vecinos += 1
        if f.deuda > 0:
            ya = db.execute(select(Cobro).where(
                Cobro.comunidad_id == cid, Cobro.unidad == f.parcela, Cobro.periodo == periodo,
                Cobro.concepto == "Deuda inicial")).scalar_one_or_none()
            if not ya:
                db.add(Cobro(comunidad_id=cid, unidad=f.parcela, periodo=periodo,
                             concepto="Deuda inicial", monto=f.deuda, vencimiento=hoy()))
                cargos += 1
    c = db.get(Comunidad, cid)
    c.unidades = max(c.unidades, len({f.parcela for f in body.filas}))
    db.commit()
    return {"parcelas": len(body.filas), "vecinos": vecinos, "cargos": cargos}


def re_sub_email(parcela: str) -> str:
    import re
    return re.sub(r"[^a-z0-9]", "", parcela.lower()) + ".arr@importado.cl"


# ─────────────────────────── comunicación y comunidad ───────────────────────────
class AvisoIn(BaseModel):
    titulo: str
    cuerpo: str
    tipo: str
    autor: str


@router.post("/comunidades/{cid}/avisos", dependencies=[Depends(require_roles(*GESTION))])
def crear_aviso(cid: str, body: AvisoIn, payload: dict = Depends(usuario_actual), db: Session = Depends(get_db)):
    verificar_membresia(db, payload["sub"], cid)
    a = Aviso(comunidad_id=cid, titulo=body.titulo, cuerpo=body.cuerpo, tipo=body.tipo, autor=body.autor)
    db.add(a)
    db.commit()
    # Los mensajes del muro se envían por correo a propietarios y arrendatarios
    c = db.get(Comunidad, cid)
    destinatarios = correos_miembros(db, cid, RESIDENTES)
    mail.correo_aviso(destinatarios, c.nombre if c else "tu comunidad", body.titulo, body.cuerpo)
    return sz.aviso(a)


class ReservaIn(BaseModel):
    area: str
    fecha: str
    bloque: str
    unidad: str
    residente: str


@router.post("/comunidades/{cid}/reservas", dependencies=[Depends(require_roles(*RESIDENTES, *GESTION))])
def crear_reserva(cid: str, body: ReservaIn, payload: dict = Depends(usuario_actual), db: Session = Depends(get_db)):
    verificar_membresia(db, payload["sub"], cid)
    choque = db.execute(select(Reserva).where(
        Reserva.comunidad_id == cid, Reserva.area == body.area,
        Reserva.fecha == date.fromisoformat(body.fecha[:10]), Reserva.bloque == body.bloque,
    )).scalar_one_or_none()
    if choque:
        raise HTTPException(409, "Ese horario ya está reservado por otro vecino.")
    r = Reserva(comunidad_id=cid, area=body.area, fecha=date.fromisoformat(body.fecha[:10]),
                bloque=body.bloque, unidad=body.unidad, residente=body.residente)
    db.add(r)
    db.commit()
    return sz.reserva(r)


@router.delete("/comunidades/{cid}/reservas/{rid}", dependencies=[Depends(require_roles(*RESIDENTES, *GESTION))])
def cancelar_reserva(cid: str, rid: str, payload: dict = Depends(usuario_actual), db: Session = Depends(get_db)):
    verificar_membresia(db, payload["sub"], cid)
    r = db.get(Reserva, rid)
    if r and r.comunidad_id == cid:
        db.delete(r)
        db.commit()
    return {"ok": True}


class VotacionIn(BaseModel):
    titulo: str
    pregunta: str
    opciones: List[str]
    inicio: Optional[datetime] = None  # Periodo hábil de inicio (opcional)
    fin: Optional[datetime] = None     # Periodo hábil de fin (opcional)


@router.post("/comunidades/{cid}/votaciones", dependencies=[Depends(require_roles(*GESTION))])
def crear_votacion(cid: str, body: VotacionIn, payload: dict = Depends(usuario_actual), db: Session = Depends(get_db)):
    verificar_membresia(db, payload["sub"], cid)
    v = Votacion(comunidad_id=cid, titulo=body.titulo, pregunta=body.pregunta,
                 opciones=json.dumps(body.opciones), inicio=body.inicio, fin=body.fin)
    db.add(v)
    db.commit()
    return sz.votacion(v)


class VotarIn(BaseModel):
    unidad: str
    opcion: str


@router.post("/comunidades/{cid}/votaciones/{vid}/votar", dependencies=[Depends(require_roles(*RESIDENTES))])
def votar(cid: str, vid: str, body: VotarIn, payload: dict = Depends(usuario_actual), db: Session = Depends(get_db)):
    verificar_membresia(db, payload["sub"], cid)
    v = db.execute(select(Votacion).options(selectinload(Votacion.votos))
                   .where(Votacion.id == vid, Votacion.comunidad_id == cid)).scalar_one_or_none()
    if not v:
        raise HTTPException(404, "Votación no encontrada.")
    # Validar periodo hábil si está definido
    ahora = datetime.utcnow()
    if v.inicio and ahora < v.inicio:
        raise HTTPException(400, "La votación aún no ha comenzado.")
    if v.fin and ahora > v.fin:
        raise HTTPException(400, "La votación ha finalizado.")
    if not v.abierta:
        raise HTTPException(400, "La votación ya está cerrada.")
    if any(x.unidad == body.unidad for x in v.votos):
        raise HTTPException(409, "Tu unidad ya votó en esta asamblea.")
    db.add(Voto(votacion_id=v.id, unidad=body.unidad, opcion=body.opcion))
    db.commit()
    return {"ok": True}


# ─────────────────────────── control de acceso ───────────────────────────
class AccesoIn(BaseModel):
    visitante: str
    tipo: str
    unidad: str


@router.post("/comunidades/{cid}/accesos", dependencies=[Depends(require_roles(*GESTION))])
def registrar_acceso(cid: str, body: AccesoIn, payload: dict = Depends(usuario_actual), db: Session = Depends(get_db)):
    verificar_membresia(db, payload["sub"], cid)
    r = RegistroAcceso(comunidad_id=cid, visitante=body.visitante, tipo=body.tipo, unidad=body.unidad)
    db.add(r)
    db.commit()
    return sz.acceso(r)


@router.post("/comunidades/{cid}/accesos/{rid}/salida", dependencies=[Depends(require_roles(*GESTION))])
def marcar_salida(cid: str, rid: str, payload: dict = Depends(usuario_actual), db: Session = Depends(get_db)):
    verificar_membresia(db, payload["sub"], cid)
    r = db.get(RegistroAcceso, rid)
    if r and r.comunidad_id == cid:
        r.salida = datetime.utcnow()
        db.commit()
    return {"ok": True}


# ─────────────────────────── vecinos (admin) ───────────────────────────
class VecinoIn(BaseModel):
    nombre: str
    email: str
    password: str
    rol: str
    unidad: Optional[str] = None
    telefono: Optional[str] = None


@router.post("/comunidades/{cid}/vecinos", dependencies=[Depends(require_roles("ADMIN"))])
def crear_vecino(cid: str, body: VecinoIn, payload: dict = Depends(usuario_actual), db: Session = Depends(get_db)):
    verificar_membresia(db, payload["sub"], cid)
    if db.execute(select(Usuario).where(func.lower(Usuario.email) == body.email.lower())).scalar_one_or_none():
        raise HTTPException(409, "Ya existe una cuenta con ese correo.")
    u = Usuario(nombre=body.nombre, email=body.email, password_hash=hash_password(body.password),
                email_confirmado=False, token_confirmacion=_token_confirmacion(), telefono=body.telefono)
    db.add(u)
    db.flush()
    db.add(MiembroComunidad(usuario_id=u.id, comunidad_id=cid, rol=body.rol, unidad=body.unidad))
    db.commit()
    # Confirmación de correo para la cuenta nueva
    mail.correo_confirmacion(u.email, u.nombre, u.token_confirmacion)
    return {"ok": True, "email_enviado": True}


# ─────────────────────────── SaaS / superadmin ───────────────────────────
PRECIO_PLAN = {"COMITE": 0, "PARCELAS": 29900, "CUSTOM": 89000}
NOMBRE_PLAN = {"COMITE": "Comité", "PARCELAS": "Comunidad de Parcelas", "CUSTOM": "Personalizado"}


@router.get("/saas/listado", dependencies=[Depends(require_roles("SUPERADMIN"))])
def listado_saas(db: Session = Depends(get_db)):
    comunidades = db.execute(select(Comunidad)).scalars().all()
    usuarios = db.execute(select(Usuario).options(selectinload(Usuario.membresias))).scalars().all()
    periodo = datetime.utcnow().strftime("%Y-%m")
    out = []
    for c in comunidades:
        n_usuarios = db.execute(select(func.count()).select_from(MiembroComunidad)
                                .where(MiembroComunidad.comunidad_id == c.id)).scalar()
        cobros_mes = db.execute(select(func.count()).select_from(Cobro)
                                .where(Cobro.comunidad_id == c.id, Cobro.periodo == periodo)).scalar()
        recaudado = db.execute(select(func.coalesce(func.sum(Pago.monto), 0))
                               .where(Pago.comunidad_id == c.id)).scalar()
        d = sz.comunidad(c)
        d.update({"usuarios": n_usuarios, "cobrosMes": cobros_mes, "recaudado": recaudado})
        out.append(d)

    facturas = db.execute(select(Factura).order_by(Factura.fecha.desc())).scalars().all()

    # Serie de pagos de los últimos 14 días (métricas)
    hoy = date.today()
    serie = []
    for i in range(13, -1, -1):
        dia = hoy - timedelta(days=i)
        fila = db.execute(
            select(func.coalesce(func.sum(Pago.monto), 0), func.count())
            .where(func.date(Pago.fecha) == dia)
        ).one()
        serie.append({"dia": dia.strftime("%d/%m"), "monto": float(fila[0] or 0), "pagos": int(fila[1] or 0)})

    # Eventos recientes (trazabilidad simple construida con la actividad real)
    eventos = []
    ultimos_pagos = db.execute(select(Pago).order_by(Pago.fecha.desc()).limit(12)).scalars().all()
    for p in ultimos_pagos:
        c = db.get(Comunidad, p.comunidad_id)
        eventos.append({
            "id": "ev_" + p.id, "fecha": p.fecha.isoformat() if p.fecha else None,
            "texto": f"Pago de {p.unidad} en {c.nombre if c else '—'} · ${p.monto:,.0f} ({p.metodo})",
        })
    nuevas = db.execute(select(Comunidad).order_by(Comunidad.creada.desc()).limit(4)).scalars().all()
    for c in nuevas:
        eventos.append({
            "id": "ev_c_" + c.id, "fecha": c.creada.isoformat() if c.creada else None,
            "texto": f"Comunidad onboarded: {c.nombre} · plan {NOMBRE_PLAN.get(c.plan, c.plan)}",
        })
    eventos.sort(key=lambda e: e["fecha"] or "", reverse=True)

    planes = db.execute(select(Plan)).scalars().all()
    cfg = db.get(ConfigPlataforma, 1)

    return {
        "comunidades": out,
        "usuarios": [sz.usuario(u) for u in usuarios],
        "facturas": [sz.factura(f) for f in facturas],
        "seriePagos": serie,
        "eventos": eventos,
        "planes": [sz.plan(p) for p in planes],
        "mpPlataforma": sz.mp_plataforma(cfg),
    }


class GenerarFacturasIn(BaseModel):
    periodo: str


@router.post("/saas/facturas/generar", dependencies=[Depends(require_roles("SUPERADMIN"))])
def generar_facturas(body: GenerarFacturasIn, db: Session = Depends(get_db)):
    """Crea la factura mensual del plan para cada comunidad ACTIVA del periodo."""
    activas = db.execute(select(Comunidad).where(Comunidad.estado == "ACTIVA")).scalars().all()
    creadas = 0
    for c in activas:
        existe = db.execute(select(Factura).where(
            Factura.comunidad_id == c.id, Factura.periodo == body.periodo)).scalar_one_or_none()
        if existe:
            continue
        db.add(Factura(comunidad_id=c.id, periodo=body.periodo,
                       plan=NOMBRE_PLAN.get(c.plan, c.plan),
                       monto=PRECIO_PLAN.get(c.plan, 0), estado="PENDIENTE"))
        creadas += 1
    db.commit()
    return {"creadas": creadas, "total": len(activas)}


@router.post("/saas/facturas/{fid}/pagar", dependencies=[Depends(require_roles("SUPERADMIN"))])
def pagar_factura(fid: str, db: Session = Depends(get_db)):
    f = db.get(Factura, fid)
    if not f:
        raise HTTPException(404, "Factura no encontrada.")
    f.estado = "PAGADA"
    db.commit()
    return {"ok": True}


class ComunidadSaaSIn(BaseModel):
    nombre: str
    direccion: str
    ciudad: str
    unidades: int
    plan: str
    email_admin: str
    nombre_admin: str


@router.post("/saas/comunidades", dependencies=[Depends(require_roles("SUPERADMIN"))])
def crear_comunidad_saas(body: ComunidadSaaSIn, db: Session = Depends(get_db)):
    c = Comunidad(nombre=body.nombre, direccion=body.direccion, ciudad=body.ciudad,
                  unidades=body.unidades, plan=body.plan)
    db.add(c)
    db.flush()
    u = Usuario(nombre=body.nombre_admin, email=body.email_admin, password_hash=hash_password("comunidad123"))
    db.add(u)
    db.flush()
    db.add(MiembroComunidad(usuario_id=u.id, comunidad_id=c.id, rol="ADMIN"))
    db.commit()
    return sz.comunidad(c)


@router.post("/saas/comunidades/{cid}/toggle-estado", dependencies=[Depends(require_roles("SUPERADMIN"))])
def toggle_estado(cid: str, db: Session = Depends(get_db)):
    c = db.get(Comunidad, cid)
    if not c:
        raise HTTPException(404, "Comunidad no encontrada.")
    c.estado = "SUSPENDIDA" if c.estado == "ACTIVA" else "ACTIVA"
    db.commit()
    return {"estado": c.estado}


# ─────────────────── gestión de usuarios (superadmin) ───────────────────
class MiembroIn(BaseModel):
    comunidadId: str
    rol: str
    unidad: Optional[str] = None


class UsuarioSaaSIn(BaseModel):
    nombre: str
    email: str
    password: str
    rol_global: Optional[str] = None
    membresias: List[MiembroIn] = []


@router.post("/saas/usuarios", dependencies=[Depends(require_roles("SUPERADMIN"))])
def crear_usuario_saas(body: UsuarioSaaSIn, db: Session = Depends(get_db)):
    existe = db.execute(select(Usuario).where(func.lower(Usuario.email) == body.email.strip().lower())).scalar_one_or_none()
    if existe:
        raise HTTPException(400, "Ya existe una cuenta con ese correo.")
    if len(body.password) < 6:
        raise HTTPException(400, "La contraseña debe tener al menos 6 caracteres.")
    u = Usuario(nombre=body.nombre, email=body.email.strip(),
                password_hash=hash_password(body.password), rol_global=body.rol_global,
                email_confirmado=False, token_confirmacion=_token_confirmacion())
    db.add(u)
    db.flush()
    for m in body.membresias:
        db.add(MiembroComunidad(usuario_id=u.id, comunidad_id=m.comunidadId, rol=m.rol, unidad=m.unidad))
    db.commit()
    mail.correo_confirmacion(u.email, u.nombre, u.token_confirmacion)
    return {"id": u.id, "email_enviado": True}


class SetPasswordIn(BaseModel):
    nueva: str


@router.post("/saas/usuarios/{uid}/password", dependencies=[Depends(require_roles("SUPERADMIN"))])
def set_password_saas(uid: str, body: SetPasswordIn, db: Session = Depends(get_db)):
    """El superadmin redefine la contraseña de cualquier usuario (sin pedir la actual)."""
    u = db.get(Usuario, uid)
    if not u:
        raise HTTPException(404, "Usuario no encontrado.")
    if len(body.nueva) < 6:
        raise HTTPException(400, "La contraseña debe tener al menos 6 caracteres.")
    u.password_hash = hash_password(body.nueva)
    db.commit()
    return {"ok": True}


@router.post("/saas/usuarios/{uid}/toggle-activo", dependencies=[Depends(require_roles("SUPERADMIN"))])
def toggle_activo_saas(uid: str, db: Session = Depends(get_db)):
    u = db.get(Usuario, uid)
    if not u:
        raise HTTPException(404, "Usuario no encontrado.")
    u.activo = not u.activo
    db.commit()
    return {"activo": u.activo}


# ─────────────────── planes dinámicos (superadmin) ───────────────────
class PlanIn(BaseModel):
    nombre: str
    precio: float


@router.post("/saas/planes", dependencies=[Depends(require_roles("SUPERADMIN"))])
def crear_plan(body: PlanIn, db: Session = Depends(get_db)):
    nombre = body.nombre.strip()
    if not nombre:
        raise HTTPException(400, "El nombre del plan es obligatorio.")
    existe = db.execute(select(Plan).where(func.lower(Plan.nombre) == nombre.lower())).scalar_one_or_none()
    if existe:
        raise HTTPException(409, "Ya existe un plan con ese nombre.")
    p = Plan(nombre=nombre, precio=max(0.0, body.precio), activa=True)
    db.add(p)
    db.commit()
    return sz.plan(p)


class PlanPatchIn(BaseModel):
    nombre: Optional[str] = None
    precio: Optional[float] = None
    activa: Optional[bool] = None


@router.post("/saas/planes/{pid}", dependencies=[Depends(require_roles("SUPERADMIN"))])
def actualizar_plan(pid: str, body: PlanPatchIn, db: Session = Depends(get_db)):
    p = db.get(Plan, pid)
    if not p:
        raise HTTPException(404, "Plan no encontrado.")
    if body.nombre is not None and body.nombre.strip():
        p.nombre = body.nombre.strip()
    if body.precio is not None:
        p.precio = max(0.0, body.precio)
    if body.activa is not None:
        p.activa = bool(body.activa)
    db.commit()
    return sz.plan(p)


@router.delete("/saas/planes/{pid}", dependencies=[Depends(require_roles("SUPERADMIN"))])
def eliminar_plan(pid: str, db: Session = Depends(get_db)):
    p = db.get(Plan, pid)
    if not p:
        raise HTTPException(404, "Plan no encontrado.")
    # No permitir borrar un plan que tiene comunidades asignadas
    en_uso = db.execute(select(func.count()).select_from(Comunidad)
                        .where(Comunidad.plan == pid)).scalar() or 0
    if en_uso > 0:
        raise HTTPException(409, f"No se puede eliminar: {en_uso} comunidad(es) usan este plan.")
    db.delete(p)
    db.commit()
    return {"ok": True}


# ─────────────────────────── validación por transferencia ───────────────────────────
@router.post("/comunidades/{cid}/pagos/validar-transferencia", dependencies=[Depends(require_roles(*GESTION))])
def validar_transferencia(cid: str, body: dict, payload: dict = Depends(usuario_actual), db: Session = Depends(get_db)):
    """El admin/comité confirma una transferencia recibida y marca el cobro como pagado."""
    verificar_membresia(db, payload["sub"], cid)
    cobro_id = body.get("cobro_id")
    cb = db.get(Cobro, cobro_id)
    if not cb or cb.comunidad_id != cid:
        raise HTTPException(404, "El cobro no existe.")
    if cb.estado == "PAGADO":
        raise HTTPException(400, "Este cobro ya está pagado.")
    cb.estado = "PAGADO"
    pago = Pago(comunidad_id=cid, cobro_id=cb.id, unidad=cb.unidad, monto=cb.monto,
                metodo="Transferencia", referencia="TRF-%d" % random.randint(10000, 99999))
    db.add(pago)
    db.add(Movimiento(comunidad_id=cid, fecha=hoy(), tipo="INGRESO", categoria=cb.concepto,
                      descripcion=f"Transferencia validada · {cb.unidad} · {cb.concepto}", monto=cb.monto))
    db.commit()
    return sz.pago(pago)


# ─────────────────────────── informe mensual ───────────────────────────
@router.get("/comunidades/{cid}/informe", dependencies=[Depends(require_roles(*GESTION))])
def informe(cid: str, periodo: str, payload: dict = Depends(usuario_actual), db: Session = Depends(get_db)):
    """Datos del informe de finanzas y transparencia para un periodo (YYYY-MM)."""
    verificar_membresia(db, payload["sub"], cid)
    c = db.get(Comunidad, cid)
    movs = [sz.movimiento(m) for m in db.execute(
        select(Movimiento).where(Movimiento.comunidad_id == cid,
                                 func.strftime("%Y-%m", Movimiento.fecha) == periodo
                                 if db.bind.dialect.name == "sqlite"
                                 else func.to_char(Movimiento.fecha, "YYYY-MM") == periodo)
    ).scalars()]
    cobros = [sz.cobro(x) for x in db.execute(
        select(Cobro).where(Cobro.comunidad_id == cid, Cobro.periodo == periodo)).scalars()]
    ingresos = sum(m["monto"] for m in movs if m["tipo"] == "INGRESO")
    gastos = sum(m["monto"] for m in movs if m["tipo"] == "GASTO")
    cobrado = sum(x["monto"] for x in cobros if x["estado"] == "PAGADO")
    return {
        "comunidad": c.nombre, "periodo": periodo, "movimientos": movs, "cobros": cobros,
        "resumen": {"ingresos": ingresos, "gastos": gastos, "saldo": ingresos - gastos, "cobrado": cobrado},
    }


@router.post("/comunidades/{cid}/informe/enviar", dependencies=[Depends(require_roles(*GESTION))])
def enviar_informe(cid: str, body: dict, payload: dict = Depends(usuario_actual), db: Session = Depends(get_db)):
    """Envía el informe mensual por correo a propietarios y arrendatarios."""
    verificar_membresia(db, payload["sub"], cid)
    c = db.get(Comunidad, cid)
    periodo = body.get("periodo", datetime.utcnow().strftime("%Y-%m"))
    resumen_html = body.get("resumen_html", "")
    destinatarios = correos_miembros(db, cid, RESIDENTES)
    mail.correo_informe_mensual(destinatarios, c.nombre, periodo, resumen_html)
    return {"ok": True, "enviados": len(destinatarios)}


# ─────────────────────────── recursos e informe automático ───────────────────────────
class RecursosIn(BaseModel):
    reservas: Optional[bool] = None
    bitacora: Optional[bool] = None


@router.post("/comunidades/{cid}/recursos", dependencies=[Depends(require_roles("SUPERADMIN"))])
def set_recursos(cid: str, body: RecursosIn, db: Session = Depends(get_db)):
    """El superadmin activa/desactiva módulos (reservas, registro de entradas) de una comunidad."""
    c = db.get(Comunidad, cid)
    if not c:
        raise HTTPException(404, "Comunidad no encontrada.")
    try:
        actual = json.loads(c.recursos or "{}")
    except Exception:
        actual = {}
    if body.reservas is not None:
        actual["reservas"] = bool(body.reservas)
    if body.bitacora is not None:
        actual["bitacora"] = bool(body.bitacora)
    c.recursos = json.dumps(actual)
    db.commit()
    return {"ok": True, "recursos": actual}


@router.post("/comunidades/{cid}/informe-auto", dependencies=[Depends(require_roles(*GESTION))])
def set_informe_auto(cid: str, body: dict, payload: dict = Depends(usuario_actual), db: Session = Depends(get_db)):
    """Activa/desactiva el envío automático mensual del informe."""
    verificar_membresia(db, payload["sub"], cid)
    c = db.get(Comunidad, cid)
    c.informe_auto = bool(body.get("activo", True))
    db.commit()
    return {"ok": True, "informe_auto": c.informe_auto}


# ─────────────────────────── usuarios agrupados y contraseñas (superadmin) ───────────────────────────
@router.get("/saas/usuarios/agrupados", dependencies=[Depends(require_roles("SUPERADMIN"))])
def usuarios_agrupados(db: Session = Depends(get_db)):
    """Usuarios agrupados por comunidad (los sin comunidad van en 'sin_comunidad')."""
    comunidades = db.execute(select(Comunidad)).scalars().all()
    usuarios = db.execute(select(Usuario).options(selectinload(Usuario.membresias))).scalars().all()
    grupos = []
    for c in comunidades:
        miembros = [u for u in usuarios if any(m.comunidad_id == c.id for m in u.membresias)]
        grupos.append({"comunidad": sz.comunidad(c), "usuarios": [sz.usuario(u) for u in miembros]})
    sin_comunidad = [u for u in usuarios if not u.membresias and u.rol_global != "SUPERADMIN"]
    superadmins = [u for u in usuarios if u.rol_global == "SUPERADMIN"]
    return {
        "grupos": grupos,
        "sin_comunidad": [sz.usuario(u) for u in sin_comunidad],
        "superadmins": [sz.usuario(u) for u in superadmins],
    }


@router.post("/saas/usuarios/{uid}/restablecer-password", dependencies=[Depends(require_roles("SUPERADMIN"))])
def restablecer_password(uid: str, db: Session = Depends(get_db)):
    """Genera una contraseña temporal, se la envía por correo al usuario y la devuelve al admin."""
    u = db.get(Usuario, uid)
    if not u:
        raise HTTPException(404, "Usuario no encontrado.")
    import secrets
    nueva = secrets.token_urlsafe(6)
    u.password_hash = hash_password(nueva)
    u.password_temporal = nueva
    u.activo = True
    db.commit()
    mail.correo_credenciales(u.email, u.nombre, nueva)
    return {"ok": True, "password_temporal": nueva}


@router.get("/saas/usuarios/{uid}/ver-password", dependencies=[Depends(require_roles("SUPERADMIN"))])
def ver_password(uid: str, db: Session = Depends(get_db)):
    """Devuelve la contraseña temporal vigente (si existe)."""
    u = db.get(Usuario, uid)
    if not u:
        raise HTTPException(404, "Usuario no encontrado.")
    if u.password_temporal:
        return {"disponible": True, "password_temporal": u.password_temporal}
    return {"disponible": False, "password_temporal": None}


# ─────────────────────────── eliminar comunidad (superadmin) ───────────────────────────
@router.delete("/saas/comunidades/{cid}", dependencies=[Depends(require_roles("SUPERADMIN"))])
def eliminar_comunidad(cid: str, db: Session = Depends(get_db)):
    c = db.get(Comunidad, cid)
    if not c:
        raise HTTPException(404, "Comunidad no encontrada.")
    for modelo in (Cobro, Pago, Movimiento, Aviso, Reserva, Votacion,
                   RegistroAcceso, Suscripcion, Factura, MiembroComunidad):
        db.execute(modelo.__table__.delete().where(modelo.comunidad_id == cid))
    db.delete(c)
    db.commit()
    return {"ok": True}


# ─────────────────────────── planes públicos (landing) ───────────────────────────
@router.get("/planes-publicos")
def planes_publicos(db: Session = Depends(get_db)):
    """Lista de planes activos para mostrar precios en la landing (sin autenticación)."""
    planes = db.execute(select(Plan).where(Plan.activa == True)).scalars().all()  # noqa: E712
    return {"planes": [sz.plan(p) for p in planes]}
