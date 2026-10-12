"""Regla de negocio de alertas de reposicion.

Solo recomienda; nunca compra. Puede fallar con productos de temporada,
compras grandes puntuales y productos nuevos sin historial.
"""
import math
from datetime import timedelta
from typing import Optional, Tuple

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.config import settings
from app.errors import APIError
from app.models import Alerta, DetalleVenta, Producto, Usuario, Venta
from app.services import bitacora
from app.utils import ahora_utc


def calcular_sugerencia(db: Session, producto: Producto) -> Tuple[float, str]:
    """Devuelve (cantidad_sugerida, confianza)."""
    desde = ahora_utc() - timedelta(days=settings.DIAS_VENTANA)

    resultado = db.execute(
        select(
            func.sum(DetalleVenta.cantidad),
            func.count(func.distinct(func.date(Venta.fecha))),
        )
        .join(Venta, Venta.id == DetalleVenta.venta_id)
        .where(
            DetalleVenta.producto_id == producto.id,
            Venta.estado == "completada",
            Venta.fecha >= desde,
        )
    ).one()

    total_vendido = resultado[0] or 0
    dias_con_ventas = resultado[1] or 0

    if total_vendido <= 0 or dias_con_ventas < settings.DIAS_HISTORIAL_MINIMO:
        # Sin historial suficiente: estimacion conservadora con confianza baja.
        cantidad = max(0.0, producto.stock_minimo * 2 - producto.stock_actual)
        return float(cantidad), "baja"

    promedio_diario = total_vendido / settings.DIAS_VENTANA
    dias_entrega = producto.proveedor.dias_entrega if producto.proveedor else 0
    objetivo = math.ceil(promedio_diario * (dias_entrega + settings.DIAS_COBERTURA))
    cantidad = max(0.0, float(objetivo) - producto.stock_actual)
    return cantidad, "normal"


def evaluar_alerta(db: Session, producto: Producto, usuario: Optional[Usuario]) -> Optional[Alerta]:
    """Crea una alerta pendiente si el stock cayo al minimo o por debajo.

    No crea una nueva si ya existe una alerta pendiente para el producto.
    """
    if producto.stock_actual > producto.stock_minimo:
        return None

    pendiente = db.scalar(
        select(Alerta).where(
            Alerta.producto_id == producto.id,
            Alerta.estado == "pendiente",
        )
    )
    if pendiente is not None:
        return pendiente

    cantidad, confianza = calcular_sugerencia(db, producto)
    alerta = Alerta(
        producto_id=producto.id,
        stock_al_generar=producto.stock_actual,
        cantidad_sugerida=cantidad,
        confianza=confianza,
        estado="pendiente",
    )
    db.add(alerta)
    db.commit()
    db.refresh(alerta)

    bitacora.registrar(
        db,
        accion="ALERTA_GENERADA",
        usuario=usuario,
        entidad="alerta",
        entidad_id=alerta.id,
        detalle=f"{producto.nombre}: stock {producto.stock_actual}, sugerido {cantidad} ({confianza})",
    )
    return alerta


def cerrar_alerta_por_stock(db: Session, producto: Producto, usuario: Optional[Usuario]) -> Optional[Alerta]:
    """Cierra la alerta pendiente cuando el stock vuelve a superar el minimo."""
    if producto.stock_actual <= producto.stock_minimo:
        return None

    alerta = db.scalar(
        select(Alerta).where(
            Alerta.producto_id == producto.id,
            Alerta.estado == "pendiente",
        )
    )
    if alerta is None:
        return None

    alerta.estado = "atendida"
    alerta.fecha_atendida = ahora_utc()
    alerta.atendida_por = usuario.id if usuario is not None else None
    db.commit()
    db.refresh(alerta)

    bitacora.registrar(
        db,
        accion="ALERTA_ATENDIDA",
        usuario=usuario,
        entidad="alerta",
        entidad_id=alerta.id,
        detalle=f"{producto.nombre}: stock repuesto a {producto.stock_actual}",
    )
    return alerta


def atender_alerta_manual(db: Session, usuario: Usuario, alerta_id: int) -> Alerta:
    alerta = db.get(Alerta, alerta_id)
    if alerta is None:
        raise APIError(404, "Alerta no encontrada")
    if alerta.estado == "atendida":
        raise APIError(409, "La alerta ya fue atendida")

    alerta.estado = "atendida"
    alerta.fecha_atendida = ahora_utc()
    alerta.atendida_por = usuario.id
    db.commit()
    db.refresh(alerta)

    bitacora.registrar(
        db,
        accion="ALERTA_ATENDIDA",
        usuario=usuario,
        entidad="alerta",
        entidad_id=alerta.id,
        detalle=f"Alerta {alerta.id} atendida manualmente",
    )
    return alerta
