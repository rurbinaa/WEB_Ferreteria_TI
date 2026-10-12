"""Endpoints de ventas."""
from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.errors import APIError
from app.models import Usuario, Venta
from app.schemas import ErrorResponse, VentaAnular, VentaCreate, VentaOut
from app.security import get_current_user, require_role
from app.services import bitacora, ventas as ventas_service
from app.utils import ahora_utc, rango_dia

router = APIRouter(prefix="/ventas", tags=["ventas"])


@router.post(
    "",
    response_model=VentaOut,
    status_code=201,
    responses={404: {"model": ErrorResponse}, 409: {"model": ErrorResponse}},
    summary="Registra una venta (admin y vendedor)",
)
def crear_venta(
    data: VentaCreate,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_current_user),
) -> dict:
    venta = ventas_service.crear_venta(db, usuario, data)
    return ventas_service.venta_a_dict(venta)


@router.get("", response_model=List[VentaOut], summary="Lista ventas (admin: todas, vendedor: las suyas de hoy)")
def listar_ventas(
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_current_user),
) -> List[dict]:
    consulta = select(Venta).order_by(Venta.fecha.desc())
    if usuario.rol != "admin":
        inicio, fin = rango_dia(ahora_utc())
        consulta = consulta.where(
            Venta.usuario_id == usuario.id,
            Venta.fecha >= inicio,
            Venta.fecha < fin,
        )
    ventas = db.scalars(consulta).all()
    return [ventas_service.venta_a_dict(venta) for venta in ventas]


@router.get(
    "/{venta_id}",
    response_model=VentaOut,
    responses={403: {"model": ErrorResponse}, 404: {"model": ErrorResponse}},
    summary="Obtiene una venta (el vendedor solo las suyas)",
)
def obtener_venta(
    venta_id: int,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_current_user),
) -> dict:
    venta = db.get(Venta, venta_id)
    if venta is None:
        raise APIError(404, "Venta no encontrada")
    if usuario.rol != "admin" and venta.usuario_id != usuario.id:
        bitacora.registrar(
            db,
            accion="ACCESO_DENEGADO",
            usuario=usuario,
            entidad="venta",
            entidad_id=venta.id,
            resultado="error",
            detalle="Vendedor intento ver una venta ajena",
        )
        raise APIError(403, "No tiene permiso para ver esta venta")
    return ventas_service.venta_a_dict(venta)


@router.post(
    "/{venta_id}/anular",
    response_model=VentaOut,
    responses={403: {"model": ErrorResponse}, 404: {"model": ErrorResponse}, 409: {"model": ErrorResponse}},
    summary="Anula una venta y devuelve el stock (solo admin)",
)
def anular_venta(
    venta_id: int,
    data: VentaAnular,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(require_role("admin")),
) -> dict:
    venta = ventas_service.anular_venta(db, usuario, venta_id, data.motivo)
    return ventas_service.venta_a_dict(venta)
