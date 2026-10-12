# Bitácora

Solo lectura y **solo admin**. No existen endpoints para editar ni borrar registros;
toda la bitácora se escribe desde `app/services/bitacora.py`.

## `GET /bitacora`

Lista registros de bitácora, más recientes primero.

- **Query params:**

| Param    | Tipo   | Notas                                             |
|----------|--------|---------------------------------------------------|
| `usuario`| string | Filtra por `usuario_nombre` (contiene)            |
| `accion` | string | Coincidencia exacta (p. ej. `VENTA_CREADA`)       |
| `fecha`  | string | Fecha `YYYY-MM-DD` (día completo, UTC)            |
| `limite` | int    | 1..1000, por defecto `200`                        |

- **200 — Lista de registros.** Cada ítem:

| Campo           | Tipo    | Notas                                                            |
|-----------------|---------|------------------------------------------------------------------|
| `id`            | int     |                                                                  |
| `fecha`         | string  | ISO UTC                                                          |
| `usuario_id`    | int?    |                                                                  |
| `usuario_nombre`| string? | nombre completo si el usuario existe, o el nombre enviado        |
| `accion`        | string  | p. ej. `LOGIN_OK`, `VENTA_CREADA`, `ALERTA_GENERADA`, `ACCESO_DENEGADO` |
| `entidad`       | string? | `producto`, `venta`, `alerta`, `endpoint`, ...                   |
| `entidad_id`    | string? | id del recurso afectado                                          |
| `resultado`     | string  | `ok` \| `error`                                                  |
| `detalle`       | string? | descripción libre                                                |

## Acciones registradas

| Acción | Cuándo |
|--------|--------|
| `LOGIN_OK` / `LOGIN_FAIL` | Inicio de sesión exitoso o fallido. |
| `ACCESO_DENEGADO` | Rol sin permiso para una ruta. |
| `PRODUCTO_CREADO` / `PRODUCTO_EDITADO` / `PRODUCTO_DESACTIVADO` | Gestión de productos. |
| `PROVEEDOR_CREADO` / `PROVEEDOR_EDITADO` | Gestión de proveedores. |
| `VENTA_CREADA` / `VENTA_ANULADA` | Ventas. |
| `ENTRADA_REGISTRADA` | Entradas de mercancía. |
| `ALERTA_GENERADA` / `ALERTA_ATENDIDA` | Ciclo de vida de alertas. |

## Ejemplo

```bash
curl -s "http://localhost:8000/bitacora?accion=VENTA_CREADA&limite=50" \
  -H "Authorization: Bearer <token_admin>"
```
