"""Endpoints de entradas de mercancia (solo admin)."""
from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import EntradaMercancia, Usuario
from app.schemas import EntradaCreate, EntradaOut, ErrorResponse
from app.security import require_role
from app.services import inventario as inventario_service

router = APIRouter(prefix="/entradas", tags=["entradas"])


@router.get("", response_model=List[EntradaOut], summary="Lista entradas de mercancia (solo admin)")
def listar_entradas(
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(require_role("admin")),
) -> List[dict]:
    entradas = db.scalars(select(EntradaMercancia).order_by(EntradaMercancia.fecha.desc())).all()
    return [inventario_service.entrada_a_dict(entrada) for entrada in entradas]


@router.post(
    "",
    response_model=EntradaOut,
    status_code=201,
    responses={404: {"model": ErrorResponse}, 409: {"model": ErrorResponse}},
    summary="Registra una entrada: sube stock y cierra la alerta pendiente (solo admin)",
)
def crear_entrada(
    data: EntradaCreate,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(require_role("admin")),
) -> dict:
    entrada = inventario_service.registrar_entrada(db, usuario, data)
    return inventario_service.entrada_a_dict(entrada)
