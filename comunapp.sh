#!/bin/bash
# ============================================================
#  COMUNAPP.SH — Todo el backend en un solo archivo
#  Versión para macOS / Linux (equivalente a comunapp.bat)
#
#  Crea la estructura, escribe el código Python (FastAPI +
#  SQLAlchemy + SQLite/PostgreSQL + JWT), instala dependencias,
#  siembra datos demo y lanza la API con uvicorn.
#
#  Uso:
#    chmod +x comunapp.sh
#    ./comunapp.sh
#
#  Requiere Python 3.10+  (en Mac: brew install python)
# ============================================================

cd "$(dirname "$0")" || exit 1

PY=""
detectar_python() {
  if command -v python3 >/dev/null 2>&1; then
    PY=python3
  elif command -v python >/dev/null 2>&1; then
    PY=python
  else
    PY=""
  fi
}

# ------------------------------------------------------------
#  Escribe todos los archivos del backend (heredocs)
# ------------------------------------------------------------
escribir_archivos() {
  mkdir -p backend/routers

  cat > backend/requirements.txt <<'REQEOF'
fastapi==0.115.6
uvicorn[standard]==0.34.0
sqlalchemy==2.0.36
pyjwt==2.10.1
python-multipart==0.0.19
REQEOF

  cat > backend/.env <<'ENVEOF'
SECRET_KEY=cambia-esta-clave-en-produccion
DATABASE_URL=sqlite:///comunapp.db
MERCADOPAGO_ACCESS_TOKEN=
MERCADOPAGO_WEBHOOK_SECRET=
ENVEOF

  cat > backend/database.py <<'PYEOF'
import os

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Carga .env sin dependencias extra
ENV = {}
_env_path = os.path.join(BASE_DIR, ".env")
if os.path.exists(_env_path):
    with open(_env_path, encoding="utf-8") as f:
        for linea in f:
            linea = linea.strip()
            if linea and not linea.startswith("#") and "=" in linea:
                clave, valor = linea.split("=", 1)
                ENV[clave.strip()] = valor.strip()

DATABASE_URL = ENV.get("DATABASE_URL", "sqlite:///comunapp.db")
SECRET_KEY = ENV.get("SECRET_KEY", "comunidad-secreta-cambiar")

_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(DATABASE_URL, connect_args=_args)
SessionLocal = sessionmaker(bind=engine)
Base = declarative_base()
PYEOF

  cat > backend/models.py <<'PYEOF'
import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean, Column, Date, DateTime, ForeignKey, Numeric, String, Text, UniqueConstraint,
)
from sqlalchemy.orm import relationship

from database import Base


def uid():
    return uuid.uuid4().hex[:20]


class Parcela(Base):
    __tablename__ = "parcelas"
    id = Column(String(32), primary_key=True, default=uid)
    nombre = Column(String(160), nullable=False)
    direccion = Column(String(200), default="")
    ciudad = Column(String(120), default="")
    unidades = Column(Numeric(6, 0), default=0)
    activo = Column(Boolean, default=True)


class Usuario(Base):
    __tablename__ = "usuarios"
    id = Column(String(32), primary_key=True, default=uid)
    email = Column(String(160), unique=True, nullable=False)
    nombre = Column(String(160), nullable=False)
    password_hash = Column(String(200), nullable=False)
    rol_global = Column(String(20), default="")
    activo = Column(Boolean, default=True)
    membresias = relationship("MiembroParcela", back_populates="usuario", cascade="all, delete-orphan")


class MiembroParcela(Base):
    __tablename__ = "miembros_parcela"
    __table_args__ = (UniqueConstraint("usuario_id", "parcela_id", name="uq_miembro_parcela"),)
    id = Column(String(32), primary_key=True, default=uid)
    usuario_id = Column(String(32), ForeignKey("usuarios.id", ondelete="CASCADE"), nullable=False)
    parcela_id = Column(String(32), ForeignKey("parcelas.id", ondelete="CASCADE"), nullable=False)
    rol = Column(String(20), nullable=False)  # ADMIN | COMITE | PROPIETARIO | ARRENDATARIO
    unidad = Column(String(20), default="")
    usuario = relationship("Usuario", back_populates="membresias")


class Cobro(Base):
    __tablename__ = "cobros"
    __table_args__ = (UniqueConstraint("parcela_id", "unidad", "periodo", "concepto", name="uq_cobro"),)
    id = Column(String(32), primary_key=True, default=uid)
    parcela_id = Column(String(32), ForeignKey("parcelas.id"), nullable=False, index=True)
    unidad = Column(String(20), nullable=False)
    periodo = Column(String(7), nullable=False)  # AAAA-MM
    concepto = Column(String(80), default="Gastos comunes")
    monto = Column(Numeric(12, 2), nullable=False)
    estado = Column(String(20), default="PENDIENTE")
    vencimiento = Column(Date, nullable=True)
    creado = Column(DateTime, default=datetime.utcnow)


