"""Seed reproducible para la demo (random.seed(42)).

Crea usuarios de prueba, proveedores, ~35 productos y ~60 dias de ventas.
Deja 4 productos justo por encima del minimo para que una sola venta
dispare la alerta de reposicion.
"""
import random
import sys
from datetime import timedelta
from pathlib import Path
from uuid import UUID

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.config import settings  # noqa: E402
from app.database import Base, SessionLocal, engine  # noqa: E402
from app.models import (  # noqa: E402
    DetalleVenta,
    EntradaMercancia,
    Producto,
    Proveedor,
    Usuario,
    Venta,
)
from app.security import hash_password  # noqa: E402
from app.utils import ahora_utc  # noqa: E402

PROVEEDORES = [
    {"nombre": "Ferreteria Central", "telefono": "2222-1111", "correo": "ventas@ferrecentral.com", "dias_entrega": 3},
    {"nombre": "Tuberias del Norte", "telefono": "2222-2222", "correo": "pedidos@tubnorte.com", "dias_entrega": 5},
    {"nombre": "Pinturas Premium", "telefono": "2222-3333", "correo": "comercial@pintpremium.com", "dias_entrega": 7},
    {"nombre": "Materiales Basicos S.A.", "telefono": "2222-4444", "correo": "ventas@matbasicos.com", "dias_entrega": 2},
    {"nombre": "Herramientas Pro", "telefono": "2222-5555", "correo": "pedidos@herrpro.com", "dias_entrega": 10},
]

# (codigo, nombre, categoria, unidad, precio_venta, costo, stock_minimo, proveedor_idx, stock_inicial)
PRODUCTOS = [
    ("TORN-001", 'Tornillo 1/4" x 1"', "Tornilleria", "unidad", 0.50, 0.25, 20, 0, 500),
    ("TORN-002", 'Tornillo 3/8" x 2"', "Tornilleria", "unidad", 0.80, 0.40, 15, 0, 400),
    ("TORN-003", 'Tornillo 1/2" x 3"', "Tornilleria", "unidad", 1.20, 0.60, 10, 0, 300),
    ("CLAV-001", 'Clavo 2"', "Tornilleria", "kg", 4.50, 2.20, 10, 0, 200),
    ("CLAV-002", 'Clavo 3"', "Tornilleria", "kg", 5.20, 2.60, 8, 0, 150),
    ("CLAV-003", "Clavo para concreto 1\"", "Tornilleria", "kg", 6.00, 3.00, 8, 0, 120),
    ("CEM-001", "Cemento 42.5kg", "Construccion", "bolsa", 8.90, 5.50, 10, 3, 200),
    ("CEM-002", "Cemento gris especial 42.5kg", "Construccion", "bolsa", 9.50, 6.00, 10, 3, 150),
    ("CAL-001", "Cal 25kg", "Construccion", "bolsa", 6.20, 3.80, 5, 3, 100),
    ("ARE-001", "Arena gruesa por viaje", "Construccion", "viaje", 55.00, 38.00, 2, 3, 20),
    ("BLO-001", "Block hueco 40x20x15", "Construccion", "unidad", 4.80, 3.10, 30, 3, 400),
    ("PVC-001", "Tubo PVC 1/2\"", "Plomeria", "metro", 2.30, 1.20, 10, 1, 300),
    ("PVC-002", "Tubo PVC 3/4\"", "Plomeria", "metro", 3.50, 1.80, 8, 1, 250),
    ("PVC-003", "Tubo PVC 1\"", "Plomeria", "metro", 5.10, 2.60, 8, 1, 200),
    ("CODO-001", 'Codo PVC 1/2"', "Plomeria", "unidad", 1.10, 0.50, 15, 1, 350),
    ("CODO-002", 'Codo PVC 3/4"', "Plomeria", "unidad", 1.50, 0.75, 15, 1, 300),
    ("SIF-001", 'Sifon lavadero 1"', "Plomeria", "unidad", 7.50, 4.20, 5, 1, 80),
    ("VAL-001", 'Valvula esferica 1/2"', "Plomeria", "unidad", 12.00, 7.00, 6, 1, 60),
    ("PINT-001", "Pintura blanca 1L", "Pinturas", "litro", 15.00, 8.50, 5, 2, 100),
    ("PINT-002", "Pintura roja 1L", "Pinturas", "litro", 16.50, 9.00, 5, 2, 90),
    ("PINT-003", "Pintura esmalte azul 1L", "Pinturas", "litro", 17.00, 9.50, 5, 2, 80),
    ("THIN-001", "Thiner 1L", "Pinturas", "litro", 6.80, 3.90, 6, 2, 120),
    ("BRO-001", "Brocha 2\"", "Pinturas", "unidad", 3.20, 1.60, 10, 2, 150),
    ("ROLL-001", "Rodillo 9\" con mango", "Pinturas", "unidad", 9.90, 5.20, 8, 2, 100),
    ("MART-001", "Martillo 500g", "Herramientas", "unidad", 12.00, 6.50, 3, 4, 60),
    ("DEST-001", 'Desarmador plano 6"', "Herramientas", "unidad", 4.50, 2.30, 5, 4, 80),
    ("DEST-002", 'Desarmador cruz 6"', "Herramientas", "unidad", 4.80, 2.45, 5, 4, 80),
    ("LLAV-001", "Llave ajustable 10\"", "Herramientas", "unidad", 18.00, 10.50, 4, 4, 60),
    ("PIN-001", "Pinzas de presion", "Herramientas", "unidad", 14.50, 8.00, 4, 4, 50),
    ("SER-001", "Serrucho 16\"", "Herramientas", "unidad", 22.00, 13.00, 4, 4, 40),
    ("CAV-001", "Cinta aislante negra", "Electricidad", "unidad", 2.50, 1.30, 10, 0, 200),
    ("SWI-001", "Apagador sencillo", "Electricidad", "unidad", 6.20, 3.40, 8, 0, 120),
    ("TOM-001", "Contacto doble", "Electricidad", "unidad", 8.40, 4.60, 8, 0, 120),
    ("ALM-001", "Alambre calibre 12", "Electricidad", "metro", 1.10, 0.55, 20, 0, 500),
    ("FOC-001", "Foco LED 9W", "Electricidad", "unidad", 5.80, 3.10, 10, 0, 150),
    ("SOL-001", "Soldadura electrodo 1/8\"", "Electricidad", "kg", 9.20, 5.30, 8, 0, 100),
]

