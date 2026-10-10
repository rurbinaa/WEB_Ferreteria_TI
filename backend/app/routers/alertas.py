"""Endpoints de alertas de reposicion (solo admin)."""
from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.errors import APIError
from app.models import Alerta, Usuario
from app.schemas import AlertaAtenderOut, AlertaOut, ErrorResponse
from app.security import require_role
from app.services import alertas as alertas_service

router = APIRouter(prefix="/alertas", tags=["alertas"])


def alerta_a_dict(alerta: Alerta) -> dict:
    producto = alerta.producto
    producto_dict = None
    if producto is not None:
        producto_dict = {
            "id": producto.id,
            "codigo": producto.codigo,
            "nombre": producto.nombre,
            "stock_minimo": producto.stock_minimo,
            "proveedor": {"id": producto.proveedor.id, "nombre": producto.proveedor.nombre}
            if producto.proveedor
            else None,
        }
    return {
        "id": alerta.id,
        "producto_id": alerta.producto_id,
        "fecha_creada": alerta.fecha_creada,
        "stock_al_generar": alerta.stock_al_generar,
        "cantidad_sugerida": alerta.cantidad_sugerida,
        "confianza": alerta.confianza,
        "estado": alerta.estado,
        "fecha_atendida": alerta.fecha_atendida,
        "atendida_por": alerta.atendida_por,
        "producto": producto_dict,
    }


@router.get("", response_model=List[AlertaOut], summary="Lista alertas (solo admin)")
def listar_alertas(
    producto: Optional[str] = Query(default=None, description="Filtra por nombre de producto"),
    estado: Optional[str] = Query(default=None, pattern="^(pendiente|atendida)$"),
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(require_role("admin")),
) -> List[dict]:
    consulta = select(Alerta).order_by(Alerta.fecha_creada.desc())
    if estado:
        consulta = consulta.where(Alerta.estado == estado)

    alertas = db.scalars(consulta).all()
    if producto:
        aguja = producto.lower()
        alertas = [a for a in alertas if a.producto and aguja in a.producto.nombre.lower()]
    return [alerta_a_dict(alerta) for alerta in alertas]


@router.post(
    "/{alerta_id}/atender",
    response_model=AlertaAtenderOut,
    responses={404: {"model": ErrorResponse}, 409: {"model": ErrorResponse}},
    summary="Marca una alerta como atendida (solo admin)",
)
def atender_alerta(
    alerta_id: int,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(require_role("admin")),
) -> dict:
    alerta = alertas_service.atender_alerta_manual(db, usuario, alerta_id)
    producto = alerta.producto
    return {
        "redirect": True,
        "alerta_id": alerta.id,
        "producto_id": alerta.producto_id,
        "proveedor_id": producto.proveedor_id if producto else None,
        "cantidad_sugerida": alerta.cantidad_sugerida,
    }