class Pago(Base):
    __tablename__ = "pagos"
    id = Column(String(32), primary_key=True, default=uid)
    parcela_id = Column(String(32), ForeignKey("parcelas.id"), nullable=False, index=True)
    cobro_id = Column(String(32), ForeignKey("cobros.id"), nullable=False)
    unidad = Column(String(20), nullable=False)
    monto = Column(Numeric(12, 2), nullable=False)
    metodo = Column(String(40), default="mercadopago")
    referencia = Column(String(80), default="")
    fecha = Column(DateTime, default=datetime.utcnow)


class Movimiento(Base):
    __tablename__ = "movimientos"
    id = Column(String(32), primary_key=True, default=uid)
    parcela_id = Column(String(32), ForeignKey("parcelas.id"), nullable=False, index=True)
    fecha = Column(Date, nullable=False)
    tipo = Column(String(10), nullable=False)  # INGRESO | EGRESO
    categoria = Column(String(80), default="")
    descripcion = Column(String(200), default="")
    monto = Column(Numeric(12, 2), nullable=False)
    conciliado = Column(Boolean, default=False)


class Aviso(Base):
    __tablename__ = "avisos"
    id = Column(String(32), primary_key=True, default=uid)
    parcela_id = Column(String(32), ForeignKey("parcelas.id"), nullable=False, index=True)
    titulo = Column(String(160), nullable=False)
    cuerpo = Column(Text, default="")
    tipo = Column(String(20), default="INFORMATIVO")
    autor = Column(String(120), default="")
    creado = Column(DateTime, default=datetime.utcnow)


class Reserva(Base):
    __tablename__ = "reservas"
    __table_args__ = (UniqueConstraint("parcela_id", "area", "fecha", "bloque", name="uq_reserva"),)
    id = Column(String(32), primary_key=True, default=uid)
    parcela_id = Column(String(32), ForeignKey("parcelas.id"), nullable=False, index=True)
    area = Column(String(80), nullable=False)
    fecha = Column(Date, nullable=False)
    bloque = Column(String(20), nullable=False)
    unidad = Column(String(20), default="")
    residente = Column(String(120), default="")


class Votacion(Base):
    __tablename__ = "votaciones"
    id = Column(String(32), primary_key=True, default=uid)
    parcela_id = Column(String(32), ForeignKey("parcelas.id"), nullable=False, index=True)
    titulo = Column(String(160), nullable=False)
    pregunta = Column(Text, default="")
    opciones = Column(Text, default="")  # "Si|No|Abstencion"
    abierta = Column(Boolean, default=True)
    creado = Column(DateTime, default=datetime.utcnow)


class Voto(Base):
    __tablename__ = "votos"
    __table_args__ = (UniqueConstraint("votacion_id", "unidad", name="uq_voto"),)
    id = Column(String(32), primary_key=True, default=uid)
    votacion_id = Column(String(32), ForeignKey("votaciones.id", ondelete="CASCADE"), nullable=False)
    unidad = Column(String(20), nullable=False)
    opcion = Column(String(120), nullable=False)
    fecha = Column(DateTime, default=datetime.utcnow)


class RegistroAcceso(Base):
    __tablename__ = "registros_acceso"
    id = Column(String(32), primary_key=True, default=uid)
    parcela_id = Column(String(32), ForeignKey("parcelas.id"), nullable=False, index=True)
    visitante = Column(String(120), nullable=False)
    documento = Column(String(40), default="")
    destino = Column(String(80), default="")
    tipo = Column(String(20), default="VISITA")
    entrada = Column(DateTime, default=datetime.utcnow)
    salida = Column(DateTime, nullable=True)
PYEOF

  cat > backend/auth.py <<'PYEOF'
import hashlib
import hmac
import secrets
from datetime import datetime, timedelta, timezone

import jwt
from fastapi import Depends, Header, HTTPException

from database import ENV, SECRET_KEY


def hash_password(pw, salt=""):
    salt = salt or secrets.token_hex(8)
    h = hashlib.pbkdf2_hmac("sha256", pw.encode(), salt.encode(), 120_000).hex()
    return salt + "$" + h


def verificar_password(pw, almacenado):
    salt = almacenado.split("$", 1)[0]
    return hmac.compare_digest(hash_password(pw, salt), almacenado)


def crear_token(usuario_id, rol, parcela_id="", unidad=""):
    expira = datetime.now(timezone.utc) + timedelta(hours=12)
    payload = {"sub": usuario_id, "rol": rol, "parcela_id": parcela_id, "unidad": unidad, "exp": expira}
    return jwt.encode(payload, SECRET_KEY, algorithm="HS256")


