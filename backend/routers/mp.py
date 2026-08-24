"""Integración REAL con Mercado Pago (Checkout Pro).

Cada comunidad (tenant) configura sus propias credenciales desde el panel:
  - Access Token  → lo usa ESTE backend para crear cobros y verificar pagos.
  - Public Key    → la usa el navegador para mostrar el punto de pago.

Endpoints:
  POST   /api/comunidades/{cid}/mp/configurar   guardar credenciales (ADMIN/SUPERADMIN)
  POST   /api/comunidades/{cid}/mp/probar       probar conexión contra /users/me
  POST   /api/comunidades/{cid}/mp/desvincular  borrar credenciales
  POST   /api/comunidades/{cid}/mp/cobros       crear preferencia (punto de pago)
  POST   /api/mp/webhook                        notificación de pagos (público)
"""
from datetime import datetime
from typing import Optional

import httpx
from fastapi import APIRouter, Body, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

import serializers as sz
from auth import require_roles, usuario_actual
from config import get_settings
from database import get_db
from models import Cobro, Comunidad, ConfigPlataforma, Factura, Movimiento, Pago, Suscripcion

router = APIRouter(prefix="/api", tags=["mercado-pago"])

MP_API = "https://api.mercadopago.com"

# Comisiones que se suman a cada cobro: 3% ComunApp + 2% Mercado Pago = 5% total.
COMISION_APP = 0.03
COMISION_MP = 0.02


def con_comision(monto: float) -> dict:
    """Devuelve el desglose: base + 3% app + 2% MP = total a cobrar."""
    com_app = round(monto * COMISION_APP)
    com_mp = round(monto * COMISION_MP)
    return {
        "base": monto,
        "comisionApp": com_app,
        "comisionMP": com_mp,
        "total": monto + com_app + com_mp,
    }


# ── utilidades ────────────────────────────────────────────────
def _comunidad(cid: str, db: Session) -> Comunidad:
    c = db.get(Comunidad, cid)
    if not c:
        raise HTTPException(404, "Comunidad no encontrada.")
    return c


def _puede_gestionar(payload: dict, cid: str) -> None:
    """ADMIN solo gestiona su propia comunidad; SUPERADMIN cualquiera."""
    if payload.get("rol") == "ADMIN" and payload.get("comunidad_id") != cid:
        raise HTTPException(403, "No tienes permisos sobre esta comunidad.")


def _modo_de(c: Comunidad) -> str:
    if c.mp_modo:
        return c.mp_modo
    return "sandbox" if (c.mp_access_token or "").startswith("TEST") else "produccion"


class ConfigMP(BaseModel):
    access_token: str
    public_key: str
    email: str
    modo: str = "sandbox"


class CobroMPIn(BaseModel):
    monto: float
    concepto: str
    unidad: Optional[str] = None
    email_pagador: Optional[str] = None


# ── configuración de credenciales ─────────────────────────────
@router.post("/comunidades/{cid}/mp/configurar",
             dependencies=[Depends(require_roles("ADMIN", "SUPERADMIN"))])
def configurar(cid: str, body: ConfigMP,
               payload: dict = Depends(usuario_actual), db: Session = Depends(get_db)):
    _puede_gestionar(payload, cid)
    c = _comunidad(cid, db)
    token = body.access_token.strip()
    if not token:
        raise HTTPException(400, "El Access Token es obligatorio.")
    c.mp_access_token = token
    c.mp_public_key = body.public_key.strip()
    c.mp_email = body.email.strip()
    c.mp_modo = "sandbox" if (body.modo == "sandbox" or token.startswith("TEST")) else "produccion"
    c.mp_conectada = True
    c.mp_fecha = datetime.utcnow()
    db.commit()
    return {"ok": True, "mensaje": "Credenciales guardadas.", "modo": c.mp_modo}


@router.post("/comunidades/{cid}/mp/probar",
             dependencies=[Depends(require_roles("ADMIN", "COMITE", "SUPERADMIN"))])
