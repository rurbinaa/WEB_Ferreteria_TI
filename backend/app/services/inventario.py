"""Logica de entradas de mercancia (inventario)."""
from sqlalchemy.orm import Session

from app.errors import APIError
from app.models import EntradaMercancia, Producto, Proveedor, Usuario
from app.schemas import EntradaCreate
from app.services import alertas, bitacora


def registrar_entrada(db: Session, usuario: Usuario, data: EntradaCreate) -> EntradaMercancia:
    producto = db.get(Producto, data.producto_id)
    if producto is None:
        raise APIError(404, "Producto no encontrado")
    if not producto.activo:
        raise APIError(409, "El producto esta inactivo")

    if data.proveedor_id is not None:
        proveedor = db.get(Proveedor, data.proveedor_id)
        if proveedor is None:
            raise APIError(404, "Proveedor no encontrado")

    entrada = EntradaMercancia(
        proveedor_id=data.proveedor_id,
        producto_id=producto.id,
        cantidad=data.cantidad,
        costo_unitario=data.costo_unitario,
        usuario_id=usuario.id,
    )
    producto.stock_actual += data.cantidad
    producto.costo = data.costo_unitario

    db.add(entrada)
    db.commit()
    db.refresh(entrada)
    db.refresh(producto)

    # Retroalimentacion: si se supero el minimo, la alerta pendiente se cierra.
    alertas.cerrar_alerta_por_stock(db, producto, usuario)

    bitacora.registrar(
        db,
        accion="ENTRADA_REGISTRADA",
        usuario=usuario,
        entidad="entrada",
        entidad_id=entrada.id,
        detalle=f"{data.cantidad} de {producto.nombre} a costo {data.costo_unitario}",
    )
    return entrada


def entrada_a_dict(entrada: EntradaMercancia) -> dict:
    return {
        "id": entrada.id,
        "fecha": entrada.fecha,
        "proveedor_id": entrada.proveedor_id,
        "producto_id": entrada.producto_id,
        "cantidad": entrada.cantidad,
        "costo_unitario": entrada.costo_unitario,
        "usuario_id": entrada.usuario_id,
        "proveedor": {"id": entrada.proveedor.id, "nombre": entrada.proveedor.nombre}
        if entrada.proveedor
        else None,
        "producto": {
            "id": entrada.producto.id,
            "codigo": entrada.producto.codigo,
            "nombre": entrada.producto.nombre,
        }
        if entrada.producto
        else None,
    }
