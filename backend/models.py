"""Modelo relacional multi-tenant de ComunApp (SQLAlchemy 2.0).

Cada comunidad (tenant) aísla sus datos con columna + índice `comunidad_id`.
"""
from datetime import date, datetime
from typing import Optional
from uuid import uuid4

from sqlalchemy import (Boolean, Date, DateTime, Float, ForeignKey, String, Text,
                        UniqueConstraint)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database import Base


def uid() -> str:
    return uuid4().hex[:16]


class Usuario(Base):
    __tablename__ = "usuarios"
    id: Mapped[str] = mapped_column(String(16), primary_key=True, default=uid)
    nombre: Mapped[str] = mapped_column(String(120))
    email: Mapped[str] = mapped_column(String(160), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(200))
    activo: Mapped[bool] = mapped_column(Boolean, default=True)
    rol_global: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)  # SUPERADMIN o None
    creado: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    # Confirmación de correo para cuentas nuevas
    email_confirmado: Mapped[bool] = mapped_column(Boolean, default=True)
    token_confirmacion: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    telefono: Mapped[Optional[str]] = mapped_column(String(40), nullable=True)
    # Contraseña temporal visible para el admin (la genera "restablecer")
    password_temporal: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)

    membresias: Mapped[list["MiembroComunidad"]] = relationship(
        back_populates="usuario", cascade="all, delete-orphan")


class Comunidad(Base):
    __tablename__ = "comunidades"
    id: Mapped[str] = mapped_column(String(16), primary_key=True, default=uid)
    nombre: Mapped[str] = mapped_column(String(160))
    direccion: Mapped[str] = mapped_column(String(200), default="")
    ciudad: Mapped[str] = mapped_column(String(80), default="")
    unidades: Mapped[int] = mapped_column(default=0)
    plan: Mapped[str] = mapped_column(String(20), default="COMITE")  # COMITE | PARCELAS | CUSTOM
    estado: Mapped[str] = mapped_column(String(20), default="ACTIVA")  # ACTIVA | SUSPENDIDA
    creada: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    mp_conectada: Mapped[bool] = mapped_column(Boolean, default=False)
    mp_email: Mapped[Optional[str]] = mapped_column(String(160), nullable=True)
    mp_fecha: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    # Credenciales reales de Mercado Pago (cada comunidad usa su propia cuenta)
    mp_access_token: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    mp_public_key: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    mp_modo: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)  # sandbox | produccion
    # Recursos activables por el superadmin (JSON: {"reservas":bool,"bitacora":bool})
    recursos: Mapped[str] = mapped_column(String(200), default='{"reservas":true,"bitacora":true}')
    # Envío automático mensual del informe de finanzas y transparencia
    informe_auto: Mapped[bool] = mapped_column(Boolean, default=True)


class MiembroComunidad(Base):
    """Membresía: un usuario pertenece a N comunidades con un rol por comunidad."""
    __tablename__ = "miembros_comunidad"
    __table_args__ = (UniqueConstraint("usuario_id", "comunidad_id", name="uq_miembro"),)
    id: Mapped[str] = mapped_column(String(16), primary_key=True, default=uid)
    usuario_id: Mapped[str] = mapped_column(ForeignKey("usuarios.id", ondelete="CASCADE"))
    comunidad_id: Mapped[str] = mapped_column(ForeignKey("comunidades.id", ondelete="CASCADE"), index=True)
    rol: Mapped[str] = mapped_column(String(20))  # ADMIN | COMITE | PROPIETARIO | ARRENDATARIO
    unidad: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)

    usuario: Mapped["Usuario"] = relationship(back_populates="membresias")


