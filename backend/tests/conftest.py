"""Fixtures compartidos de las pruebas (base de datos en memoria)."""
import os
import pathlib
import tempfile

# Usa una BD temporal en disco para el motor real de la app y evita
# tocar la base de datos de desarrollo.
_tmp_db = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
_tmp_db.close()
os.environ["DATABASE_URL"] = "sqlite:///" + pathlib.Path(_tmp_db.name).as_posix().replace("\\", "/")

from datetime import timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.main import app
from app.models import Producto, Proveedor, Usuario
from app.security import crear_token, hash_password
from app.utils import ahora_utc


@pytest.fixture()
def session_factory():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    Factory = sessionmaker(bind=engine, autoflush=False, autocommit=False, expire_on_commit=False)
    yield Factory
    Base.metadata.drop_all(bind=engine)
    engine.dispose()


@pytest.fixture()
def client(session_factory):
    def override_get_db():
        db = session_factory()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture()
def datos(session_factory):
    """Usuarios, un proveedor y productos de prueba."""
    db = session_factory()

    admin = Usuario(
        nombre_usuario="admin",
        nombre_completo="Administrador",
        rol="admin",
        password_hash=hash_password("admin123"),
        activo=True,
    )
    vendedor = Usuario(
        nombre_usuario="vendedor",
        nombre_completo="Juan Perez",
        rol="vendedor",
        password_hash=hash_password("vendedor123"),
        activo=True,
    )
    db.add_all([admin, vendedor])
    db.commit()

    proveedor = Proveedor(
        nombre="Ferreteria Central",
        telefono="2222-1111",
        correo="ventas@ferrecentral.com",
        dias_entrega=3,
        activo=True,
    )
    db.add(proveedor)
    db.commit()

    tornillo = Producto(
        codigo="TORN-001",
        nombre="Tornillo 1/4 x 1",
        categoria="Tornilleria",
        unidad="unidad",
        precio_venta=2.00,
        costo=1.00,
        stock_actual=50,
        stock_minimo=10,
        proveedor_id=proveedor.id,
        activo=True,
    )
    # Justo por encima del minimo: vender 1 dispara la alerta.
    pintura = Producto(
        codigo="PINT-001",
        nombre="Pintura blanca 1L",
        categoria="Pinturas",
        unidad="litro",
        precio_venta=15.00,
        costo=8.00,
        stock_actual=11,
        stock_minimo=10,
        proveedor_id=proveedor.id,
        activo=True,
    )
    # Sin ventas previas y con stock bajo: alerta de confianza baja.
    cemento = Producto(
        codigo="CEM-001",
        nombre="Cemento 42.5kg",
        categoria="Construccion",
        unidad="bolsa",
        precio_venta=8.90,
        costo=5.50,
        stock_actual=3,
        stock_minimo=10,
        proveedor_id=proveedor.id,
        activo=True,
    )
    db.add_all([tornillo, pintura, cemento])
    db.commit()

    for producto in (tornillo, pintura, cemento):
        db.refresh(producto)

    return {
        "db": db,
        "admin": admin,
        "vendedor": vendedor,
        "proveedor": proveedor,
        "tornillo": tornillo,
        "pintura": pintura,
        "cemento": cemento,
    }


@pytest.fixture()
def admin_token(datos):
    return crear_token(datos["admin"])


@pytest.fixture()
def vendedor_token(datos):
    return crear_token(datos["vendedor"])


@pytest.fixture()
def auth_admin(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


@pytest.fixture()
def auth_vendedor(vendedor_token):
    return {"Authorization": f"Bearer {vendedor_token}"}


@pytest.fixture()
def hace():
    """Utilidades de tiempo para fechas de pruebas."""
    return {"ahora": ahora_utc, "dia": ahora_utc().date().isoformat(), "ayer": (ahora_utc() - timedelta(days=1)).date().isoformat()}