"""Convierte objetos ORM en los JSON que espera el frontend (src/lib/store.ts)."""
import json
from datetime import date, datetime


def iso(v):
    if isinstance(v, (datetime, date)):
        return v.isoformat()
    return v


def usuario(u) -> dict:
    return {
        "id": u.id, "nombre": u.nombre, "email": u.email, "activo": u.activo,
        "creado": iso(u.creado), "rolGlobal": u.rol_global,
        "membresias": [
            {"comunidadId": m.comunidad_id, "rol": m.rol, "unidad": m.unidad}
            for m in u.membresias
        ],
    }


def comunidad(c) -> dict:
    return {
        "id": c.id, "nombre": c.nombre, "direccion": c.direccion, "ciudad": c.ciudad,
        "unidades": c.unidades, "plan": c.plan, "creada": iso(c.creada), "estado": c.estado,
        "vinculacion": {
            "conectada": bool(c.mp_conectada),
            **({
                "email": c.mp_email,
                "fecha": iso(c.mp_fecha),
                "modo": c.mp_modo or ("sandbox" if (c.mp_access_token or "").startswith("TEST") else "produccion"),
                # Visible solo para administradores autenticados de la comunidad:
                "accessToken": c.mp_access_token,
                "publicKey": c.mp_public_key,
            } if c.mp_conectada else {}),
        },
        "recursos": _recursos(c),
        "informe_auto": bool(getattr(c, "informe_auto", True)),
    }


def _recursos(c) -> dict:
    import json as _json
    try:
        r = _json.loads(getattr(c, "recursos", "") or "{}")
    except Exception:
        r = {}
    return {"reservas": r.get("reservas", True), "bitacora": r.get("bitacora", True)}


def cobro(x) -> dict:
    return {
        "id": x.id, "comunidadId": x.comunidad_id, "unidad": x.unidad, "periodo": x.periodo,
        "concepto": x.concepto, "monto": x.monto, "estado": x.estado,
        "vencimiento": iso(x.vencimiento) if x.vencimiento else None, "creado": iso(x.creado),
    }


def pago(x) -> dict:
    return {
        "id": x.id, "comunidadId": x.comunidad_id, "cobroId": x.cobro_id, "unidad": x.unidad,
        "monto": x.monto, "metodo": x.metodo, "referencia": x.referencia, "fecha": iso(x.fecha),
    }


def movimiento(x) -> dict:
    return {
        "id": x.id, "comunidadId": x.comunidad_id, "fecha": iso(x.fecha), "tipo": x.tipo,
        "categoria": x.categoria, "descripcion": x.descripcion, "monto": x.monto,
        "conciliado": x.conciliado,
    }


def aviso(x) -> dict:
    return {
        "id": x.id, "comunidadId": x.comunidad_id, "titulo": x.titulo, "cuerpo": x.cuerpo,
        "tipo": x.tipo, "autor": x.autor, "creado": iso(x.creado),
    }


def reserva(x) -> dict:
    return {
        "id": x.id, "comunidadId": x.comunidad_id, "area": x.area, "fecha": iso(x.fecha),
        "bloque": x.bloque, "unidad": x.unidad, "residente": x.residente,
    }


def votacion(x) -> dict:
    try:
        opciones = json.loads(x.opciones) if x.opciones else []
    except Exception:
        opciones = []
    return {
        "id": x.id, "comunidadId": x.comunidad_id, "titulo": x.titulo, "pregunta": x.pregunta,
        "opciones": opciones, "abierta": x.abierta, "creado": iso(x.creado),
        "votos": [{"unidad": v.unidad, "opcion": v.opcion} for v in x.votos],
    }


def acceso(x) -> dict:
    return {
        "id": x.id, "comunidadId": x.comunidad_id, "visitante": x.visitante, "tipo": x.tipo,
        "unidad": x.unidad, "entrada": iso(x.entrada), "salida": iso(x.salida) if x.salida else None,
    }


def factura(x) -> dict:
    return {
        "id": x.id, "comunidadId": x.comunidad_id, "periodo": x.periodo, "plan": x.plan,
        "monto": x.monto, "estado": x.estado, "fecha": iso(x.fecha),
    }


def plan(x) -> dict:
    return {
        "id": x.id, "nombre": x.nombre, "precio": x.precio,
        "activa": bool(x.activa), "creada": iso(x.creada),
    }


def suscripcion(x) -> dict:
    return {
        "id": x.id, "comunidadId": x.comunidad_id, "unidad": x.unidad, "email": x.email,
        "monto": x.monto, "frecuencia": x.frecuencia, "estado": x.estado,
        "mpId": x.mp_id, "linkAutorizacion": x.link_autorizacion, "creada": iso(x.creada),
    }


def _enmascarar(s):
    return (s[:7] + "••••" + s[-4:]) if s else None


def mp_plataforma(x) -> dict:
    if not x or not x.conectada:
        return {"conectada": False}
    return {
        "conectada": True, "email": x.email, "fecha": iso(x.fecha),
        "accessToken": _enmascarar(x.access_token), "publicKey": _enmascarar(x.public_key),
    }
