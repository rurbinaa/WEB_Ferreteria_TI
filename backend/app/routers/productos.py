"""Endpoints de productos."""
from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.errors import APIError
from app.models import Producto, Proveedor, Usuario
from app.schemas import ErrorResponse, ProductoCreate, ProductoOut, ProductoUpdate
from app.security import get_current_user, require_role
from app.services import bitacora

router = APIRouter(prefix="/productos", tags=["productos"])


def producto_a_dict(producto: Producto, incluir_costo: bool) -> dict:
    data = {
        "id": producto.id,
        "codigo": producto.codigo,
        "nombre": producto.nombre,
        "categoria": producto.categoria,
        "unidad": producto.unidad,
        "precio_venta": producto.precio_venta,
        "stock_actual": producto.stock_actual,
        "stock_minimo": producto.stock_minimo,
        "proveedor_id": producto.proveedor_id,
        "activo": producto.activo,
    }
    if incluir_costo:
        data["costo"] = producto.costo
    return data


@router.get(
    "",
    responses={200: {"description": "El vendedor no recibe el costo"}},
    summary="Lista productos (el vendedor no ve el costo)",
)
def listar_productos(
    q: Optional[str] = Query(default=None, description="Busca por codigo o nombre"),
    categoria: Optional[str] = Query(default=None),
    stock: Optional[str] = Query(default=None, pattern="^(agotado|bajo|ok)$"),
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_current_user),
) -> List[dict]:
    consulta = select(Producto)
    if q:
        patron = f"%{q}%"
        consulta = consulta.where(or_(Producto.codigo.ilike(patron), Producto.nombre.ilike(patron)))
    if categoria:
        consulta = consulta.where(Producto.categoria == categoria)
    if stock == "agotado":
        consulta = consulta.where(Producto.stock_actual <= 0)
    elif stock == "bajo":
        consulta = consulta.where(Producto.stock_actual > 0, Producto.stock_actual <= Producto.stock_minimo)
    elif stock == "ok":
        consulta = consulta.where(Producto.stock_actual > Producto.stock_minimo)

    productos = db.scalars(consulta.order_by(Producto.codigo)).all()
    incluir_costo = usuario.rol == "admin"
    return [producto_a_dict(producto, incluir_costo) for producto in productos]


@router.get(
    "/{producto_id}",
    responses={404: {"model": ErrorResponse}, 200: {"description": "El vendedor no recibe el costo"}},
    summary="Obtiene un producto por id",
)
def obtener_producto(
    producto_id: int,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_current_user),
) -> dict:
    producto = db.get(Producto, producto_id)
    if producto is None:
        raise APIError(404, "Producto no encontrado")
    return producto_a_dict(producto, usuario.rol == "admin")


@router.post(
    "",
    response_model=ProductoOut,
    status_code=201,
    responses={403: {"model": ErrorResponse}, 409: {"model": ErrorResponse}},
    summary="Crea un producto (solo admin)",
)
def crear_producto(
    data: ProductoCreate,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(require_role("admin")),
) -> Producto:
    if db.scalar(select(Producto).where(Producto.codigo == data.codigo)) is not None:
        raise APIError(409, f"El codigo '{data.codigo}' ya existe")
    if data.proveedor_id is not None and db.get(Proveedor, data.proveedor_id) is None:
        raise APIError(404, "Proveedor no encontrado")

    producto = Producto(**data.model_dump())
    db.add(producto)
    db.commit()
    db.refresh(producto)

    bitacora.registrar(
        db,
        accion="PRODUCTO_CREADO",
        usuario=usuario,
        entidad="producto",
        entidad_id=producto.id,
        detalle=f"{producto.nombre} ({producto.codigo}) creado",
    )
    return producto


@router.put(
    "/{producto_id}",
    response_model=ProductoOut,
    responses={403: {"model": ErrorResponse}, 404: {"model": ErrorResponse}, 409: {"model": ErrorResponse}},
    summary="Actualiza un producto (solo admin)",
)
def actualizar_producto(
    producto_id: int,
    data: ProductoUpdate,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(require_role("admin")),
) -> Producto:
    producto = db.get(Producto, producto_id)
    if producto is None:
        raise APIError(404, "Producto no encontrado")

    cambios = data.model_dump(exclude_unset=True)
    if "codigo" in cambios and cambios["codigo"] != producto.codigo:
        existente = db.scalar(select(Producto).where(Producto.codigo == cambios["codigo"]))
        if existente is not None:
            raise APIError(409, f"El codigo '{cambios['codigo']}' ya existe")
    if cambios.get("proveedor_id") is not None and db.get(Proveedor, cambios["proveedor_id"]) is None:
        raise APIError(404, "Proveedor no encontrado")

    for campo, valor in cambios.items():
        setattr(producto, campo, valor)

    db.commit()
    db.refresh(producto)

    desactivado = cambios.get("activo") is False
    bitacora.registrar(
        db,
        accion="PRODUCTO_DESACTIVADO" if desactivado else "PRODUCTO_EDITADO",
        usuario=usuario,
        entidad="producto",
        entidad_id=producto.id,
        detalle=f"{producto.nombre} ({producto.codigo}) actualizado",
    )
    return producto


@router.delete(
    "/{producto_id}",
    response_model=ProductoOut,
    responses={403: {"model": ErrorResponse}, 404: {"model": ErrorResponse}},
    summary="Desactiva un producto (soft delete, solo admin)",
)
def desactivar_producto(
    producto_id: int,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(require_role("admin")),
) -> Producto:
    producto = db.get(Producto, producto_id)
    if producto is None:
        raise APIError(404, "Producto no encontrado")

    producto.activo = False
    db.commit()
    db.refresh(producto)

    bitacora.registrar(
        db,
        accion="PRODUCTO_DESACTIVADO",
        usuario=usuario,
        entidad="producto",
        entidad_id=producto.id,
        detalle=f"{producto.nombre} ({producto.codigo}) desactivado",
    )
    return producto
