"""Reportes y analitica de datos (promedios, top productos, clasificacion ABC)."""
import csv
import io
from datetime import timedelta
from typing import List

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import Alerta, DetalleVenta, Producto, Venta
from app.utils import ahora_utc, hoy_utc


def _total_ventas_del_dia(db: Session, dia: str) -> float:
    total = db.scalar(
        select(func.coalesce(func.sum(Venta.total), 0.0)).where(
            Venta.estado == "completada",
            func.date(Venta.fecha) == dia,
        )
    )
    return round(float(total or 0.0), 2)


def resumen(db: Session) -> dict:
    hoy = ahora_utc()
    ayer = hoy - timedelta(days=1)
    hoy_str = hoy.date().isoformat()
    ayer_str = ayer.date().isoformat()

    total_hoy = _total_ventas_del_dia(db, hoy_str)
    total_ayer = _total_ventas_del_dia(db, ayer_str)

    tendencia = None
    if total_ayer > 0:
        tendencia = round((total_hoy - total_ayer) / total_ayer * 100, 2)

    alertas_pendientes = int(
        db.scalar(select(func.count(Alerta.id)).where(Alerta.estado == "pendiente")) or 0
    )
    productos_agotados = int(
        db.scalar(
            select(func.count(Producto.id)).where(
                Producto.activo.is_(True),
                Producto.stock_actual <= 0,
            )
        )
        or 0
    )
    ticket = db.scalar(
        select(func.avg(Venta.total)).where(Venta.estado == "completada")
    )

    return {
        "ventas_hoy": {"total": total_hoy, "tendencia": tendencia},
        "alertas_pendientes": alertas_pendientes,
        "productos_agotados": productos_agotados,
        "ticket_promedio": round(float(ticket or 0.0), 2),
    }


def ventas_por_dia(db: Session, dias: int = 7) -> List[dict]:
    hoy = hoy_utc()
    resultado = []
    for offset in range(dias - 1, -1, -1):
        dia = (hoy - timedelta(days=offset)).isoformat()
        resultado.append({"fecha": dia, "total": _total_ventas_del_dia(db, dia)})
    return resultado


def top_productos(db: Session, limite: int = 5) -> List[dict]:
    filas = db.execute(
        select(
            Producto.id,
            Producto.codigo,
            Producto.nombre,
            func.sum(DetalleVenta.cantidad).label("cantidad_vendida"),
        )
        .join(DetalleVenta, DetalleVenta.producto_id == Producto.id)
        .join(Venta, Venta.id == DetalleVenta.venta_id)
        .where(Venta.estado == "completada")
        .group_by(Producto.id)
        .order_by(func.sum(DetalleVenta.cantidad).desc())
        .limit(limite)
    ).all()

    return [
        {
            "producto_id": fila.id,
            "codigo": fila.codigo,
            "nombre": fila.nombre,
            "cantidad_vendida": float(fila.cantidad_vendida or 0),
        }
        for fila in filas
    ]


def clasificacion_abc(db: Session) -> List[dict]:
    filas = db.execute(
        select(
            Producto.id,
            Producto.codigo,
            Producto.nombre,
            func.sum(DetalleVenta.subtotal).label("valor_vendido"),
        )
        .join(DetalleVenta, DetalleVenta.producto_id == Producto.id)
        .join(Venta, Venta.id == DetalleVenta.venta_id)
        .where(Venta.estado == "completada")
        .group_by(Producto.id)
        .order_by(func.sum(DetalleVenta.subtotal).desc())
    ).all()

    valor_total = sum(float(fila.valor_vendido or 0) for fila in filas)
    if valor_total <= 0:
        return []

    resultado = []
    acumulado = 0.0
    for fila in filas:
        valor = float(fila.valor_vendido or 0)
        porcentaje = valor / valor_total * 100
        acumulado += porcentaje
        if acumulado <= 80:
            clase = "A"
        elif acumulado <= 95:
            clase = "B"
        else:
            clase = "C"
        resultado.append(
            {
                "producto_id": fila.id,
                "codigo": fila.codigo,
                "nombre": fila.nombre,
                "valor_vendido": round(valor, 2),
                "porcentaje": round(porcentaje, 2),
                "acumulado": round(acumulado, 2),
                "clase": clase,
            }
        )
    return resultado


def ventas_csv(db: Session) -> str:
    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(["id", "fecha", "usuario_id", "estado", "total", "motivo_anulacion"])

    ventas = db.scalars(select(Venta).order_by(Venta.fecha.desc())).all()
    for venta in ventas:
        writer.writerow(
            [
                venta.id,
                venta.fecha.isoformat() if venta.fecha else "",
                venta.usuario_id,
                venta.estado,
                venta.total,
                venta.motivo_anulacion or "",
            ]
        )
    return buffer.getvalue()
