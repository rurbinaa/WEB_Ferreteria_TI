# Entradas de mercancía

Ambas rutas son **solo admin**. Registrar una entrada **sube el stock**, actualiza
el `costo` del producto y cierra la alerta pendiente si se superó el mínimo
(ver [reglas de negocio](../reglas-negocio.md)).

## `GET /entradas`

Lista entradas de mercancía, más recientes primero.

- **200 — Lista de entradas.** Cada ítem:

| Campo            | Tipo    | Notas                              |
|------------------|---------|------------------------------------|
| `id`             | int     |                                    |
| `fecha`          | string  | ISO UTC                            |
| `proveedor_id`   | int?    |                                    |
| `producto_id`    | int     |                                    |
| `cantidad`       | float   |                                    |
| `costo_unitario` | float   |                                    |
| `usuario_id`     | int     | quién la registró                  |
| `proveedor`      | object? | `{ id, nombre }`                   |
| `producto`       | object? | `{ id, codigo, nombre }`           |

## `POST /entradas`

Registra una entrada de mercancía. → `201`

- **Cuerpo (JSON):**

| Campo            | Tipo   | Requerido | Notas                       |
|------------------|--------|-----------|-----------------------------|
| `producto_id`    | int    | sí        | debe existir y estar activo |
| `cantidad`       | float  | sí        | `> 0`                       |
| `costo_unitario` | float  | sí        | `> 0`                       |
| `proveedor_id`   | int?   | no        | si se envía, debe existir   |

- **201 — Entrada creada** (mismo esquema que la lista).
- **Errores:** `404` producto o proveedor no encontrado, `409` producto inactivo,
  `422` datos inválidos.

## Ejemplo

```bash
curl -s -X POST http://localhost:8000/entradas \
  -H "Authorization: Bearer <token_admin>" \
  -H "Content-Type: application/json" \
  -d '{"producto_id":1,"proveedor_id":1,"cantidad":60,"costo_unitario":0.25}'
```