def obtener_sesion(authorization: str = Header(default="")):
    if not authorization.startswith("Bearer "):
        raise HTTPException(401, "Token ausente. Envia: Authorization: Bearer <token>")
    try:
        return jwt.decode(authorization[7:], SECRET_KEY, algorithms=["HS256"])
    except jwt.PyJWTError:
        raise HTTPException(401, "Token invalido o expirado")


def require_roles(*roles):
    """Dependencia FastAPI: valida que el rol del token este permitido."""
    def dependencia(sesion: dict = Depends(obtener_sesion)):
        if sesion.get("rol") not in roles:
            raise HTTPException(403, "Tu rol " + str(sesion.get("rol")) + " no tiene acceso. Se requiere: " + ", ".join(roles))
        return sesion
    return dependencia


def verificar_webhook_mp(cuerpo, firma):
    """Verifica la firma HMAC-SHA256 del webhook de Mercado Pago."""
    secreto = ENV.get("MERCADOPAGO_WEBHOOK_SECRET", "")
    if not secreto:
        return True  # modo demo sin secreto configurado
    esperada = hmac.new(secreto.encode(), cuerpo, hashlib.sha256).hexdigest()
    return hmac.compare_digest(esperada, firma or "")
PYEOF

  cat > backend/main.py <<'PYEOF'
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

import models  # noqa: F401  (registra las tablas)
from database import Base, engine
from routers import auth_routes, comunidad, finanzas

Base.metadata.create_all(bind=engine)

app = FastAPI(title="ComunApp API", version="1.0.0",
              description="Administracion de condominios y edificios - multi-tenant")

app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])
app.include_router(auth_routes.router, prefix="/api")
app.include_router(finanzas.router, prefix="/api")
app.include_router(comunidad.router, prefix="/api")


@app.get("/")
def raiz():
    return {"app": "ComunApp API", "docs": "/docs", "estado": "en linea"}
PYEOF

  : > backend/routers/__init__.py

  cat > backend/routers/auth_routes.py <<'PYEOF'
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from auth import crear_token, hash_password, require_roles, verificar_password
from database import SessionLocal
from models import MiembroParcela, Parcela, Usuario

router = APIRouter()


def db():
    s = SessionLocal()
    try:
        yield s
    finally:
        s.close()


class LoginIn(BaseModel):
    email: str
    password: str


class MembresiaIn(BaseModel):
    parcela_id: str
    rol: str
    unidad: str = ""


class UsuarioIn(BaseModel):
    nombre: str
    email: str
    password: str = ""
    rol_global: str = ""
    membresias: list[MembresiaIn] = []


class ParcelaIn(BaseModel):
    nombre: str
    direccion: str = ""
    ciudad: str = ""
    unidades: int = 0


@router.post("/auth/login")
def login(datos: LoginIn, s: Session = Depends(db)):
    u = s.query(Usuario).filter(Usuario.email == datos.email.strip().lower()).first()
    if not u or not u.activo or not verificar_password(datos.password, u.password_hash):
        raise HTTPException(401, "Credenciales invalidas")
    if u.rol_global == "SUPERADMIN":
        return {"token": crear_token(u.id, "SUPERADMIN"), "rol": "SUPERADMIN",
                "usuario": {"id": u.id, "nombre": u.nombre, "email": u.email}}
    m = u.membresias[0] if u.membresias else None
    if not m:
        raise HTTPException(403, "Usuario sin condominio asignado")
    return {"token": crear_token(u.id, m.rol, m.parcela_id, m.unidad), "rol": m.rol,
            "parcela_id": m.parcela_id,
            "usuario": {"id": u.id, "nombre": u.nombre, "email": u.email, "unidad": m.unidad}}


@router.get("/usuarios")
def listar_usuarios(sesion: dict = Depends(require_roles("SUPERADMIN")), s: Session = Depends(db)):
    return [
        {
            "id": u.id, "nombre": u.nombre, "email": u.email, "activo": u.activo,
            "rol_global": u.rol_global,
            "membresias": [{"parcela_id": m.parcela_id, "rol": m.rol, "unidad": m.unidad} for m in u.membresias],
        }
        for u in s.query(Usuario).all()
    ]


@router.post("/usuarios")
def crear_usuario(datos: UsuarioIn, sesion: dict = Depends(require_roles("SUPERADMIN")), s: Session = Depends(db)):
    if s.query(Usuario).filter(Usuario.email == datos.email.lower()).first():
        raise HTTPException(409, "Ya existe un usuario con ese correo")
    u = Usuario(nombre=datos.nombre, email=datos.email.lower(),
                password_hash=hash_password(datos.password or "comunapp123"),
                rol_global=datos.rol_global)
    s.add(u)
    s.flush()
    for m in datos.membresias:
        s.add(MiembroParcela(usuario_id=u.id, parcela_id=m.parcela_id, rol=m.rol, unidad=m.unidad))
    s.commit()
    return {"id": u.id, "nombre": u.nombre}