class Cobro(Base):
    __tablename__ = "cobros"
    __table_args__ = (UniqueConstraint("comunidad_id", "unidad", "periodo", "concepto", name="uq_cobro"),)
    id: Mapped[str] = mapped_column(String(16), primary_key=True, default=uid)
    comunidad_id: Mapped[str] = mapped_column(ForeignKey("comunidades.id", ondelete="CASCADE"), index=True)
    unidad: Mapped[str] = mapped_column(String(20))
    periodo: Mapped[str] = mapped_column(String(7))  # YYYY-MM
    concepto: Mapped[str] = mapped_column(String(120), default="Pagos del mes")
    monto: Mapped[float] = mapped_column(Float)
    estado: Mapped[str] = mapped_column(String(20), default="PENDIENTE")  # PENDIENTE | PAGADO | VENCIDO
    vencimiento: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    creado: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class Pago(Base):
    __tablename__ = "pagos"
    id: Mapped[str] = mapped_column(String(16), primary_key=True, default=uid)
    comunidad_id: Mapped[str] = mapped_column(ForeignKey("comunidades.id", ondelete="CASCADE"), index=True)
    cobro_id: Mapped[str] = mapped_column(ForeignKey("cobros.id"), nullable=True)
    unidad: Mapped[str] = mapped_column(String(20))
    monto: Mapped[float] = mapped_column(Float)
    metodo: Mapped[str] = mapped_column(String(40), default="Mercado Pago")
    referencia: Mapped[str] = mapped_column(String(80), default="")
    fecha: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class Movimiento(Base):
    __tablename__ = "movimientos"
    id: Mapped[str] = mapped_column(String(16), primary_key=True, default=uid)
    comunidad_id: Mapped[str] = mapped_column(ForeignKey("comunidades.id", ondelete="CASCADE"), index=True)
    fecha: Mapped[date] = mapped_column(Date)
    tipo: Mapped[str] = mapped_column(String(10))  # INGRESO | GASTO
    categoria: Mapped[str] = mapped_column(String(80), default="")
    descripcion: Mapped[str] = mapped_column(String(220), default="")
    monto: Mapped[float] = mapped_column(Float)
    conciliado: Mapped[bool] = mapped_column(Boolean, default=False)


class Aviso(Base):
    __tablename__ = "avisos"
    id: Mapped[str] = mapped_column(String(16), primary_key=True, default=uid)
    comunidad_id: Mapped[str] = mapped_column(ForeignKey("comunidades.id", ondelete="CASCADE"), index=True)
    titulo: Mapped[str] = mapped_column(String(160))
    cuerpo: Mapped[str] = mapped_column(Text, default="")
    tipo: Mapped[str] = mapped_column(String(20), default="INFORMATIVO")  # INFORMATIVO | EMERGENCIA | MANTENCION
    autor: Mapped[str] = mapped_column(String(120), default="")
    creado: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class Reserva(Base):
    __tablename__ = "reservas"
    __table_args__ = (UniqueConstraint("comunidad_id", "area", "fecha", "bloque", name="uq_reserva"),)
    id: Mapped[str] = mapped_column(String(16), primary_key=True, default=uid)
    comunidad_id: Mapped[str] = mapped_column(ForeignKey("comunidades.id", ondelete="CASCADE"), index=True)
    area: Mapped[str] = mapped_column(String(80))
    fecha: Mapped[date] = mapped_column(Date)
    bloque: Mapped[str] = mapped_column(String(20))  # MAÑANA | TARDE | NOCHE
    unidad: Mapped[str] = mapped_column(String(20), default="")
    residente: Mapped[str] = mapped_column(String(120), default="")


class Votacion(Base):
    __tablename__ = "votaciones"
    id: Mapped[str] = mapped_column(String(16), primary_key=True, default=uid)
    comunidad_id: Mapped[str] = mapped_column(ForeignKey("comunidades.id", ondelete="CASCADE"), index=True)
    titulo: Mapped[str] = mapped_column(String(160))
    pregunta: Mapped[str] = mapped_column(Text, default="")
    opciones: Mapped[str] = mapped_column(Text, default="")  # JSON list
    abierta: Mapped[bool] = mapped_column(Boolean, default=True)
    creado: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    votos: Mapped[list["Voto"]] = relationship(back_populates="votacion", cascade="all, delete-orphan")


