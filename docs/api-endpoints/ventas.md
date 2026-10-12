# Ventas

## `POST /ventas`

Registra una venta. **Requiere token** (admin o vendedor). → `201`

- **Cuerpo (JSON):**

| Campo        | Tipo   | Requerido | Notas                                        |
|--------------|--------|-----------|----------------------------------------------|
| `client_uuid`| string | sí        | identificador único del cliente (idempotencia)|
| `items`      | array  | sí        | mín. 1 ítem                                  |
| `items[].producto_codigo` | string | sí | código del producto               |
| `items[].cantidad`        | int    | sí | `> 0`                             |
| `items[].precio_unitario` | float  | no | **se ignora**: el servidor recalcula |

```json
{
  "client_uuid": "9f1c2e40-3b7a-4c1d-8a2b-1a2b3c4d5e6f",
  "items": [{ "producto_codigo": "MART-001", "cantidad": 2 }]
}
```

**Comportamiento:**

- **Idempotencia:** si `client_uuid` ya existe, devuelve la venta existente sin
  volver a descontar stock (no lanza error).
- Limpia y agrupa cantidades por producto, valida stock y estado `activo`, descuenta
  stock y calcula `subtotal`/`total` con el `precio_venta` del servidor.
- Tras la venta evalúa la [regla de alertas](../reglas-negocio.md) por cada producto.
- Todo es transaccional: si algo falla, se revierte la venta y se registra en bitácora.

- **201 — Venta creada** (`VentaOut`):

| Campo             | Tipo    | Notas                                    |
|-------------------|---------|------------------------------------------|
| `id`              | int     |                                          |
| `client_uuid`     | string  |                                          |
| `fecha`           | string  | ISO UTC                                  |
| `usuario_id`      | int     |                                          |
| `total`           | float   | recalculado por el servidor              |
| `estado`          | string  | `completada` \| `anulada`                |
| `motivo_anulacion`| string? |                                          |
| `anulada_por`     | int?    |                                          |
| `detalle_venta`   | array   | `producto_id`, `producto_codigo`, `producto_nombre`, `cantidad`, `precio_unitario`, `subtotal` |

- **Errores:** `404` producto no encontrado, `409` producto inactivo o stock
  insuficiente, `422` datos inválidos.

## `GET /ventas`

Lista ventas. **Requiere token.**

- **admin:** todas las ventas.
- **vendedor:** solo las ventas propias **del día actual (UTC, desde 00:00)**.

- **200 — Lista de ventas** (esquema `VentaOut`).

## `GET /ventas/{venta_id}`

Obtiene una venta. **Requiere token.**

- **admin:** cualquier venta.
- **vendedor:** solo las propias (si no, `403` y queda en bitácora).

- **Errores:** `403` venta ajena (vendedor), `404`.

## `POST /ventas/{venta_id}/anular`

Anula una venta y **devuelve el stock** de cada producto. **Solo admin.**

- **Cuerpo (JSON):**

| Campo    | Tipo   | Requerido | Notas      |
|----------|--------|-----------|------------|
| `motivo` | string | sí        | máx. 300   |

- **200 — Venta** con `estado: "anulada"`, `motivo_anulacion` y `anulada_por`.
- **Errores:** `403`, `404`, `409` la venta ya estaba anulada.

## Ejemplo

```bash
curl -s -X POST http://localhost:8000/ventas \
  -H "Authorization: Bearer <token_vendedor>" \
  -H "Content-Type: application/json" \
  -d '{"client_uuid":"4b7f0c1a-1e2d-4a5b-8c9d-001122334455","items":[{"producto_codigo":"TORN-001","cantidad":3}]}'
```