@router.get("/parcelas")
def listar_parcelas(sesion: dict = Depends(require_roles("SUPERADMIN")), s: Session = Depends(db)):
    return [{"id": p.id, "nombre": p.nombre, "direccion": p.direccion,
             "ciudad": p.ciudad, "unidades": p.unidades, "activo": p.activo}
            for p in s.query(Parcela).all()]


@router.post("/parcelas")
def crear_parcela(datos: ParcelaIn, sesion: dict = Depends(require_roles("SUPERADMIN")), s: Session = Depends(db)):
    p = Parcela(nombre=datos.nombre, direccion=datos.direccion, ciudad=datos.ciudad, unidades=datos.unidades)
    s.add(p)
    s.commit()
    return {"id": p.id, "nombre": p.nombre}
PYEOF

  cat > backend/routers/finanzas.py <<'PYEOF'
from datetime import datetime

from fastapi import APIRouter, Depends, Header, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session

from auth import require_roles, verificar_webhook_mp
from database import SessionLocal
from models import Cobro, MiembroParcela, Movimiento, Pago

router = APIRouter()


def db():
    s = SessionLocal()
    try:
        yield s
    finally:
        s.close()


def mi_parcela(sesion):
    if not sesion.get("parcela_id"):
        raise HTTPException(400, "Token sin condominio asociado")
    return sesion["parcela_id"]


class GenerarMesIn(BaseModel):
    periodo: str
    monto: float
    concepto: str = "Gastos comunes"
    unidades: list[str] = []


class MultaIn(BaseModel):
    unidad: str
    monto: float
    motivo: str


class PreferenciaIn(BaseModel):
    cobro_id: str
    monto: float


@router.get("/cobros")
def listar_cobros(periodo: str = "",
                  sesion: dict = Depends(require_roles("ADMIN", "COMITE")),
                  s: Session = Depends(db)):
    q = s.query(Cobro).filter(Cobro.parcela_id == mi_parcela(sesion))
    if periodo:
        q = q.filter(Cobro.periodo == periodo)
    return [{"id": c.id, "unidad": c.unidad, "periodo": c.periodo, "concepto": c.concepto,
             "monto": float(c.monto), "estado": c.estado}
            for c in q.order_by(Cobro.unidad).all()]


@router.post("/cobros/generar-mes")
def generar_mes(datos: GenerarMesIn,
                sesion: dict = Depends(require_roles("ADMIN", "COMITE")),
                s: Session = Depends(db)):
    parcela_id = mi_parcela(sesion)
    unidades = datos.unidades or [m.unidad for m in s.query(MiembroParcela)
                                  .filter(MiembroParcela.parcela_id == parcela_id,
                                          MiembroParcela.unidad != "")]
    creados = 0
    for unidad in dict.fromkeys(unidades):
        existe = s.query(Cobro).filter(Cobro.parcela_id == parcela_id, Cobro.unidad == unidad,
                                       Cobro.periodo == datos.periodo,
                                       Cobro.concepto == datos.concepto).first()
        if not existe:
            s.add(Cobro(parcela_id=parcela_id, unidad=unidad, periodo=datos.periodo,
                        concepto=datos.concepto, monto=datos.monto))
            creados += 1
    s.commit()
    return {"creados": creados, "periodo": datos.periodo}


@router.post("/multas")
def aplicar_multa(datos: MultaIn,
                  sesion: dict = Depends(require_roles("ADMIN", "COMITE")),
                  s: Session = Depends(db)):
    c = Cobro(parcela_id=mi_parcela(sesion), unidad=datos.unidad,
              periodo=datetime.utcnow().strftime("%Y-%m"),
              concepto="Multa: " + datos.motivo, monto=datos.monto)
    s.add(c)
    s.commit()
    return {"id": c.id}


@router.get("/cuenta/{unidad}")
def estado_cuenta(unidad: str,
                  sesion: dict = Depends(require_roles("ADMIN", "COMITE", "PROPIETARIO", "ARRENDATARIO")),
                  s: Session = Depends(db)):
    if sesion["rol"] in ("PROPIETARIO", "ARRENDATARIO") and sesion.get("unidad") != unidad:
        raise HTTPException(403, "Solo puedes ver tu propia unidad")
    cobros = s.query(Cobro).filter(Cobro.parcela_id == mi_parcela(sesion), Cobro.unidad == unidad).all()
    pagos = s.query(Pago).filter(Pago.parcela_id == mi_parcela(sesion), Pago.unidad == unidad).all()
    return {
        "unidad": unidad,
        "cobros": [{"id": c.id, "periodo": c.periodo, "concepto": c.concepto,
                    "monto": float(c.monto), "estado": c.estado} for c in cobros],
        "pagos": [{"id": p.id, "monto": float(p.monto), "metodo": p.metodo,
                   "referencia": p.referencia} for p in pagos],
        "saldo": float(sum(c.monto for c in cobros if c.estado == "PENDIENTE")),
    }


