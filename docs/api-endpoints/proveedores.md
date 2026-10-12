# Proveedores

Todas las rutas de proveedores son **solo admin**.

## `GET /proveedores`

Lista proveedores ordenados por `nombre`.

- **200 — Lista de proveedores.** Cada ítem:

| Campo          | Tipo    | Notas |
|----------------|---------|-------|
| `id`           | int     |       |
| `nombre`       | string  |       |
| `telefono`     | string? |       |
| `correo`       | string? |       |
| `dias_entrega` | int     |       |
| `activo`       | boolean |       |

## `GET /proveedores/{proveedor_id}`

Obtiene un proveedor por id.

- **Errores:** `404` proveedor no encontrado.

## `POST /proveedores`

Crea un proveedor. → `201`

- **Cuerpo (JSON):**

| Campo          | Tipo    | Requerido | Notas                   |
|----------------|---------|-----------|-------------------------|
| `nombre`       | string  | sí        | único (por nombre)      |
| `telefono`     | string? | no        |                         |
| `correo`       | string? | no        |                         |
| `dias_entrega` | int     | no        | `>= 0`, por defecto `0` |

- **201 — Proveedor creado.**
- **Errores:** `409` ya existe proveedor con ese nombre, `422`.

## `PUT /proveedores/{proveedor_id}`

Actualiza un proveedor (parcial). Mismos campos, todos opcionales, más `activo`.

- **200 — Proveedor actualizado.**
- **Errores:** `404`, `409` nombre duplicado, `422`.

## Ejemplo

```bash
curl -s -X POST http://localhost:8000/proveedores \
  -H "Authorization: Bearer <token_admin>" \
  -H "Content-Type: application/json" \
  -d '{"nombre":"Ferreteria del Sur","telefono":"2222-9999","correo":"ventas@fersur.com","dias_entrega":4}'
```
