"""Pruebas de ventas: B-02, B-05, B-06, B-07, B-08 y B-13."""
from sqlalchemy import func, select

from app.models import DetalleVenta, Producto, Venta


def _stock(db, producto_id):
    return db.scalar(select(Producto.stock_actual).where(Producto.id == producto_id))


def _crear_venta(client, auth, client_uuid, items):
    return client.post(
        "/ventas",
        headers=auth,
        json={"client_uuid": client_uuid, "items": items},
    )


def test_b02_venta_valida_descuenta_stock_y_calcula_total(client, auth_vendedor, datos):
    respuesta = _crear_venta(
        client, auth_vendedor, "uuid-b02",
        [{"producto_codigo": "TORN-001", "cantidad": 3}],
    )
    assert respuesta.status_code == 201
    venta = respuesta.json()
    assert venta["total"] == 6.00
    assert venta["estado"] == "completada"
    assert venta["detalle_venta"][0]["producto_id"] == datos["tornillo"].id
    assert _stock(datos["db"], datos["tornillo"].id) == 47


def test_b02_el_servidor_ignora_el_precio_del_cliente(client, auth_vendedor, datos):
    respuesta = _crear_venta(
        client, auth_vendedor, "uuid-b02b",
        [{"producto_codigo": "TORN-001", "cantidad": 2, "precio_unitario": 0.01}],
    )
    assert respuesta.status_code == 201
    assert respuesta.json()["total"] == 4.00
    assert respuesta.json()["detalle_venta"][0]["precio_unitario"] == 2.00


def test_b05_cantidad_cero_devuelve_422(client, auth_vendedor):
    respuesta = _crear_venta(
        client, auth_vendedor, "uuid-b05",
        [{"producto_codigo": "TORN-001", "cantidad": 0}],
    )
    assert respuesta.status_code == 422


def test_b05_cantidad_negativa_devuelve_422(client, auth_vendedor):
    respuesta = _crear_venta(
        client, auth_vendedor, "uuid-b05neg",
        [{"producto_codigo": "TORN-001", "cantidad": -3}],
    )
    assert respuesta.status_code == 422


def test_b06_vender_mas_que_el_stock_devuelve_409(client, auth_vendedor, datos):
    respuesta = _crear_venta(
        client, auth_vendedor, "uuid-b06",
        [{"producto_codigo": "TORN-001", "cantidad": 999}],
    )
    assert respuesta.status_code == 409
    assert "error" in respuesta.json()
    assert _stock(datos["db"], datos["tornillo"].id) == 50


def test_b07_producto_inexistente_devuelve_404(client, auth_vendedor):
    respuesta = _crear_venta(
        client, auth_vendedor, "uuid-b07a",
        [{"producto_codigo": "NO-EXISTE", "cantidad": 1}],
    )
    assert respuesta.status_code == 404


def test_b07_producto_inactivo_devuelve_409(client, auth_admin, auth_vendedor, datos):
    client.put(
        f"/productos/{datos['tornillo'].id}",
        headers=auth_admin,
        json={"activo": False},
    )
    respuesta = _crear_venta(
        client, auth_vendedor, "uuid-b07b",
        [{"producto_codigo": "TORN-001", "cantidad": 1}],
    )
    assert respuesta.status_code == 409
    assert _stock(datos["db"], datos["tornillo"].id) == 50


def test_b08_client_uuid_repetido_no_duplica(client, auth_vendedor, datos):
    primera = _crear_venta(
        client, auth_vendedor, "uuid-b08",
        [{"producto_codigo": "TORN-001", "cantidad": 5}],
    )
    assert primera.status_code == 201
    segunda = _crear_venta(
        client, auth_vendedor, "uuid-b08",
        [{"producto_codigo": "TORN-001", "cantidad": 5}],
    )
    assert segunda.status_code in (200, 201)
    assert segunda.json()["id"] == primera.json()["id"]

    cantidad_ventas = datos["db"].scalar(
        select(func.count(Venta.id)).where(Venta.client_uuid == "uuid-b08")
    )
    assert cantidad_ventas == 1
    assert _stock(datos["db"], datos["tornillo"].id) == 45


def test_b13_anular_devuelve_stock_y_repetir_devuelve_409(client, auth_admin, auth_vendedor, datos):
    _crear_venta(
        client, auth_vendedor, "uuid-b13",
        [{"producto_codigo": "TORN-001", "cantidad": 4}],
    )
    assert _stock(datos["db"], datos["tornillo"].id) == 46

    venta_id = datos["db"].scalar(
        select(Venta.id).where(Venta.client_uuid == "uuid-b13")
    )
    anulacion = client.post(
        f"/ventas/{venta_id}/anular", headers=auth_admin, json={"motivo": "Error de caja"}
    )
    assert anulacion.status_code == 200
    assert anulacion.json()["estado"] == "anulada"
    assert _stock(datos["db"], datos["tornillo"].id) == 50

    repetida = client.post(
        f"/ventas/{venta_id}/anular", headers=auth_admin, json={"motivo": "De nuevo"}
    )
    assert repetida.status_code == 409
    assert _stock(datos["db"], datos["tornillo"].id) == 50


def test_b13_anular_exige_motivo(client, auth_admin, datos):
    _crear_venta(
        client, auth_admin, "uuid-b13b",
        [{"producto_codigo": "TORN-001", "cantidad": 1}],
    )
    venta_id = datos["db"].scalar(select(Venta.id).where(Venta.client_uuid == "uuid-b13b"))
    respuesta = client.post(f"/ventas/{venta_id}/anular", headers=auth_admin, json={"motivo": ""})
    assert respuesta.status_code == 422


def test_lista_ventas_vendedor_solo_las_suyas_del_dia(client, auth_vendedor, auth_admin, datos):
    _crear_venta(client, auth_vendedor, "uuid-list-1", [{"producto_codigo": "TORN-001", "cantidad": 1}])
    _crear_venta(client, auth_admin, "uuid-list-2", [{"producto_codigo": "TORN-001", "cantidad": 1}])

    ventas = client.get("/ventas", headers=auth_vendedor)
    assert ventas.status_code == 200
    body = ventas.json()
    assert all(venta["usuario_id"] == datos["vendedor"].id for venta in body)
    assert all(venta["client_uuid"] != "uuid-list-2" for venta in body)

    todas_admin = client.get("/ventas", headers=auth_admin)
    assert todas_admin.status_code == 200
    uuids = [venta["client_uuid"] for venta in todas_admin.json()]
    assert "uuid-list-1" in uuids and "uuid-list-2" in uuids