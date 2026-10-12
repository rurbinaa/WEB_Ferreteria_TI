# Alertas de reposición

Ambas rutas son **solo admin**. Las alertas son recomendaciones del sistema; nunca
generan compras por sí solas (ver [reglas de negocio](../reglas-negocio.md)).

## `GET /alertas`

Lista alertas, más recientes primero.

- **Query params:**

| Param      | Tipo   | Notas                                 |
|------------|--------|---------------------------------------|
| `producto` | string | Filtra por nombre de producto (contiene) |
| `estado`   | enum   | `pendiente` \| `atendida`             |

- **200 — Lista de alertas.** Cada ítem:

| Campo              | Tipo    | Notas                                        |
|--------------------|---------|----------------------------------------------|
| `id`               | int     |                                              |
| `producto_id`      | int     |                                              |
| `fecha_creada`     | string  | ISO UTC                                      |
| `stock_al_generar` | float   | stock que había al crear la alerta           |
| `cantidad_sugerida`| float   | unidades recomendadas a reponer              |
| `confianza`        | string  | `normal` \| `baja`                           |
| `estado`           | string  | `pendiente` \| `atendida`                    |
| `fecha_atendida`   | string? | ISO UTC                                      |
| `atendida_por`     | int?    | usuario que la atendió                       |
| `producto`         | object? | `{ id, codigo, nombre, stock_minimo, proveedor: {id,nombre}? }` |

## `POST /alertas/{alerta_id}/atender`

Marca una alerta como atendida manualmente. → `200`

- **200 — Instrucción de redirección al formulario de entrada:**

| Campo              | Tipo   | Notas                          |
|--------------------|--------|--------------------------------|
| `redirect`         | bool   | siempre `true`                 |
| `alerta_id`        | int    |                                |
| `producto_id`      | int    |                                |
| `proveedor_id`     | int?   | proveedor sugerido             |
| `cantidad_sugerida`| float  |                                |

- **Errores:** `404` alerta no encontrada, `409` la alerta ya estaba atendida.

> Nota: atender una alerta manualmente **no** modifica el stock. El stock se
> actualiza al registrar una **entrada** ([entradas](./entradas.md)).

## Ejemplo

```bash
curl -s http://localhost:8000/alertas?estado=pendiente \
  -H "Authorization: Bearer <token_admin>"

curl -s -X POST http://localhost:8000/alertas/1/atender \
  -H "Authorization: Bearer <token_admin>"
```