@router.post("/pagos/preferencia")
def crear_preferencia(datos: PreferenciaIn,
                      sesion: dict = Depends(require_roles("PROPIETARIO", "ARRENDATARIO", "ADMIN")),
                      s: Session = Depends(db)):
    # En produccion: SDK de Mercado Pago -> preference con back_urls
    return {"id": "PREF-" + datos.cobro_id[:8], "monto": datos.monto, "pasarela": "mercadopago"}


@router.post("/webhooks/mercadopago")
async def webhook_mercadopago(request: Request,
                              x_signature: str = Header(default=""),
                              s: Session = Depends(db)):
    cuerpo = await request.body()
    if not verificar_webhook_mp(cuerpo, x_signature):
        raise HTTPException(401, "Firma invalida")
    try:
        evento = await request.json()
    except Exception:
        evento = {}
    if evento.get("type") == "payment" and evento.get("data", {}).get("id"):
        # Aqui: buscar pago por external_reference, registrar Pago
        # y marcar el Cobro como PAGADO dentro de la parcela correcta.
        pass
    return {"ok": True}


@router.get("/reporte")
def reporte(periodo: str = "",
            sesion: dict = Depends(require_roles("ADMIN", "COMITE")),
            s: Session = Depends(db)):
    parcela_id = mi_parcela(sesion)
    q = s.query(Cobro).filter(Cobro.parcela_id == parcela_id)
    if periodo:
        q = q.filter(Cobro.periodo == periodo)
    cobros = q.all()
    total = float(sum(c.monto for c in cobros))
    pagado = float(sum(c.monto for c in cobros if c.estado == "PAGADO"))
    pct = round(pagado / total * 100, 1) if total else 0.0
    return {"periodo": periodo or "todos", "total_cobrado": total,
            "total_pagado": pagado, "recaudacion_pct": pct}


@router.get("/movimientos")
def listar_movimientos(sesion: dict = Depends(require_roles("ADMIN", "COMITE")),
                       s: Session = Depends(db)):
    return [{"id": m.id, "fecha": str(m.fecha), "tipo": m.tipo, "categoria": m.categoria,
             "descripcion": m.descripcion, "monto": float(m.monto), "conciliado": m.conciliado}
            for m in s.query(Movimiento).filter(Movimiento.parcela_id == mi_parcela(sesion)).all()]
PYEOF

  cat > backend/routers/comunidad.py <<'PYEOF'
from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from auth import require_roles
from database import SessionLocal
from models import Aviso, RegistroAcceso, Reserva, Votacion, Voto

router = APIRouter()


def db():
    s = SessionLocal()
    try:
        yield s
    finally:
        s.close()


def mi_parcela(sesion):
    if not sesion.get("parcela_id"):
        raise HTTPException(400, "Token sin condominio asociado")
    return sesion["parcela_id"]


class AvisoIn(BaseModel):
    titulo: str
    cuerpo: str = ""
    tipo: str = "INFORMATIVO"


class ReservaIn(BaseModel):
    area: str
    fecha: str
    bloque: str


class VotacionIn(BaseModel):
    titulo: str
    pregunta: str = ""
    opciones: str = "Si|No|Abstencion"


class VotoIn(BaseModel):
    opcion: str


class BitacoraIn(BaseModel):
    visitante: str
    documento: str = ""
    destino: str = ""
    tipo: str = "VISITA"


@router.get("/avisos")
def listar_avisos(sesion: dict = Depends(require_roles("ADMIN", "COMITE", "PROPIETARIO", "ARRENDATARIO")),
                  s: Session = Depends(db)):
    return [{"id": a.id, "titulo": a.titulo, "cuerpo": a.cuerpo, "tipo": a.tipo, "autor": a.autor}
            for a in s.query(Aviso).filter(Aviso.parcela_id == mi_parcela(sesion))
            .order_by(Aviso.creado.desc()).all()]


@router.post("/avisos")
def crear_aviso(datos: AvisoIn,
                sesion: dict = Depends(require_roles("ADMIN", "COMITE")),
                s: Session = Depends(db)):
    a = Aviso(parcela_id=mi_parcela(sesion), titulo=datos.titulo, cuerpo=datos.cuerpo,
              tipo=datos.tipo, autor=sesion.get("sub", ""))
    s.add(a)
    s.commit()
    return {"id": a.id}


