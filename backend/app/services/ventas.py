"""Logica de negocio de ventas: crear, idempotencia y anular."""
from typing import Dict

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.errors import APIError
from app.models import DetalleVenta, Producto, Usuario, Venta
from app.schemas import VentaCreate
from app.services import alertas, bitacora


def venta_a_dict(venta: Venta) -> dict:
    return {
        "id": venta.id,
        "client_uuid": venta.client_uuid,
        "fecha": venta.fecha,
        "usuario_id": venta.usuario_id,
        "total": venta.total,
        "estado": venta.estado,
        "motivo_anulacion": venta.motivo_anulacion,
        "anulada_por": venta.anulada_por,
        "detalle_venta": [
            {
                "producto_id": detalle.producto_id,
                "producto_codigo": detalle.producto.codigo if detalle.producto else None,
                "producto_nombre": detalle.producto.nombre if detalle.producto else None,
                "cantidad": detalle.cantidad,
                "precio_unitario": detalle.precio_unitario,
                "subtotal": detalle.subtotal,
            }
            for detalle in venta.detalle
        ],
    }


def crear_venta(db: Session, usuario: Usuario, data: VentaCreate) -> Venta:
    """Crea una venta de forma transaccional e idempotente."""
    existente = db.scalar(select(Venta).where(Venta.client_uuid == data.client_uuid))
    if existente is not None:
        # Idempotencia: devuelve la venta original sin duplicar ni descontar.
        return existente

    # Agrupa cantidades por producto para validar stock una sola vez.
    cantidades: Dict[str, int] = {}
    for item in data.items:
        cantidades[item.producto_codigo] = cantidades.get(item.producto_codigo, 0) + item.cantidad

    try:
        productos: Dict[str, Producto] = {}
        for codigo, cantidad in cantidades.items():
            producto = db.scalar(select(Producto).where(Producto.codigo == codigo))
            if producto is None:
                raise APIError(404, f"Producto no encontrado: {codigo}")
            if not producto.activo:
                raise APIError(409, f"Producto inactivo: {codigo}")
            if producto.stock_actual < cantidad:
                raise APIError(
                    409,
                    f"Stock insuficiente para {producto.nombre} "
                    f"(disponible {producto.stock_actual}, solicitado {cantidad})",
                )
            productos[codigo] = producto

        venta = Venta(
            client_uuid=data.client_uuid,
            usuario_id=usuario.id,
            estado="completada",
        )
        total = 0.0
        for codigo, cantidad in cantidades.items():
            producto = productos[codigo]
            subtotal = round(cantidad * producto.precio_venta, 2)
            total += subtotal
            venta.detalle.append(
                DetalleVenta(
                    producto_id=producto.id,
                    cantidad=cantidad,
                    precio_unitario=producto.precio_venta,
                    subtotal=subtotal,
                )
            )
            producto.stock_actual -= cantidad
        venta.total = round(total, 2)
        db.add(venta)
        db.commit()
    except Exception as exc:
        db.rollback()
        detalle = exc.error if isinstance(exc, APIError) else str(exc)
        bitacora.registrar(
            db,
            accion="VENTA_CREADA",
            usuario=usuario,
            entidad="venta",
            entidad_id=data.client_uuid,
            resultado="error",
            detalle=detalle,
        )
        raise

    db.refresh(venta)

    # Retroalimentacion: revisa alertas de los productos afectados.
    for producto in productos.values():
        alertas.evaluar_alerta(db, producto, usuario)

    bitacora.registrar(
        db,
        accion="VENTA_CREADA",
        usuario=usuario,
        entidad="venta",
        entidad_id=venta.id,
        detalle=f"Venta #{venta.id} por {venta.total}",
    )
    return venta


def anular_venta(db: Session, usuario: Usuario, venta_id: int, motivo: str) -> Venta:
    venta = db.get(Venta, venta_id)
    if venta is None:
        raise APIError(404, "Venta no encontrada")
    if venta.estado != "completada":
        bitacora.registrar(
            db,
            accion="VENTA_ANULADA",
            usuario=usuario,
            entidad="venta",
            entidad_id=venta.id,
            resultado="error",
            detalle="La venta ya estaba anulada",
        )
        raise APIError(409, "La venta ya esta anulada")

    venta.estado = "anulada"
    venta.motivo_anulacion = motivo
    venta.anulada_por = usuario.id

    afectados = []
    for detalle in venta.detalle:
        producto = db.get(Producto, detalle.producto_id)
        if producto is not None:
            producto.stock_actual += detalle.cantidad
            afectados.append(producto)

    db.commit()
    db.refresh(venta)

    for producto in afectados:
        alertas.evaluar_alerta(db, producto, usuario)

    bitacora.registrar(
        db,
        accion="VENTA_ANULADA",
        usuario=usuario,
        entidad="venta",
        entidad_id=venta.id,
        detalle=f"Venta #{venta.id} anulada: {motivo}",
    )
    return venta