async def probar_conexion(cid: str,
                          payload: dict = Depends(usuario_actual), db: Session = Depends(get_db)):
    _puede_gestionar(payload, cid) if payload.get("rol") == "ADMIN" else None
    c = _comunidad(cid, db)
    if not c.mp_access_token:
        return {"ok": False, "mensaje": "Primero configura el Access Token de Mercado Pago."}
    try:
        async with httpx.AsyncClient(timeout=12) as cli:
            r = await cli.get(f"{MP_API}/users/me",
                              headers={"Authorization": f"Bearer {c.mp_access_token}"})
        if r.status_code == 200:
            me = r.json()
            return {
                "ok": True,
                "cuenta": me.get("email") or c.mp_email,
                "site_id": me.get("site_id", ""),
                "mensaje": ("Conexión correcta en modo sandbox. Los cobros serán de prueba."
                            if _modo_de(c) == "sandbox"
                            else "Conexión correcta. La comunidad puede cobrar de forma real."),
            }
        return {"ok": False, "mensaje": f"Mercado Pago rechazó el Access Token (HTTP {r.status_code})."}
    except httpx.HTTPError:
        return {"ok": False, "mensaje": "No se pudo contactar a Mercado Pago. Revisa tu conexión."}


@router.post("/comunidades/{cid}/mp/desvincular",
             dependencies=[Depends(require_roles("ADMIN", "SUPERADMIN"))])
def desvincular(cid: str, payload: dict = Depends(usuario_actual), db: Session = Depends(get_db)):
    _puede_gestionar(payload, cid)
    c = _comunidad(cid, db)
    c.mp_access_token = None
    c.mp_public_key = None
    c.mp_email = None
    c.mp_modo = None
    c.mp_conectada = False
    c.mp_fecha = None
    db.commit()
    return {"ok": True}


# ── generación de cobros (Checkout Pro) ───────────────────────
@router.post("/comunidades/{cid}/mp/cobros",
             dependencies=[Depends(require_roles("ADMIN", "SUPERADMIN"))])
async def crear_cobro(cid: str, body: CobroMPIn,
                      payload: dict = Depends(usuario_actual), db: Session = Depends(get_db)):
    """Crea una preferencia de pago en Mercado Pago y devuelve el punto de pago."""
    _puede_gestionar(payload, cid)
    c = _comunidad(cid, db)
    if not c.mp_access_token:
        raise HTTPException(400, "Configura primero las credenciales de Mercado Pago de esta comunidad.")
    if body.monto <= 0:
        raise HTTPException(400, "El monto debe ser mayor a 0.")

    s = get_settings()
    titulo = body.concepto + (f" · {body.unidad}" if body.unidad else "")
    referencia = f"{cid}|{body.unidad or 'general'}"

    # Se cobra el monto base + 5% de comisiones (3% app + 2% MP)
    com = con_comision(body.monto)

    preferencia: dict = {
        "items": [{"title": titulo, "quantity": 1, "unit_price": round(com["total"], 2)}],
        "external_reference": referencia,
        "metadata": {"comunidad_id": cid, "unidad": body.unidad or ""},
    }
    if body.email_pagador:
        preferencia["payer"] = {"email": body.email_pagador}
    if s.base_url:
        preferencia["notification_url"] = f"{s.base_url.rstrip('/')}/api/mp/webhook"
    if s.frontend_url:
        f = s.frontend_url.rstrip("/")
        preferencia["back_urls"] = {
            "success": f"{f}/dashboard", "failure": f"{f}/dashboard", "pending": f"{f}/dashboard",
        }
        preferencia["auto_return"] = "approved"

    async with httpx.AsyncClient(timeout=15) as cli:
        r = await cli.post(f"{MP_API}/checkout/preferences",
                           json=preferencia,
                           headers={"Authorization": f"Bearer {c.mp_access_token}"})
    if r.status_code not in (200, 201):
        detalle = r.text[:300]
        raise HTTPException(502, f"Mercado Pago no creó el cobro (HTTP {r.status_code}): {detalle}")
    pref = r.json()

    modo = _modo_de(c)
    punto = pref.get("sandbox_init_point") if modo == "sandbox" else pref.get("init_point")
    return {
        "id": pref.get("id", ""),
        "puntoDePago": punto or pref.get("init_point", ""),
        "monto": body.monto,
        "total": com["total"],
        "comisionApp": com["comisionApp"],
        "comisionMP": com["comisionMP"],
        "concepto": body.concepto,
        "unidad": body.unidad,
        "modo": modo,
        "creado": datetime.utcnow().isoformat(),
    }


# ── cobrar factura de comunidad vía Mercado Pago (superadmin) ─
@router.post("/saas/facturas/{fid}/cobrar-mp",
             dependencies=[Depends(require_roles("SUPERADMIN"))])
