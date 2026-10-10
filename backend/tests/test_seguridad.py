"""Pruebas de seguridad: B-09, B-10 y B-12."""
from sqlalchemy import select

from app.models import Bitacora


def test_b09_vendedor_no_puede_crear_producto(client, auth_vendedor):
    respuesta = client.post(
        "/productos",
        headers=auth_vendedor,
        json={
            "codigo": "XXX-001",
            "nombre": "Producto prohibido",
            "unidad": "unidad",
            "precio_venta": 10,
            "costo": 5,
        },
    )
    assert respuesta.status_code == 403
    assert "error" in respuesta.json()


def test_b09_vendedor_no_puede_borrar_producto(client, auth_vendedor, datos):
    respuesta = client.delete(f"/productos/{datos['tornillo'].id}", headers=auth_vendedor)
    assert respuesta.status_code == 403


def test_b10_vendedor_no_puede_ver_bitacora(client, auth_vendedor):
    respuesta = client.get("/bitacora", headers=auth_vendedor)
    assert respuesta.status_code == 403
    assert "error" in respuesta.json()


def test_b10_vendedor_no_puede_ver_reporte(client, auth_vendedor):
    respuesta = client.get("/reportes/resumen", headers=auth_vendedor)
    assert respuesta.status_code == 403


def test_b12_vendedor_no_recibe_costo_en_lista(client, auth_vendedor):
    respuesta = client.get("/productos", headers=auth_vendedor)
    assert respuesta.status_code == 200
    productos = respuesta.json()
    assert isinstance(productos, list) and productos
    assert all("costo" not in producto for producto in productos)


def test_b12_vendedor_no_recibe_costo_en_detalle(client, auth_vendedor, datos):
    respuesta = client.get(f"/productos/{datos['tornillo'].id}", headers=auth_vendedor)
    assert respuesta.status_code == 200
    assert "costo" not in respuesta.json()


def test_b12_admin_si_recibe_costo(client, auth_admin):
    respuesta = client.get("/productos", headers=auth_admin)
    assert respuesta.status_code == 200
    assert any("costo" in producto for producto in respuesta.json())


def test_acceso_denegado_queda_en_bitacora(client, auth_vendedor, datos):
    client.get("/bitacora", headers=auth_vendedor)
    registros = datos["db"].scalars(
        select(Bitacora).where(Bitacora.accion == "ACCESO_DENEGADO")
    ).all()
    assert registros, "El 403 debio registrarse en la bitacora"