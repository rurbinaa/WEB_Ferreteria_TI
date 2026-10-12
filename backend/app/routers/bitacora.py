"""Endpoint de consulta de bitacora (solo admin, solo lectura)."""
from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Bitacora, Usuario
from app.schemas import BitacoraOut
from app.security import require_role
from app.utils import rango_dia

router = APIRouter(prefix="/bitacora", tags=["bitacora"])


@router.get("", response_model=List[BitacoraOut], summary="Consulta la bitacora con filtros (solo admin)")
def listar_bitacora(
    usuario: Optional[str] = Query(default=None, description="Filtra por nombre de usuario"),
    accion: Optional[str] = Query(default=None, description="Filtra por accion"),
    fecha: Optional[str] = Query(default=None, description="Filtra por fecha (YYYY-MM-DD)"),
    limite: int = Query(default=200, ge=1, le=1000),
    db: Session = Depends(get_db),
    current: Usuario = Depends(require_role("admin")),
) -> List[Bitacora]:
    consulta = select(Bitacora).order_by(Bitacora.fecha.desc())
    if usuario:
        consulta = consulta.where(Bitacora.usuario_nombre.ilike(f"%{usuario}%"))
    if accion:
        consulta = consulta.where(Bitacora.accion == accion)
    if fecha:
        inicio, fin = rango_dia(fecha)
        consulta = consulta.where(Bitacora.fecha >= inicio, Bitacora.fecha < fin)

    return list(db.scalars(consulta.limit(limite)).all())
