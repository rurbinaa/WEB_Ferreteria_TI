"""Modelos de la base de datos (8 tablas)."""
from datetime import datetime
from typing import List, Optional

from sqlalchemy import (
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.utils import ahora_utc

_ahora = ahora_utc


class Usuario(Base):
    __tablename__ = "usuarios"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    nombre_usuario: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    nombre_completo: Mapped[str] = mapped_column(String(120), nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    rol: Mapped[str] = mapped_column(String(20), nullable=False, default="vendedor")
    activo: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)


class Proveedor(Base):
    __tablename__ = "proveedores"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    nombre: Mapped[str] = mapped_column(String(120), nullable=False)
    telefono: Mapped[Optional[str]] = mapped_column(String(40), nullable=True)
    correo: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    dias_entrega: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    activo: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    productos: Mapped[List["Producto"]] = relationship(back_populates="proveedor")


class Producto(Base):
    __tablename__ = "productos"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    codigo: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    nombre: Mapped[str] = mapped_column(String(150), nullable=False)
    categoria: Mapped[Optional[str]] = mapped_column(String(80), nullable=True)
    unidad: Mapped[str] = mapped_column(String(30), nullable=False, default="unidad")
    precio_venta: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    costo: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    stock_actual: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    stock_minimo: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    proveedor_id: Mapped[Optional[int]] = mapped_column(ForeignKey("proveedores.id"), nullable=True)
    activo: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    proveedor: Mapped[Optional["Proveedor"]] = relationship(back_populates="productos")


class Venta(Base):
    __tablename__ = "ventas"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    client_uuid: Mapped[str] = mapped_column(String(80), unique=True, index=True, nullable=False)
    fecha: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=_ahora)
    usuario_id: Mapped[int] = mapped_column(ForeignKey("usuarios.id"), nullable=False)
    total: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    estado: Mapped[str] = mapped_column(String(20), nullable=False, default="completada")
    motivo_anulacion: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    anulada_por: Mapped[Optional[int]] = mapped_column(ForeignKey("usuarios.id"), nullable=True)

    usuario: Mapped["Usuario"] = relationship(foreign_keys=[usuario_id])
    detalle: Mapped[List["DetalleVenta"]] = relationship(
        back_populates="venta", cascade="all, delete-orphan"
    )


class DetalleVenta(Base):
    __tablename__ = "detalle_venta"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    venta_id: Mapped[int] = mapped_column(ForeignKey("ventas.id"), nullable=False)
    producto_id: Mapped[int] = mapped_column(ForeignKey("productos.id"), nullable=False)
    cantidad: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    precio_unitario: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    subtotal: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)

    venta: Mapped["Venta"] = relationship(back_populates="detalle")
    producto: Mapped["Producto"] = relationship()


class EntradaMercancia(Base):
    __tablename__ = "entradas_mercancia"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    fecha: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=_ahora)
    proveedor_id: Mapped[Optional[int]] = mapped_column(ForeignKey("proveedores.id"), nullable=True)
    producto_id: Mapped[int] = mapped_column(ForeignKey("productos.id"), nullable=False)
    cantidad: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    costo_unitario: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    usuario_id: Mapped[int] = mapped_column(ForeignKey("usuarios.id"), nullable=False)

    proveedor: Mapped[Optional["Proveedor"]] = relationship()
    producto: Mapped["Producto"] = relationship()
    usuario: Mapped["Usuario"] = relationship()


class Alerta(Base):
    __tablename__ = "alertas"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    producto_id: Mapped[int] = mapped_column(ForeignKey("productos.id"), nullable=False)
    fecha_creada: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=_ahora)
    stock_al_generar: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    cantidad_sugerida: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    confianza: Mapped[str] = mapped_column(String(20), nullable=False, default="normal")
    estado: Mapped[str] = mapped_column(String(20), nullable=False, default="pendiente")
    fecha_atendida: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    atendida_por: Mapped[Optional[int]] = mapped_column(ForeignKey("usuarios.id"), nullable=True)

    producto: Mapped["Producto"] = relationship()


class Bitacora(Base):
    __tablename__ = "bitacora"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    fecha: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=_ahora)
    usuario_id: Mapped[Optional[int]] = mapped_column(ForeignKey("usuarios.id"), nullable=True)
    usuario_nombre: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    accion: Mapped[str] = mapped_column(String(40), nullable=False)
    entidad: Mapped[Optional[str]] = mapped_column(String(40), nullable=True)
    entidad_id: Mapped[Optional[str]] = mapped_column(String(80), nullable=True)
    resultado: Mapped[str] = mapped_column(String(10), nullable=False, default="ok")
    detalle: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
