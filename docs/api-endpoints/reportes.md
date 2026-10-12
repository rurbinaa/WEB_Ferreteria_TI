# Reportes y analítica

Todas las rutas son **solo admin**.

## `GET /reportes/resumen`

KPIs del dashboard.

- **200:**

| Campo                | Tipo    | Notas                                             |
|----------------------|---------|---------------------------------------------------|
| `ventas_hoy.total`   | float   | total vendido hoy (UTC, estado `completada`)      |
| `ventas_hoy.tendencia`| float? | % vs ayer; `null` si ayer no hubo ventas          |
| `alertas_pendientes` | int     | alertas en estado `pendiente`                     |
| `productos_agotados` | int     | productos activos con `stock_actual <= 0`         |
| `ticket_promedio`    | float   | promedio del `total` de ventas completadas        |

```json
{
  "ventas_hoy": { "total": 578.5, "tendencia": 253.17 },
  "alertas_pendientes": 0,
  "productos_agotados": 0,
  "ticket_promedio": 145.56
}
```

## `GET /reportes/ventas-por-dia`

Total vendido de los **últimos 7 días** (incluye hoy), orden cronológico.
Sin parámetros (ventana fija de 7 días).

- **200:**

```json
[ { "fecha": "2026-10-06", "total": 0.0 }, { "fecha": "2026-10-07", "total": 123.4 } ]
```

## `GET /reportes/top-productos`

**Top 5** productos por cantidad vendida (ventas `completada`). Sin parámetros.

- **200 — cada ítem:** `{ producto_id, codigo, nombre, cantidad_vendida }`.

## `GET /reportes/abc`

Clasificación **ABC** por valor vendido (`suma de subtotales`). Sin parámetros.

- **200 — cada ítem:**

| Campo           | Tipo   | Notas                                             |
|-----------------|--------|---------------------------------------------------|
| `producto_id`   | int    |                                                   |
| `codigo`        | string |                                                   |
| `nombre`        | string |                                                   |
| `valor_vendido` | float  |                                                   |
| `porcentaje`    | float  | % del valor total                                 |
| `acumulado`     | float  | % acumulado (orden desc. por valor)              |
| `clase`         | string | `A` (acum \<=80%), `B` (acum \<=95%), `C` (resto) |

## `GET /reportes/ventas.csv`

Exporta todas las ventas en CSV. Responde `text/csv` con cabecera
`Content-Disposition: attachment; filename=ventas.csv`.

- **Columnas:** `id, fecha, usuario_id, estado, total, motivo_anulacion`.

## Ejemplo

```bash
curl -s http://localhost:8000/reportes/resumen \
  -H "Authorization: Bearer <token_admin>"

curl -s -OJ http://localhost:8000/reportes/ventas.csv \
  -H "Authorization: Bearer <token_admin>"
```