async def cobrar_factura_mp(fid: str, db: Session = Depends(get_db)):
    """Crea un punto de pago de Mercado Pago por una factura de comunidad.

    El monto cobrado incluye la comisión total del 5% (3% app + 2% MP).
    Usa el Access Token de la PLATAFORMA (config.mp_access_token).
    """
    f = db.get(Factura, fid)
    if not f:
        raise HTTPException(404, "Factura no encontrada.")
    comu = db.get(Comunidad, f.comunidad_id)
    if not comu:
        raise HTTPException(404, "Comunidad de la factura no encontrada.")

    s = get_settings()
    token = s.mp_access_token
    if not token:
        raise HTTPException(400, "Configura MP_ACCESS_TOKEN (token de la plataforma) en las variables del backend.")

    com = con_comision(f.monto)
    titulo = f"Plan {f.plan} · {f.periodo} · {comu.nombre}"
    preferencia: dict = {
        "items": [{"title": titulo, "quantity": 1, "unit_price": round(com["total"], 2)}],
        "external_reference": f"FACTURA|{f.id}",
        "metadata": {"factura_id": f.id, "comunidad_id": f.comunidad_id},
    }
    if s.base_url:
        preferencia["notification_url"] = f"{s.base_url.rstrip('/')}/api/mp/webhook"
    if s.frontend_url:
        fr = s.frontend_url.rstrip("/")
        preferencia["back_urls"] = {"success": fr, "failure": fr, "pending": fr}
        preferencia["auto_return"] = "approved"

    async with httpx.AsyncClient(timeout=15) as cli:
        r = await cli.post(f"{MP_API}/checkout/preferences", json=preferencia,
                           headers={"Authorization": f"Bearer {token}"})
    if r.status_code not in (200, 201):
        raise HTTPException(502, f"Mercado Pago no creó el cobro (HTTP {r.status_code}): {r.text[:300]}")
    pref = r.json()

    modo = "sandbox" if token.startswith("TEST") else "produccion"
    punto = pref.get("sandbox_init_point") if modo == "sandbox" else pref.get("init_point")
    return {
        "id": pref.get("id", ""),
        "puntoDePago": punto or pref.get("init_point", ""),
        "monto": f.monto,
        "total": com["total"],
        "comisionApp": com["comisionApp"],
        "comisionMP": com["comisionMP"],
        "comunidad": comu.nombre,
        "modo": modo,
        "creado": datetime.utcnow().isoformat(),
    }


# ── cuenta Mercado Pago de la PLATAFORMA (superadmin) ────────
def _config(db: Session) -> ConfigPlataforma:
    cfg = db.get(ConfigPlataforma, 1)
    if not cfg:
        cfg = ConfigPlataforma(id=1, conectada=False)
        db.add(cfg)
        db.flush()
    return cfg


class ConfigPlataformaIn(BaseModel):
    access_token: str
    public_key: str
    email: str


@router.post("/saas/mp-plataforma/configurar",
             dependencies=[Depends(require_roles("SUPERADMIN"))])
def configurar_plataforma(body: ConfigPlataformaIn, db: Session = Depends(get_db)):
    cfg = _config(db)
    cfg.access_token = body.access_token.strip()
    cfg.public_key = body.public_key.strip()
    cfg.email = body.email.strip()
    cfg.conectada = True
    cfg.fecha = datetime.utcnow()
    db.commit()
    return {"ok": True, "mensaje": "Credenciales de la plataforma guardadas."}


@router.post("/saas/mp-plataforma/probar",
             dependencies=[Depends(require_roles("SUPERADMIN"))])
async def probar_plataforma(db: Session = Depends(get_db)):
    cfg = _config(db)
    if not cfg.access_token:
        return {"ok": False, "mensaje": "Primero configura el Access Token de la plataforma."}
    try:
        async with httpx.AsyncClient(timeout=12) as cli:
            r = await cli.get(f"{MP_API}/users/me",
                              headers={"Authorization": f"Bearer {cfg.access_token}"})
        if r.status_code == 200:
            me = r.json()
            es_sandbox = (cfg.access_token or "").startswith("TEST")
            return {
                "ok": True,
                "cuenta": me.get("email") or cfg.email,
                "site_id": me.get("site_id", ""),
                "mensaje": ("Conexión correcta en sandbox." if es_sandbox
                            else "Conexión correcta. La plataforma puede cobrar suscripciones."),
            }
        return {"ok": False, "mensaje": f"Mercado Pago rechazó el Access Token (HTTP {r.status_code})."}
    except httpx.HTTPError:
        return {"ok": False, "mensaje": "No se pudo contactar a Mercado Pago."}


@router.post("/saas/mp-plataforma/desvincular",
             dependencies=[Depends(require_roles("SUPERADMIN"))])
