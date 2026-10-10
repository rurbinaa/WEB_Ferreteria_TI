"""Endpoints de reportes y analitica (solo admin)."""
from typing import List

from fastapi import APIRouter, Depends
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Usuario
from app.schemas import ABCItem, ResumenOut, TopProducto, VentaPorDia
from app.security import require_role
from app.services import reportes as reportes_service

router = APIRouter(prefix="/reportes", tags=["reportes"])


@router.get("/resumen", response_model=ResumenOut, summary="KPIs del dashboard (solo admin)")
def resumen(
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(require_role("admin")),
) -> dict:
    return reportes_service.resumen(db)


@router.get("/ventas-por-dia", response_model=List[VentaPorDia], summary="Ventas de los ultimos dias (solo admin)")
def ventas_por_dia(
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(require_role("admin")),
) -> List[dict]:
    return reportes_service.ventas_por_dia(db)


@router.get("/top-productos", response_model=List[TopProducto], summary="Top productos vendidos (solo admin)")
def top_productos(
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(require_role("admin")),
) -> List[dict]:
    return reportes_service.top_productos(db)


@router.get("/abc", response_model=List[ABCItem], summary="Clasificacion ABC de productos (solo admin)")
def abc(
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(require_role("admin")),
) -> List[dict]:
    return reportes_service.clasificacion_abc(db)


@router.get("/ventas.csv", summary="Exporta las ventas en CSV (solo admin)")
def ventas_csv(
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(require_role("admin")),
) -> Response:
    contenido = reportes_service.ventas_csv(db)
    return Response(
        content=contenido,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=ventas.csv"},
    )