@router.get("/reservas")
def listar_reservas(sesion: dict = Depends(require_roles("ADMIN", "COMITE", "PROPIETARIO", "ARRENDATARIO")),
                    s: Session = Depends(db)):
    return [{"id": r.id, "area": r.area, "fecha": str(r.fecha), "bloque": r.bloque,
             "unidad": r.unidad, "residente": r.residente}
            for r in s.query(Reserva).filter(Reserva.parcela_id == mi_parcela(sesion)).all()]


@router.post("/reservas")
def crear_reserva(datos: ReservaIn,
                  sesion: dict = Depends(require_roles("PROPIETARIO", "ARRENDATARIO", "ADMIN")),
                  s: Session = Depends(db)):
    try:
        fecha = date.fromisoformat(datos.fecha)
    except ValueError:
        raise HTTPException(422, "Fecha invalida. Usa formato AAAA-MM-DD")
    existe = s.query(Reserva).filter(Reserva.parcela_id == mi_parcela(sesion),
                                     Reserva.area == datos.area, Reserva.fecha == fecha,
                                     Reserva.bloque == datos.bloque).first()
    if existe:
        raise HTTPException(409, "Ese bloque ya esta reservado")
    r = Reserva(parcela_id=mi_parcela(sesion), area=datos.area, fecha=fecha,
                bloque=datos.bloque, unidad=sesion.get("unidad", ""), residente=sesion.get("sub", ""))
    s.add(r)
    s.commit()
    return {"id": r.id}


@router.get("/votaciones")
def listar_votaciones(sesion: dict = Depends(require_roles("ADMIN", "COMITE", "PROPIETARIO")),
                      s: Session = Depends(db)):
    out = []
    for v in s.query(Votacion).filter(Votacion.parcela_id == mi_parcela(sesion)).all():
        votos = s.query(Voto).filter(Voto.votacion_id == v.id).all()
        out.append({"id": v.id, "titulo": v.titulo, "pregunta": v.pregunta,
                    "opciones": v.opciones.split("|"), "abierta": v.abierta, "votos": len(votos)})
    return out


@router.post("/votaciones")
def crear_votacion(datos: VotacionIn,
                   sesion: dict = Depends(require_roles("ADMIN", "COMITE")),
                   s: Session = Depends(db)):
    v = Votacion(parcela_id=mi_parcela(sesion), titulo=datos.titulo,
                 pregunta=datos.pregunta, opciones=datos.opciones)
    s.add(v)
    s.commit()
    return {"id": v.id}


@router.post("/votaciones/{votacion_id}/votar")
def votar(votacion_id: str, datos: VotoIn,
          sesion: dict = Depends(require_roles("PROPIETARIO")),
          s: Session = Depends(db)):
    v = s.query(Votacion).filter(Votacion.id == votacion_id,
                                 Votacion.parcela_id == mi_parcela(sesion)).first()
    if not v or not v.abierta:
        raise HTTPException(404, "Votacion no disponible")
    unidad = sesion.get("unidad", "")
    if s.query(Voto).filter(Voto.votacion_id == votacion_id, Voto.unidad == unidad).first():
        raise HTTPException(409, "Esta unidad ya voto")
    if datos.opcion not in v.opciones.split("|"):
        raise HTTPException(422, "Opcion invalida")
    s.add(Voto(votacion_id=votacion_id, unidad=unidad, opcion=datos.opcion))
    s.commit()
    return {"ok": True}


@router.get("/bitacora")
def listar_bitacora(sesion: dict = Depends(require_roles("ADMIN", "COMITE", "PROPIETARIO", "ARRENDATARIO")),
                    s: Session = Depends(db)):
    return [{"id": r.id, "visitante": r.visitante, "documento": r.documento, "destino": r.destino,
             "tipo": r.tipo, "entrada": str(r.entrada),
             "salida": str(r.salida) if r.salida else None}
            for r in s.query(RegistroAcceso).filter(RegistroAcceso.parcela_id == mi_parcela(sesion))
            .order_by(RegistroAcceso.entrada.desc()).all()]


@router.post("/bitacora")
def registrar_visita(datos: BitacoraIn,
                     sesion: dict = Depends(require_roles("ADMIN", "COMITE")),
                     s: Session = Depends(db)):
    r = RegistroAcceso(parcela_id=mi_parcela(sesion), visitante=datos.visitante,
                       documento=datos.documento, destino=datos.destino, tipo=datos.tipo)
    s.add(r)
    s.commit()
    return {"id": r.id}
PYEOF

  cat > backend/seed.py <<'PYEOF'
from datetime import datetime

import models  # noqa: F401
from auth import hash_password
from database import Base, SessionLocal, engine
from models import Aviso, Cobro, MiembroParcela, Parcela, Usuario, Votacion

