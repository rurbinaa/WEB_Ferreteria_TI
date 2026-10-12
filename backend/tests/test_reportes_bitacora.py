"""Pruebas de reportes y trazabilidad: B-15."""
from sqlalchemy import select

from app.models import Bitacora


def test_b15_operaciones_importantes_quedan_en_bitacora(client, auth_vendedor, auth_admin, datos):
    client.post("/auth/login", json={"nombre_usuario": "admin", "password": "admin123"})
    client.post(
        "/ventas",
        headers=auth_vendedor,
        json={
            "client_uuid": "uuid-b15",
            "items": [{"producto_codigo": "TORN-001", "cantidad": 2}],
        },
    )
    client.post(
        "/entradas",
        headers=auth_admin,
        json={
            "producto_id": datos["tornillo"].id,
            "cantidad": 50,
            "costo_unitario": 1.00,
            "proveedor_id": datos["proveedor"].id,
        },
    )

    respuesta = client.get("/bitacora", headers=auth_admin)
    assert respuesta.status_code == 200
    acciones = [registro["accion"] for registro in respuesta.json()]
    assert "LOGIN_OK" in acciones
    assert "VENTA_CREADA" in acciones
    assert "ENTRADA_REGISTRADA" in acciones


def test_b15_bitacora_no_se_puede_editar_ni_borrar(client, auth_admin):
    editar = client.put("/bitacora/1", headers=auth_admin, json={})
    assert editar.status_code == 404 or editar.status_code == 405
    borrar = client.delete("/bitacora/1", headers=auth_admin)
    assert borrar.status_code == 404 or borrar.status_code == 405


def test_bitacora_filtra_por_accion(client, auth_vendedor, auth_admin):
    client.post(
        "/ventas",
        headers=auth_vendedor,
        json={
            "client_uuid": "uuid-bf",
            "items": [{"producto_codigo": "TORN-001", "cantidad": 1}],
        },
    )
    resultado = client.get("/bitacora?accion=VENTA_CREADA", headers=auth_admin)
    assert resultado.status_code == 200
    assert resultado.json()
    assert all(registro["accion"] == "VENTA_CREADA" for registro in resultado.json())


def test_reportes_resumen(client, auth_vendedor, auth_admin):
    client.post(
        "/ventas",
        headers=auth_vendedor,
        json={
            "client_uuid": "uuid-resumen",
            "items": [{"producto_codigo": "TORN-001", "cantidad": 3}],
        },
    )
    respuesta = client.get("/reportes/resumen", headers=auth_admin)
    assert respuesta.status_code == 200
    datos_reporte = respuesta.json()
    assert "ventas_hoy" in datos_reporte
    assert datos_reporte["ventas_hoy"]["total"] == 6.00
    assert "alertas_pendientes" in datos_reporte
    assert "productos_agotados" in datos_reporte
    assert "ticket_promedio" in datos_reporte


def test_reportes_ventas_por_dia(client, auth_admin):
    respuesta = client.get("/reportes/ventas-por-dia", headers=auth_admin)
    assert respuesta.status_code == 200
    datos_reporte = respuesta.json()
    assert len(datos_reporte) == 7
    assert all("fecha" in dato and "total" in dato for dato in datos_reporte)
    # El primer dia es el mas antiguo (orden cronologico).
    fechas = [dato["fecha"] for dato in datos_reporte]
    assert fechas == sorted(fechas)


def test_reportes_top_productos(client, auth_vendedor, auth_admin):
    client.post(
        "/ventas",
        headers=auth_vendedor,
        json={
            "client_uuid": "uuid-top",
            "items": [{"producto_codigo": "TORN-001", "cantidad": 4}],
        },
    )
    respuesta = client.get("/reportes/top-productos", headers=auth_admin)
    assert respuesta.status_code == 200
    datos_reporte = respuesta.json()
    assert datos_reporte
    assert datos_reporte[0]["codigo"] == "TORN-001"
    assert datos_reporte[0]["cantidad_vendida"] == 4
    assert "nombre" in datos_reporte[0]


def test_reportes_abc(client, auth_vendedor, auth_admin):
    for i in range(3):
        client.post(
            "/ventas",
            headers=auth_vendedor,
            json={
                "client_uuid": f"uuid-abc-{i}",
                "items": [{"producto_codigo": "TORN-001", "cantidad": 2}],
            },
        )
    respuesta = client.get("/reportes/abc", headers=auth_admin)
    assert respuesta.status_code == 200
    datos_reporte = respuesta.json()
    assert datos_reporte
    assert all(dato["clase"] in ("A", "B", "C") for dato in datos_reporte)
    assert all("porcentaje" in dato and "acumulado" in dato for dato in datos_reporte)


def test_reportes_csv(client, auth_admin):
    respuesta = client.get("/reportes/ventas.csv", headers=auth_admin)
    assert respuesta.status_code == 200
    assert respuesta.headers["content-type"].startswith("text/csv")
    assert "id,fecha,usuario_id,estado,total" in respuesta.text