class Voto(Base):
    __tablename__ = "votos"
    __table_args__ = (UniqueConstraint("votacion_id", "unidad", name="uq_voto"),)
    id: Mapped[str] = mapped_column(String(16), primary_key=True, default=uid)
    votacion_id: Mapped[str] = mapped_column(ForeignKey("votaciones.id", ondelete="CASCADE"))
    unidad: Mapped[str] = mapped_column(String(20))
    opcion: Mapped[str] = mapped_column(String(120))

    votacion: Mapped["Votacion"] = relationship(back_populates="votos")


class Factura(Base):
    """Facturación del SaaS: el cobro mensual de ComunApp A cada comunidad."""
    __tablename__ = "facturas"
    __table_args__ = (UniqueConstraint("comunidad_id", "periodo", name="uq_factura"),)
    id: Mapped[str] = mapped_column(String(16), primary_key=True, default=uid)
    comunidad_id: Mapped[str] = mapped_column(ForeignKey("comunidades.id", ondelete="CASCADE"), index=True)
    periodo: Mapped[str] = mapped_column(String(7))  # YYYY-MM
    plan: Mapped[str] = mapped_column(String(80))
    monto: Mapped[float] = mapped_column(Float)
    estado: Mapped[str] = mapped_column(String(20), default="PENDIENTE")  # PENDIENTE | PAGADA | VENCIDA
    fecha: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class RegistroAcceso(Base):
    __tablename__ = "registros_acceso"
    id: Mapped[str] = mapped_column(String(16), primary_key=True, default=uid)
    comunidad_id: Mapped[str] = mapped_column(ForeignKey("comunidades.id", ondelete="CASCADE"), index=True)
    visitante: Mapped[str] = mapped_column(String(140))
    tipo: Mapped[str] = mapped_column(String(20), default="VISITA")  # VISITA | PROVEEDOR
    unidad: Mapped[str] = mapped_column(String(60), default="")
    entrada: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    salida: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)


class Plan(Base):
    """Plan comercial de la plataforma (nombre + precio mensual)."""
    __tablename__ = "planes"
    id: Mapped[str] = mapped_column(String(16), primary_key=True, default=uid)
    nombre: Mapped[str] = mapped_column(String(80))
    precio: Mapped[float] = mapped_column(Float, default=0)  # CLP mensual (0 = gratis)
    activa: Mapped[bool] = mapped_column(Boolean, default=True)
    creada: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class Suscripcion(Base):
    """Suscripción de pago automático de un vecino (preapproval Mercado Pago)."""
    __tablename__ = "suscripciones"
    id: Mapped[str] = mapped_column(String(16), primary_key=True, default=uid)
    comunidad_id: Mapped[str] = mapped_column(ForeignKey("comunidades.id", ondelete="CASCADE"), index=True)
    unidad: Mapped[str] = mapped_column(String(20))
    email: Mapped[str] = mapped_column(String(160), default="")
    monto: Mapped[float] = mapped_column(Float)  # monto base mensual
    frecuencia: Mapped[str] = mapped_column(String(20), default="MENSUAL")
    estado: Mapped[str] = mapped_column(String(20), default="PENDIENTE")  # PENDIENTE | AUTORIZADA | CANCELADA
    mp_id: Mapped[Optional[str]] = mapped_column(String(60), nullable=True)
    link_autorizacion: Mapped[Optional[str]] = mapped_column(String(300), nullable=True)
    creada: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class ConfigPlataforma(Base):
    """Credenciales Mercado Pago de la PLATAFORMA (singleton: id fijo)."""
    __tablename__ = "config_plataforma"
    id: Mapped[int] = mapped_column(primary_key=True, default=1)
    conectada: Mapped[bool] = mapped_column(Boolean, default=False)
    access_token: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    public_key: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    email: Mapped[Optional[str]] = mapped_column(String(160), nullable=True)
    fecha: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
