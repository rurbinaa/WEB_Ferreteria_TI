"""Pruebas B-01 (login) y B-11 (sin token)."""


def test_b01_login_correcto_devuelve_token(client, datos):
    respuesta = client.post("/auth/login", json={"nombre_usuario": "admin", "password": "admin123"})
    assert respuesta.status_code == 200
    cuerpo = respuesta.json()
    assert "access_token" in cuerpo
    assert cuerpo["access_token"]
    assert cuerpo.get("token_type") == "bearer"


def test_b01_login_vendedor_tambien_devuelve_token(client, datos):
    respuesta = client.post(
        "/auth/login",
        json={"nombre_usuario": "vendedor", "password": "vendedor123"},
    )
    assert respuesta.status_code == 200
    assert "access_token" in respuesta.json()


def test_b01_login_incorrecto_error_generico(client):
    respuesta = client.post(
        "/auth/login",
        json={"nombre_usuario": "admin", "password": "clave-incorrecta"},
    )
    assert respuesta.status_code == 401
    assert "error" in respuesta.json()


def test_auth_me_devuelve_usuario(client, auth_admin):
    respuesta = client.get("/auth/me", headers=auth_admin)
    assert respuesta.status_code == 200
    usuario = respuesta.json()
    assert usuario["nombre_usuario"] == "admin"
    assert usuario["rol"] == "admin"
    assert "password" not in usuario and "password_hash" not in usuario


def test_b11_sin_token_devuelve_401(client):
    respuesta = client.get("/productos")
    assert respuesta.status_code == 401
    assert "error" in respuesta.json()
    assert "detalle" in respuesta.json()