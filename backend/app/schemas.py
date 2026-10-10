"""Esquemas de validacion (Pydantic v2)."""
from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field


# --------------------------------------------------------------------------
# Errores
# --------------------------------------------------------------------------
class ErrorResponse(BaseModel):
    error: str
    detalle: Optional[object] = None


# --------------------------------------------------------------------------
# Auth
# --------------------------------------------------------------------------
class LoginRequest(BaseModel):
    nombre_usuario: str = Field(min_length=1)
    password: str = Field(min_length=1)


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UsuarioOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    nombre_usuario: str
    nombre_completo: str
    rol: str
    activo: bool


# --------------------------------------------------------------------------
# Proveedores
# --------------------------------------------------------------------------
class ProveedorBase(BaseModel):
    nombre: str = Field(min_length=1, max_length=120)
    telefono: Optional[str] = Field(default=None, max_length=40)
    correo: Optional[str] = Field(default=None, max_length=120)
    dias_entrega: int = Field(default=0, ge=0)


class ProveedorCreate(ProveedorBase):
    pass


class ProveedorUpdate(BaseModel):
    nombre: Optional[str] = Field(default=None, min_length=1, max_length=120)
    telefono: Optional[str] = Field(default=None, max_length=40)
    correo: Optional[str] = Field(default=None, max_length=120)
    dias_entrega: Optional[int] = Field(default=None, ge=0)
    activo: Optional[bool] = None


class ProveedorOut(ProveedorBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    activo: bool


# --------------------------------------------------------------------------
# Productos
# --------------------------------------------------------------------------
class ProductoBase(BaseModel):
    codigo: str = Field(min_length=1, max_length=50)
    nombre: str = Field(min_length=1, max_length=150)
    categoria: Optional[str] = Field(default=None, max_length=80)
    unidad: str = Field(default="unidad", max_length=30)
    precio_venta: float = Field(ge=0)
    costo: float = Field(default=0, ge=0)
    stock_actual: float = Field(default=0, ge=0)
    stock_minimo: float = Field(default=0, ge=0)
    proveedor_id: Optional[int] = None


class ProductoCreate(ProductoBase):
    pass


class ProductoUpdate(BaseModel):
    codigo: Optional[str] = Field(default=None, min_length=1, max_length=50)
    nombre: Optional[str] = Field(default=None, min_length=1, max_length=150)
    categoria: Optional[str] = Field(default=None, max_length=80)
    unidad: Optional[str] = Field(default=None, max_length=30)
    precio_venta: Optional[float] = Field(default=None, ge=0)
    costo: Optional[float] = Field(default=None, ge=0)
    stock_actual: Optional[float] = Field(default=None, ge=0)
    stock_minimo: Optional[float] = Field(default=None, ge=0)
    proveedor_id: Optional[int] = None
    activo: Optional[bool] = None


class ProductoOut(ProductoBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    activo: bool


class ProductoPublicoOut(BaseModel):
    """Vista para el rol vendedor: no incluye el costo."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    codigo: str
    nombre: str
    categoria: Optional[str] = None
    unidad: str
    precio_venta: float
    stock_actual: float
    stock_minimo: float
    proveedor_id: Optional[int] = None
    activo: bool


# --------------------------------------------------------------------------
# Ventas
# --------------------------------------------------------------------------
class VentaItemIn(BaseModel):
    producto_codigo: str = Field(min_length=1)
    cantidad: int = Field(gt=0)
    # El precio del cliente se ignora: el servidor siempre lo recalcula.
    precio_unitario: Optional[float] = None


class VentaCreate(BaseModel):
    client_uuid: str = Field(min_length=1, max_length=80)
    items: List[VentaItemIn] = Field(min_length=1)


class VentaAnular(BaseModel):
    motivo: str = Field(min_length=1, max_length=300)


class DetalleVentaOut(BaseModel):
    producto_id: int
    producto_codigo: Optional[str] = None
    producto_nombre: Optional[str] = None
    cantidad: float
    precio_unitario: float
    subtotal: float


class VentaOut(BaseModel):
    id: int
    client_uuid: str
    fecha: datetime
    usuario_id: int
    total: float
    estado: str
    motivo_anulacion: Optional[str] = None
    anulada_por: Optional[int] = None
    detalle_venta: List[DetalleVentaOut] = Field(default_factory=list)


# --------------------------------------------------------------------------
# Entradas de mercancia
# --------------------------------------------------------------------------
class EntradaCreate(BaseModel):
    proveedor_id: Optional[int] = None
    producto_id: int
    cantidad: float = Field(gt=0)
    costo_unitario: float = Field(gt=0)


class ProveedorMini(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    nombre: str


class ProductoMini(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    codigo: str
    nombre: str


class EntradaOut(BaseModel):
    id: int
    fecha: datetime
    proveedor_id: Optional[int] = None
    producto_id: int
    cantidad: float
    costo_unitario: float
    usuario_id: int
    proveedor: Optional[ProveedorMini] = None
    producto: Optional[ProductoMini] = None


# --------------------------------------------------------------------------
# Alertas
# --------------------------------------------------------------------------
class ProductoAlertaMini(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    codigo: str
    nombre: str
    stock_minimo: float
    proveedor: Optional[ProveedorMini] = None


class AlertaOut(BaseModel):
    id: int
    producto_id: int
    fecha_creada: datetime
    stock_al_generar: float
    cantidad_sugerida: float
    confianza: str
    estado: str
    fecha_atendida: Optional[datetime] = None
    atendida_por: Optional[int] = None
    producto: Optional[ProductoAlertaMini] = None


class AlertaAtenderOut(BaseModel):
    redirect: bool = True
    alerta_id: int
    producto_id: int
    proveedor_id: Optional[int] = None
    cantidad_sugerida: float


# --------------------------------------------------------------------------
# Bitacora
# --------------------------------------------------------------------------
class BitacoraOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    fecha: datetime
    usuario_id: Optional[int] = None
    usuario_nombre: Optional[str] = None
    accion: str
    entidad: Optional[str] = None
    entidad_id: Optional[str] = None
    resultado: str
    detalle: Optional[str] = None


# --------------------------------------------------------------------------
# Reportes
# --------------------------------------------------------------------------
class VentasHoy(BaseModel):
    total: float
    tendencia: Optional[float] = None


class ResumenOut(BaseModel):
    ventas_hoy: VentasHoy
    alertas_pendientes: int
    productos_agotados: int
    ticket_promedio: float


class VentaPorDia(BaseModel):
    fecha: str
    total: float


class TopProducto(BaseModel):
    producto_id: int
    codigo: str
    nombre: str
    cantidad_vendida: float


class ABCItem(BaseModel):
    producto_id: int
    codigo: str
    nombre: str
    valor_vendido: float
    porcentaje: float
    acumulado: float
    clase: str