def desvincular_plataforma(db: Session = Depends(get_db)):
    cfg = _config(db)
    cfg.access_token = None
    cfg.public_key = None
    cfg.email = None
    cfg.conectada = False
    cfg.fecha = None
    db.commit()
    return {"ok": True}


# ── suscripciones de pago automático (vecinos / preapproval) ──
class SuscripcionIn(BaseModel):
    unidad: str
    email: str
    monto: float


@router.post("/comunidades/{cid}/suscripciones",
             dependencies=[Depends(require_roles("ADMIN", "COMITE", "SUPERADMIN"))])
async def crear_suscripcion(cid: str, body: SuscripcionIn,
                            payload: dict = Depends(usuario_actual), db: Session = Depends(get_db)):
    """Crea una suscripción mensual (preapproval) para que un vecino pague el mes
    de forma automática con tarjeta de crédito."""
    _puede_gestionar(payload, cid) if payload.get("rol") in ("ADMIN", "COMITE") else None
    c = _comunidad(cid, db)
    if not c.mp_access_token:
        raise HTTPException(400, "Configura primero las credenciales de Mercado Pago de esta comunidad.")
    if body.monto <= 0:
        raise HTTPException(400, "El monto debe ser mayor a 0.")

    com_app = round(body.monto * 0.03)
    com_mp = round(body.monto * 0.02)
    total = round(body.monto + com_app + com_mp, 2)

    s = get_settings()
    pre: dict = {
        "reason": f"Pagos del mes · {body.unidad}",
        "auto_recurring": {
            "frequency": 1, "frequency_type": "months",
            "transaction_amount": total, "currency_id": "CLP",
            "payment_methods_allowed": {"payment_types": [{"id": "credit_card"}]},
        },
        "external_reference": f"{cid}|{body.unidad}",
        "payer_email": body.email,
    }
    if s.base_url:
        pre["back_url"] = f"{s.base_url.rstrip('/')}/api/mp/webhook"

    async with httpx.AsyncClient(timeout=15) as cli:
        r = await cli.post(f"{MP_API}/preapproval", json=pre,
                           headers={"Authorization": f"Bearer {c.mp_access_token}"})
    if r.status_code not in (200, 201):
        raise HTTPException(502, f"Mercado Pago no creó la suscripción (HTTP {r.status_code}): {r.text[:300]}")
    data = r.json()

    sub = Suscripcion(comunidad_id=cid, unidad=body.unidad, email=body.email,
                      monto=body.monto, frecuencia="MENSUAL", estado="PENDIENTE",
                      mp_id=data.get("id"), link_autorizacion=data.get("init_point"))
    db.add(sub)
    db.commit()
    return sz.suscripcion(sub)


@router.post("/comunidades/{cid}/suscripciones/{sid}/cancelar",
             dependencies=[Depends(require_roles("ADMIN", "COMITE", "SUPERADMIN"))])
def cancelar_suscripcion(cid: str, sid: str,
                         payload: dict = Depends(usuario_actual), db: Session = Depends(get_db)):
    _puede_gestionar(payload, cid) if payload.get("rol") in ("ADMIN", "COMITE") else None
    sub = db.query(Suscripcion).filter(Suscripcion.id == sid, Suscripcion.comunidad_id == cid).first()
    if not sub:
        raise HTTPException(404, "Suscripción no encontrada.")
    sub.estado = "CANCELADA"
    db.commit()
    return {"ok": True}


# ── suscribir una factura SaaS al pago automático (superadmin) ──
@router.post("/saas/facturas/{fid}/suscribir-mp",
             dependencies=[Depends(require_roles("SUPERADMIN"))])