Base.metadata.create_all(bind=engine)
s = SessionLocal()

parcela = s.query(Parcela).filter(Parcela.nombre == "Torres del Parque").first()
if not parcela:
    parcela = Parcela(nombre="Torres del Parque", direccion="Av. Los Aromos 1250",
                      ciudad="Santiago", unidades=24)
    s.add(parcela)
    s.commit()
    s.refresh(parcela)


def asegurar(email, nombre, password, rol_global="", rol_parcela="", unidad=""):
    u = s.query(Usuario).filter(Usuario.email == email).first()
    if u:
        return u
    u = Usuario(email=email, nombre=nombre, password_hash=hash_password(password), rol_global=rol_global)
    s.add(u)
    s.commit()
    s.refresh(u)
    if rol_parcela:
        s.add(MiembroParcela(usuario_id=u.id, parcela_id=parcela.id, rol=rol_parcela, unidad=unidad))
        s.commit()
    return u


asegurar("plataforma@comunapp.cl", "Valeria Soto", "admin123", rol_global="SUPERADMIN")
asegurar("admin@torresdelparque.cl", "Rodrigo Fuentes", "admin123", rol_parcela="ADMIN")
asegurar("comite@torresdelparque.cl", "Carla Mendez", "comite123", rol_parcela="COMITE")
asegurar("maria@demo.cl", "Maria Lopez", "demo123", rol_parcela="PROPIETARIO", unidad="A-42")
asegurar("jorge@demo.cl", "Jorge Salas", "demo123", rol_parcela="ARRENDATARIO", unidad="B-12")

periodo = datetime.utcnow().strftime("%Y-%m")
for unidad, monto in [("A-42", 85000), ("B-12", 78000)]:
    existe = s.query(Cobro).filter(Cobro.parcela_id == parcela.id,
                                   Cobro.unidad == unidad, Cobro.periodo == periodo).first()
    if not existe:
        s.add(Cobro(parcela_id=parcela.id, unidad=unidad, periodo=periodo, monto=monto))

if not s.query(Aviso).filter(Aviso.parcela_id == parcela.id).first():
    s.add(Aviso(parcela_id=parcela.id, titulo="Bienvenido a ComunApp",
                cuerpo="Este es el muro digital de tu comunidad.",
                tipo="INFORMATIVO", autor="Administracion"))

if not s.query(Votacion).filter(Votacion.parcela_id == parcela.id).first():
    s.add(Votacion(parcela_id=parcela.id, titulo="Pintura de fachada",
                   pregunta="Se aprueba el presupuesto de pintura?",
                   opciones="Si|No|Abstencion"))

s.commit()
s.close()
print("Datos demo sembrados correctamente.")
print("Credenciales: admin@torresdelparque.cl / admin123")
PYEOF

  cat > backend/README.md <<'MDEOF'
# ComunApp API

Backend en Python: FastAPI + SQLAlchemy + SQLite (por defecto) o PostgreSQL.

## Ejecutar (macOS / Linux)

    cd backend
    source .venv/bin/activate
    python -m uvicorn main:app --port 8000

Documentación interactiva: http://127.0.0.1:8000/docs

## Base de datos

Por defecto usa SQLite (comunapp.db), sin instalar nada.
Para PostgreSQL cambia DATABASE_URL en backend/.env

## Credenciales demo (tras ejecutar seed.py)

- plataforma@comunapp.cl / admin123  (SUPERADMIN)
- admin@torresdelparque.cl / admin123  (ADMIN)
- comite@torresdelparque.cl / comite123  (COMITE)
- maria@demo.cl / demo123  (PROPIETARIO)
- jorge@demo.cl / demo123  (ARRENDATARIO)
MDEOF
}

# ------------------------------------------------------------
#  Acciones del menú
# ------------------------------------------------------------
instalar() {
  clear
  echo
  echo "  === Instalación de ComunApp (backend Python) ==="
  echo
  detectar_python
  if [ -z "$PY" ]; then
    echo "  No se encontró Python."
    echo "  En Mac instálalo con:   brew install python"
    echo "  O descárgalo de:        https://www.python.org/downloads/"
    echo
    read -rsp "  Presiona Enter para volver al menú..." _
    return
  fi
  echo "  [1/5] Python detectado: $($PY --version 2>&1)"
  echo "  [2/5] Escribiendo archivos del proyecto..."
  escribir_archivos
  echo "        archivos creados en ./backend"
  echo "  [3/5] Creando entorno virtual (.venv)..."
  "$PY" -m venv backend/.venv
  # shellcheck disable=SC1091
  source backend/.venv/bin/activate
  echo "  [4/5] Instalando dependencias (puede tardar unos minutos)..."
  python -m pip install --upgrade pip --quiet
  pip install -r backend/requirements.txt
  deactivate 2>/dev/null || true
  echo "  [5/5] Listo."
  echo
  echo "  Instalación completa. Siguientes pasos sugeridos:"
  echo "    - Opción [3] para sembrar los datos demo"
  echo "    - Opción [2] para iniciar la API"
  echo
  read -rsp "  Presiona Enter para volver al menú..." _
}

