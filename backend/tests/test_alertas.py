"""Pruebas de alertas y entradas: B-03, B-04 y B-14."""
from sqlalchemy import select

from app.models import Alerta, Producto


def _venta(client, auth, uuid, codigo, cantidad):
    respuesta = client.post(
        "/ventas",
        headers=auth,
        json={
            "client_uuid": uuid,
            "items": [{"producto_codigo": codigo, "cantidad": cantidad}],
        },
    )
    assert respuesta.status_code == 201
    return respuesta


def _stock(db, producto_id):
    return db.scalar(select(Producto.stock_actual).where(Producto.id == producto_id))


def _alertas_producto(db, producto_id):
    return db.scalars(
        select(Alerta).where(Alerta.producto_id == producto_id).order_by(Alerta.id)
    ).all()


def test_b03_venta_que_baja_del_minimo_crea_alerta(client, auth_vendedor, datos):
    _venta(client, auth_vendedor, "uuid-b03", "PINT-001", 1)
    assert _stock(datos["db"], datos["pintura"].id) == 10

    alertas = _alertas_producto(datos["db"], datos["pintura"].id)
    assert alertas, "Debio crearse una alerta"
    pendientes = [a for a in alertas if a.estado == "pendiente"]
    assert pendientes
    assert pendientes[0].stock_al_generar == 10


def test_b04_entrada_sube_stock_y_cierra_alerta(client, auth_vendedor, auth_admin, datos):
    _venta(client, auth_vendedor, "uuid-b04", "PINT-001", 1)

    respuesta = client.post(
        "/entradas",
        headers=auth_admin,
        json={
            "producto_id": datos["pintura"].id,
            "cantidad": 20,
            "costo_unitario": 8.00,
            "proveedor_id": datos["proveedor"].id,
        },
    )
    assert respuesta.status_code == 201
    assert _stock(datos["db"], datos["pintura"].id) == 30

    alertas = _alertas_producto(datos["db"], datos["pintura"].id)
    atendida = [a for a in alertas if a.estado == "atendida"]
    assert atendida, "La entrada debio cerrar la alerta"
    assert atendida[0].atendida_por == datos["admin"].id


def test_b14_alerta_sin_historial_queda_en_confianza_baja(client, auth_vendedor, datos):
    # Cemento no tiene ventas previas y ya esta bajo el minimo.
    _venta(client, auth_vendedor, "uuid-b14", "CEM-001", 1)

    alertas = _alertas_producto(datos["db"], datos["cemento"].id)
    assert alertas
    assert alertas[0].confianza == "baja"
    assert alertas[0].estado == "pendiente"


def test_alerta_con_sugerencia_baja_usando_minimo(client, auth_vendedor, datos):
    _venta(client, auth_vendedor, "uuid-b14b", "CEM-001", 1)
    alertas = _alertas_producto(datos["db"], datos["cemento"].id)
    minimo = datos["cemento"].stock_minimo
    stock = _stock(datos["db"], datos["cemento"].id)
    assert alertas[0].cantidad_sugerida == max(0, minimo * 2 - stock)


def test_atender_alerta_manual_marca_atendida(client, auth_vendedor, auth_admin, datos):
    _venta(client, auth_vendedor, "uuid-b04m", "PINT-001", 1)
    alertas = _alertas_producto(datos["db"], datos["pintura"].id)
    alerta_id = alertas[0].id

    respuesta = client.post(f"/alertas/{alerta_id}/atender", headers=auth_admin)
    assert respuesta.status_code == 200
    cuerpo = respuesta.json()
    assert cuerpo["redirect"] is True
    assert cuerpo["producto_id"] == datos["pintura"].id
    assert cuerpo["proveedor_id"] == datos["proveedor"].id

    repetida = client.post(f"/alertas/{alerta_id}/atender", headers=auth_admin)
    assert repetida.status_code == 409