async def suscribir_factura(fid: str, db: Session = Depends(get_db)):
    """Crea un preapproval para que una comunidad pague su factura mensual automáticamente."""
    cfg = _config(db)
    if not cfg.access_token:
        raise HTTPException(400, "Configura primero la cuenta Mercado Pago de la plataforma.")
    f = db.get(Factura, fid)
    if not f:
        raise HTTPException(404, "Factura no encontrada.")
    c = db.get(Comunidad, f.comunidad_id)

    com_app = round(f.monto * 0.03)
    com_mp = round(f.monto * 0.02)
    total = round(f.monto + com_app + com_mp, 2)

    s = get_settings()
    pre: dict = {
        "reason": f"Suscripción {f.plan} · {c.nombre if c else 'Comunidad'}",
        "auto_recurring": {
            "frequency": 1, "frequency_type": "months",
            "transaction_amount": total, "currency_id": "CLP",
            "payment_methods_allowed": {"payment_types": [{"id": "credit_card"}]},
        },
        "external_reference": f"saas|{f.comunidad_id}",
        "payer_email": cfg.email or "",
    }
    if s.base_url:
        pre["back_url"] = f"{s.base_url.rstrip('/')}/api/mp/webhook"

    async with httpx.AsyncClient(timeout=15) as cli:
        r = await cli.post(f"{MP_API}/preapproval", json=pre,
                           headers={"Authorization": f"Bearer {cfg.access_token}"})
    if r.status_code not in (200, 201):
        raise HTTPException(502, f"Mercado Pago no creó la suscripción (HTTP {r.status_code}): {r.text[:300]}")
    data = r.json()

    es_sandbox = (cfg.access_token or "").startswith("TEST")
    return {
        "id": data.get("id", ""),
        "puntoDePago": data.get("init_point", ""),
        "monto": f.monto,
        "comisionApp": com_app,
        "comisionMP": com_mp,
        "total": total,
        "creado": datetime.utcnow().isoformat(),
        "modo": "sandbox" if es_sandbox else "produccion",
    }


# ── webhook de pagos (público: lo llama Mercado Pago) ─────────
@router.post("/mp/webhook")
async def webhook(body: dict = Body(default={}), db: Session = Depends(get_db)):
    """Recibe notificaciones de pago y concilia automáticamente.

    Mercado Pago envía: {"action": "payment.updated", "data": {"id": "123"}, ...}
    """
    tipo = body.get("type") or body.get("action") or ""
    if tipo and "payment" not in str(tipo):
        return {"ok": True, "ignorado": tipo}

    payment_id = str((body.get("data") or {}).get("id") or body.get("id") or "")
    if not payment_id:
        return {"ok": True, "sin_pago": True}

    # Evita procesar dos veces el mismo pago
    if db.query(Pago).filter(Pago.referencia == f"MP-{payment_id}").first():
        return {"ok": True, "duplicado": True}

    # ¿Con qué token consultamos el pago? Prueba el de la plataforma y luego
    # los de cada comunidad conectada (pocas en esta etapa del producto).
    s = get_settings()
    candidatos = [t for t in [s.mp_access_token] if t]
    candidatos += [c.mp_access_token for c in db.query(Comunidad).filter(Comunidad.mp_conectada.is_(True)).all()
                   if c.mp_access_token]

    pago_mp = None
    for token in candidatos:
        try:
            async with httpx.AsyncClient(timeout=12) as cli:
                r = await cli.get(f"{MP_API}/v1/payments/{payment_id}",
                                  headers={"Authorization": f"Bearer {token}"})
            if r.status_code == 200:
                pago_mp = r.json()
                break
        except httpx.HTTPError:
            continue
    if not pago_mp:
        return {"ok": False, "mensaje": "No se pudo verificar el pago con ningún token."}

    if pago_mp.get("status") != "approved":
        return {"ok": True, "estado": pago_mp.get("status")}

    # external_reference = "comunidad_id|unidad"
    ref_ext = str(pago_mp.get("external_reference") or "")
    cid = ref_ext.split("|")[0] if ref_ext else (pago_mp.get("metadata") or {}).get("comunidad_id", "")
    unidad = ((pago_mp.get("metadata") or {}).get("unidad") or
              (ref_ext.split("|")[1] if "|" in ref_ext else "") or "general")
    if not cid or not db.get(Comunidad, cid):
        return {"ok": False, "mensaje": "external_reference sin comunidad válida."}

    monto = float(pago_mp.get("transaction_amount") or 0)
    db.add(Pago(comunidad_id=cid, unidad=unidad, monto=monto,
                metodo="Mercado Pago", referencia=f"MP-{payment_id}"))
    # Conciliación automática: marca pagado el cobro pendiente más reciente de la unidad
    pendiente = (db.query(Cobro)
                 .filter(Cobro.comunidad_id == cid, Cobro.unidad == unidad, Cobro.estado != "PAGADO")
                 .order_by(Cobro.creado.desc()).first())
    if pendiente:
        pendiente.estado = "PAGADO"
    db.add(Movimiento(comunidad_id=cid, fecha=datetime.utcnow().date(), tipo="INGRESO",
                      categoria="Pagos del mes",
                      descripcion=f"Pago en línea {unidad} (Mercado Pago {payment_id})",
                      monto=monto, conciliado=True))
    db.commit()
    return {"ok": True, "conciliado": pendiente.id if pendiente else None}
