# Reglas de negocio

Parámetros configurables (`.env` / `app/config.py`):

| Parámetro               | Valor por defecto | Uso |
|-------------------------|-------------------|-----|
| `DIAS_VENTANA`          | `30`              | Ventana de historial para estimar demanda. |
| `DIAS_COBERTURA`        | `7`               | Días de cobertura objetivo al sugerir reposición. |
| `DIAS_HISTORIAL_MINIMO` | `7`               | Días con ventas necesarios para confiar en la estimación. |
| `LOGIN_MAX_INTENTOS`    | `5`               | Intentos fallidos antes de bloquear. |
| `LOGIN_BLOQUEO_MINUTOS` | `15`              | Duración del bloqueo de login. |

## Ventas

- **Idempotencia:** `client_uuid` es único. Si se repite, se devuelve la venta
  existente y **no** se vuelve a descontar stock.
- **Validación (transaccional):** por cada producto -existe, está `activo` y hay
  stock suficiente. Las cantidades se agrupan por producto antes de validar.
- **Cálculo de totales:** el servidor usa `producto.precio_venta` e **ignora** el
  `precio_unitario` que envíe el cliente. `subtotal = round(cantidad * precio_venta, 2)`.
- **Efecto en inventario:** descuenta `cantidad` de `stock_actual` por producto.
- **Post-venta:** evalúa alertas de reposición de los productos vendidos.
- **Anulación (solo admin):** cambia `estado` a `anulada`, guarda motivo y autor,
  **devuelve el stock** de cada línea y re-evalúa alertas. Una venta solo puede
  anularse una vez (`409` si ya estaba anulada).

## Inventario (entradas de mercancía)

- Valida que el producto exista y esté `activo`; valida el proveedor si se indica.
- Suma `cantidad` a `stock_actual` y actualiza `producto.costo = costo_unitario`.
- Después de la entrada, cierra la alerta pendiente si el stock superó el mínimo.

## Alertas de reposición

**Cuándo se genera:** al evaluar un producto cuyo `stock_actual <= stock_minimo`.
Se evalúa tras crear/anular una venta y tras registrar una entrada. No se crea una
nueva alerta si el producto ya tiene una `pendiente`.

**Cantidad sugerida y confianza** (`services/alertas.calcular_sugerencia`), sobre
las ventas `completada` de los últimos `DIAS_VENTANA` (30) días:

- `total_vendido` = suma de `DetalleVenta.cantidad` del producto en la ventana.
- `dias_con_ventas` = días distintos con ventas del producto en la ventana.

Si `total_vendido <= 0` o `dias_con_ventas < DIAS_HISTORIAL_MINIMO` (7):

```
cantidad_sugerida = max(0, stock_minimo * 2 - stock_actual)
confianza         = "baja"
```

En caso contrario (historial suficiente):

```
promedio_diario   = total_vendido / DIAS_VENTANA
objetivo          = ceil(promedio_diario * (dias_entrega + DIAS_COBERTURA))
cantidad_sugerida = max(0, objetivo - stock_actual)
confianza         = "normal"
```

donde `dias_entrega = proveedor.dias_entrega` (o `0` si no tiene proveedor).

**Cierre de alertas:**

- **Automático:** al registrar una entrada que deja `stock_actual > stock_minimo`
  (`estado = "atendida"`, guarda `fecha_atendida` y `atendida_por`).
- **Manual** (`POST /alertas/{id}/atender`): solo marca la alerta como atendida;
  **no** modifica el stock.

**Limitaciones conocidas** (documentadas en el propio servicio): puede fallar con
productos de temporada, compras grandes puntuales y productos nuevos sin historial.
Solo **recomienda**; nunca genera compras por sí sola.

## Reportes

- **`resumen`:** ventas de hoy (UTC) y su tendencia vs ayer (`null` si ayer fue 0),
  alertas pendientes, productos activos agotados y ticket promedio.
- **`ventas-por-dia`:** total por día de los últimos **7 días** (incluye hoy).
- **`top-productos`:** **top 5** por cantidad vendida (ventas completadas).
- **ABC:** ordena productos por valor vendido descendente y clasifica por acumulado:
  - **A:** acumulado `<= 80%`
  - **B:** `> 80%` y `<= 95%`
  - **C:** el resto (>95%)
- **CSV:** exporta todas las ventas (`id, fecha, usuario_id, estado, total, motivo_anulacion`).

## Fechas y zona horaria

Todo el backend trabaja en **UTC sin zona**. Los filtros "de hoy" usan rangos de
`datetime` (`utils.rango_dia`), lo que es portable entre SQLite y Postgres. Esto
implica que "hoy" para el backend puede diferir del día local del usuario
(Nicaragua es UTC-6): una venta de las 20:00 locales es "mañana" en UTC.

## IVA

La API **no** calcula IVA por separado: `precio_venta` es el precio final unitario
y el `total` es la suma de subtotales. Cualquier tasa de IVA debe manejarse fuera
del backend (ver discrepancia en [contrato-api.md](./contrato-api.md)).

## Documentos relacionados

- [Referencia de endpoints](./api-endpoints/README.md)
- [Seguridad](./seguridad.md)
- [Modelo de datos](./modelo-datos.md)