# Productos que quedan justo por encima del minimo para disparar alerta
# con una sola venta durante la demo.
ESPECIALES = {"TORN-001", "CEM-001", "PINT-002", "PVC-001"}

DIAS_DE_VENTAS = 60


def _uuid() -> str:
    return str(UUID(int=random.getrandbits(128)))


def run() -> None:
    random.seed(42)

    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        admin = Usuario(
            nombre_usuario="admin",
            nombre_completo="Administrador",
            rol="admin",
            password_hash=hash_password(settings.SEED_ADMIN_PASSWORD),
            activo=True,
        )
        vendedor = Usuario(
            nombre_usuario="vendedor",
            nombre_completo="Juan Perez",
            rol="vendedor",
            password_hash=hash_password(settings.SEED_VENDEDOR_PASSWORD),
            activo=True,
        )
        db.add_all([admin, vendedor])
        db.flush()

        proveedores = [Proveedor(**datos) for datos in PROVEEDORES]
        db.add_all(proveedores)
        db.flush()

        productos = [
            Producto(
                codigo=codigo,
                nombre=nombre,
                categoria=categoria,
                unidad=unidad,
                precio_venta=precio,
                costo=costo,
                stock_minimo=minimo,
                proveedor_id=proveedores[idx].id,
                stock_actual=stock_inicial,
                activo=True,
            )
            for codigo, nombre, categoria, unidad, precio, costo, minimo, idx, stock_inicial in PRODUCTOS
        ]
        db.add_all(productos)
        db.flush()

        vendido = {producto.codigo: 0 for producto in productos}

        hoy = ahora_utc()
        for dia in range(DIAS_DE_VENTAS):
            fecha = hoy - timedelta(days=DIAS_DE_VENTAS - 1 - dia)
            if fecha > hoy:
                fecha = hoy

            for _ in range(random.randint(2, 6)):
                seleccion = random.sample(productos, random.randint(1, 4))
                venta = Venta(
                    client_uuid=_uuid(),
                    fecha=fecha,
                    usuario_id=random.choice([admin.id, vendedor.id, vendedor.id]),
                    estado="completada",
                    total=0.0,
                )
                total = 0.0
                for producto in seleccion:
                    cantidad = random.randint(1, max(1, int(producto.stock_minimo * 2)))
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
                    vendido[producto.codigo] += cantidad
                venta.total = round(total, 2)
                db.add(venta)

            if random.random() < 0.35:
                producto = random.choice(productos)
                cantidad = random.randint(int(producto.stock_minimo) * 2, int(producto.stock_minimo) * 6)
                db.add(
                    EntradaMercancia(
                        fecha=fecha,
                        proveedor_id=producto.proveedor_id,
                        producto_id=producto.id,
                        cantidad=cantidad,
                        costo_unitario=producto.costo,
                        usuario_id=admin.id,
                    )
                )

        for producto in productos:
            sobrante = producto.stock_actual - vendido[producto.codigo]
            if producto.codigo in ESPECIALES:
                # Queda justo por encima del minimo: una venta dispara la alerta.
                producto.stock_actual = producto.stock_minimo + 1
            else:
                producto.stock_actual = max(sobrante, 2)

        db.commit()

        print("Seed completado:")
        print(f"  Proveedores: {len(proveedores)}")
        print(f"  Productos:   {len(productos)}")
        print(f"  Ventas:      generadas en {DIAS_DE_VENTAS} dias")
        print(f"  Usuarios:    admin / vendedor (claves en .env)")
    except Exception as exc:
        db.rollback()
        raise SystemExit(f"Error durante el seed: {exc}")
    finally:
        db.close()


if __name__ == "__main__":
    run()