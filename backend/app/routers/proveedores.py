"""Endpoints de proveedores (solo admin)."""
from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.errors import APIError
from app.models import Proveedor, Usuario
from app.schemas import ErrorResponse, ProveedorCreate, ProveedorOut, ProveedorUpdate
from app.security import require_role
from app.services import bitacora

router = APIRouter(prefix="/proveedores", tags=["proveedores"])


@router.get("", response_model=List[ProveedorOut], summary="Lista proveedores (solo admin)")
def listar_proveedores(
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(require_role("admin")),
) -> List[Proveedor]:
    return list(db.scalars(select(Proveedor).order_by(Proveedor.nombre)).all())


@router.get(
    "/{proveedor_id}",
    response_model=ProveedorOut,
    responses={404: {"model": ErrorResponse}},
    summary="Obtiene un proveedor (solo admin)",
)
def obtener_proveedor(
    proveedor_id: int,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(require_role("admin")),
) -> Proveedor:
    proveedor = db.get(Proveedor, proveedor_id)
    if proveedor is None:
        raise APIError(404, "Proveedor no encontrado")
    return proveedor


@router.post(
    "",
    response_model=ProveedorOut,
    status_code=201,
    responses={409: {"model": ErrorResponse}},
    summary="Crea un proveedor (solo admin)",
)
def crear_proveedor(
    data: ProveedorCreate,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(require_role("admin")),
) -> Proveedor:
    if db.scalar(select(Proveedor).where(Proveedor.nombre == data.nombre)) is not None:
        raise APIError(409, f"Ya existe un proveedor llamado '{data.nombre}'")

    proveedor = Proveedor(**data.model_dump())
    db.add(proveedor)
    db.commit()
    db.refresh(proveedor)

    bitacora.registrar(
        db,
        accion="PROVEEDOR_CREADO",
        usuario=usuario,
        entidad="proveedor",
        entidad_id=proveedor.id,
        detalle=f"{proveedor.nombre} creado",
    )
    return proveedor


@router.put(
    "/{proveedor_id}",
    response_model=ProveedorOut,
    responses={404: {"model": ErrorResponse}, 409: {"model": ErrorResponse}},
    summary="Actualiza un proveedor (solo admin)",
)
def actualizar_proveedor(
    proveedor_id: int,
    data: ProveedorUpdate,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(require_role("admin")),
) -> Proveedor:
    proveedor = db.get(Proveedor, proveedor_id)
    if proveedor is None:
        raise APIError(404, "Proveedor no encontrado")

    cambios = data.model_dump(exclude_unset=True)
    if "nombre" in cambios and cambios["nombre"] != proveedor.nombre:
        existente = db.scalar(select(Proveedor).where(Proveedor.nombre == cambios["nombre"]))
        if existente is not None:
            raise APIError(409, f"Ya existe un proveedor llamado '{cambios['nombre']}'")

    for campo, valor in cambios.items():
        setattr(proveedor, campo, valor)

    db.commit()
    db.refresh(proveedor)

    bitacora.registrar(
        db,
        accion="PROVEEDOR_EDITADO",
        usuario=usuario,
        entidad="proveedor",
        entidad_id=proveedor.id,
        detalle=f"{proveedor.nombre} actualizado",
    )
    return proveedor