iniciar() {
  if [ ! -f backend/.venv/bin/activate ]; then
    echo
    echo "  No existe el entorno virtual. Ejecuta primero la opción [1]."
    read -rsp "  Presiona Enter..." _
    return
  fi
  # shellcheck disable=SC1091
  source backend/.venv/bin/activate
  cd backend || return
  clear
  echo
  echo "  ======================================================================"
  echo "       ComunApp API en línea"
  echo "       Base ....... http://127.0.0.1:8000"
  echo "       Swagger ..... http://127.0.0.1:8000/docs"
  echo "       Detener ..... Ctrl + C"
  echo "  ======================================================================"
  echo
  python -m uvicorn main:app --host 127.0.0.1 --port 8000
  cd ..
  deactivate 2>/dev/null || true
}

sembrar() {
  if [ ! -f backend/.venv/bin/activate ]; then
    echo
    echo "  No existe el entorno virtual. Ejecuta primero la opción [1]."
    read -rsp "  Presiona Enter..." _
    return
  fi
  # shellcheck disable=SC1091
  source backend/.venv/bin/activate
  cd backend || return
  echo
  python seed.py
  echo
  cd ..
  deactivate 2>/dev/null || true
  read -rsp "  Presiona Enter para volver al menú..." _
}

docs() {
  URL="http://127.0.0.1:8000/docs"
  if command -v open >/dev/null 2>&1; then
    open "$URL"
  elif command -v xdg-open >/dev/null 2>&1; then
    xdg-open "$URL"
  else
    echo "  Abre en tu navegador: $URL"
  fi
}

estado() {
  clear
  echo
  echo "  === Estado del proyecto ==="
  echo
  [ -d backend ] && echo "  [OK] Carpeta backend" || echo "  [--] Carpeta backend no existe — ejecuta la opción 1"
  [ -d backend/.venv ] && echo "  [OK] Entorno virtual .venv" || echo "  [--] Entorno virtual ausente — ejecuta la opción 1"
  [ -f backend/comunapp.db ] && echo "  [OK] Base de datos SQLite (comunapp.db)" || echo "  [--] Base de datos sin crear — se crea al iniciar la API"
  [ -f package.json ] && echo "  [OK] Frontend detectado en esta carpeta" || echo "  [--] Sin frontend en esta carpeta"
  echo
  detectar_python
  [ -n "$PY" ] && $PY --version
  echo
  read -rsp "  Presiona Enter para volver al menú..." _
}

frontend() {
  if [ ! -f package.json ]; then
    echo
    echo "  No hay package.json en esta carpeta. Copia aquí el frontend primero."
    read -rsp "  Presiona Enter..." _
    return
  fi
  if ! command -v npm >/dev/null 2>&1; then
    echo
    echo "  npm no encontrado. Instala Node.js desde https://nodejs.org"
    echo "  o en Mac:  brew install node"
    read -rsp "  Presiona Enter..." _
    return
  fi
  echo
  echo "  Instalando dependencias del frontend..."
  npm install
  echo
  echo "  Listo. Ejecuta \"npm run dev\" y abre http://localhost:5173"
  read -rsp "  Presiona Enter..." _
}

# ------------------------------------------------------------
#  Menú principal
# ------------------------------------------------------------
while true; do
  clear
  echo
  echo "  ======================================================================"
  echo
  echo "       C O M U N A P P  —  Instalador y lanzador (macOS / Linux)"
  echo "       Administración de condominios y edificios — API Python/FastAPI"
  echo
  echo "  ======================================================================"
  echo
  echo "       [1]  Instalar backend completo (primera vez)"
  echo "       [2]  Iniciar API  (uvicorn en http://127.0.0.1:8000)"
  echo "       [3]  Sembrar datos de demostración"
  echo "       [4]  Abrir documentación Swagger"
  echo "       [5]  Ver estado del proyecto"
  echo "       [6]  Preparar frontend  (npm install, si existe en esta carpeta)"
  echo "       [0]  Salir"
  echo
  printf "  Elige una opción y presiona Enter: "
  read -r op
  case "$op" in
    1) instalar ;;
    2) iniciar ;;
    3) sembrar ;;
    4) docs ;;
    5) estado ;;
    6) frontend ;;
    0) echo; echo "  ¡Hasta pronto!"; echo; exit 0 ;;
    *) ;;
  esac
done
