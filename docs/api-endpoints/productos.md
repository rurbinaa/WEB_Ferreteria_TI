# Productos

## `GET /productos`

Lista productos ordenados por `codigo`. **Requiere token.**

Si el usuario es `admin` cada producto incluye `costo`; si es `vendedor`, **no**.

- **Query params:**

| Param      | Tipo   | Notas                                              |
|------------|--------|----------------------------------------------------|
| `q`        | string | Busca por `codigo` o `nombre` (contiene)           |
| `categoria`| string | Coincidencia exacta de categoría                   |
| `stock`    | enum   | `agotado` (\<=0), `bajo` (>0 y \<= mínimo), `ok`   |

- **200 — Lista de productos.** Cada ítem:

| Campo          | Tipo    | Notas                       |
|----------------|---------|-----------------------------|
| `id`           | int     |                             |
| `codigo`       | string  |                             |
| `nombre`       | string  |                             |
| `categoria`    | string? |                             |
| `unidad`       | string  |                             |
| `precio_venta` | float   |                             |
| `stock_actual` | float   |                             |
| `stock_minimo` | float   |                             |
| `proveedor_id` | int?    |                             |
| `activo`       | boolean |                             |
| `costo`        | float   | **solo admin**              |

## `GET /productos/{producto_id}`

Obtiene un producto por id. **Requiere token.** El vendedor no recibe `costo`.

- **Errores:** `404` producto no encontrado.

## `POST /productos`

Crea un producto. **Solo admin.** → `201`

- **Cuerpo (JSON):**

| Campo          | Tipo    | Requerido | Notas                       |
|----------------|---------|-----------|-----------------------------|
| `codigo`       | string  | sí        | único                       |
| `nombre`       | string  | sí        |                             |
| `categoria`    | string? | no        |                             |
| `unidad`       | string  | no        | por defecto `unidad`        |
| `precio_venta` | float   | sí        | `>= 0`                      |
| `costo`        | float   | no        | `>= 0`, por defecto `0`     |
| `stock_actual` | float   | no        | `>= 0`, por defecto `0`     |
| `stock_minimo` | float   | no        | `>= 0`, por defecto `0`     |
| `proveedor_id` | int?    | no        | debe existir                |

- **201 — Producto creado** (mismo esquema que `ProductoOut`, incluye `costo`).
- **Errores:** `403` sin rol admin, `404` proveedor no encontrado,
  `409` código duplicado, `422` datos inválidos.

## `PUT /productos/{producto_id}`

Actualiza un producto (parcial: envía solo los campos a cambiar). **Solo admin.**

- **Cuerpo (JSON):** mismos campos que `ProductoCreate`, todos opcionales, más
  `activo: boolean`.
- **200 — Producto actualizado.**
- **Errores:** `403`, `404`, `409` código duplicado, `422`.
- Si `activo` pasa a `false` la bitácora registra `PRODUCTO_DESACTIVADO`.

## `DELETE /productos/{producto_id}`

**Baja lógica** (`activo = false`). **Solo admin.**

- **200 — Producto** con `activo: false`.
- **Errores:** `403`, `404`.

## Ejemplo

```bash
curl -s -X POST http://localhost:8000/productos \
  -H "Authorization: Bearer <token_admin>" \
  -H "Content-Type: application/json" \
  -d '{"codigo":"MART-002","nombre":"Martillo 750g","precio_venta":14.5,"costo":7.8,"stock_actual":50,"stock_minimo":5,"proveedor_id":5}'
```
