# Referencia de endpoints

API REST de la ferretería (FastAPI). Referencia de cada ruta: método, parámetros,
cuerpo de la petición, respuesta y roles permitidos.

- **Base URL local:** `http://localhost:8000`
- **Documentación interactiva (Swagger UI):** `/docs`
- **Esquema OpenAPI (JSON):** `/openapi.json`
- **ReDoc:** `/redoc`

> Esta referencia se deriva del OpenAPI real publicado por la aplicación.
> Si el código cambia, la fuente de verdad sigue siendo `/openapi.json`.

## Autenticación

Todas las rutas, salvo `POST /auth/login` y `GET /health`, requieren un token JWT.

```http
Authorization: Bearer <access_token>
```

El token se obtiene en `POST /auth/login` (ver [auth](./auth.md)). Expira en
`TOKEN_EXPIRE_MINUTES` (por defecto 480 minutos = 8 horas). No hay refresh token:
ante un `401` hay que volver a iniciar sesión.

## Roles

| Rol        | Descripción                                                        |
|------------|--------------------------------------------------------------------|
| `admin`    | Acceso total: inventario, proveedores, reportes, bitácora, anular. |
| `vendedor` | Registrar ventas, ver productos (sin `costo`) y consultar sus ventas. |

La validación del rol es siempre del lado del servidor (`require_role`). Un acceso
sin permiso devuelve `403` y queda registrado en la bitácora como `ACCESO_DENEGADO`.

## Formato de errores

Todas las respuestas de error comparten la misma forma:

```json
{ "error": "Mensaje legible", "detalle": null }
```

En errores de validación (`422`) `detalle` es la lista de campos inválidos.

| Código | Significado                                                        |
|--------|--------------------------------------------------------------------|
| `401`  | No autenticado o token inválido/expirado.                          |
| `403`  | Autenticado pero sin rol suficiente.                              |
| `404`  | Recurso no encontrado.                                            |
| `409`  | Conflicto (duplicado, stock insuficiente, estado inválido).       |
| `422`  | Datos inválidos (validación Pydantic).                            |
| `429`  | Demasiados intentos de login (bloqueo temporal).                  |
| `500`  | Error interno.                                                     |

## Convenciones

- **Fechas:** ISO 8601 en **UTC** y sin zona (`2026-10-10T17:49:33`).
- **Montos:** `float` redondeado a 2 decimales; el servidor **recalcula** los totales.
- **Paginación:** no hay paginación genérica; `GET /bitacora` acepta `limite`.
- **Idempotencia:** `POST /ventas` usa `client_uuid` para no duplicar ventas.

## Índice de endpoints

| Método | Ruta                            | Rol                              | Doc                              |
|--------|---------------------------------|----------------------------------|----------------------------------|
| POST   | `/auth/login`                   | público                          | [auth](./auth.md)                |
| GET    | `/auth/me`                      | autenticado                      | [auth](./auth.md)                |
| GET    | `/productos`                    | autenticado (vendedor sin costo) | [productos](./productos.md)      |
| GET    | `/productos/{producto_id}`      | autenticado (vendedor sin costo) | [productos](./productos.md)      |
| POST   | `/productos`                    | admin                            | [productos](./productos.md)      |
| PUT    | `/productos/{producto_id}`      | admin                            | [productos](./productos.md)      |
| DELETE | `/productos/{producto_id}`      | admin                            | [productos](./productos.md)      |
| GET    | `/proveedores`                  | admin                            | [proveedores](./proveedores.md)  |
| GET    | `/proveedores/{proveedor_id}`   | admin                            | [proveedores](./proveedores.md)  |
| POST   | `/proveedores`                  | admin                            | [proveedores](./proveedores.md)  |
| PUT    | `/proveedores/{proveedor_id}`   | admin                            | [proveedores](./proveedores.md)  |
| POST   | `/ventas`                       | autenticado                      | [ventas](./ventas.md)            |
| GET    | `/ventas`                       | autenticado                      | [ventas](./ventas.md)            |
| GET    | `/ventas/{venta_id}`            | autenticado (vendedor: las suyas)| [ventas](./ventas.md)            |
| POST   | `/ventas/{venta_id}/anular`     | admin                            | [ventas](./ventas.md)            |
| GET    | `/entradas`                     | admin                            | [entradas](./entradas.md)        |
| POST   | `/entradas`                     | admin                            | [entradas](./entradas.md)        |
| GET    | `/alertas`                      | admin                            | [alertas](./alertas.md)          |
| POST   | `/alertas/{alerta_id}/atender`  | admin                            | [alertas](./alertas.md)          |
| GET    | `/reportes/resumen`             | admin                            | [reportes](./reportes.md)        |
| GET    | `/reportes/ventas-por-dia`      | admin                            | [reportes](./reportes.md)        |
| GET    | `/reportes/top-productos`       | admin                            | [reportes](./reportes.md)        |
| GET    | `/reportes/abc`                 | admin                            | [reportes](./reportes.md)        |
| GET    | `/reportes/ventas.csv`          | admin                            | [reportes](./reportes.md)        |
| GET    | `/bitacora`                     | admin                            | [bitacora](./bitacora.md)        |
| GET    | `/health`                       | público                          | más abajo                        |

## Health

### `GET /health`

Estado del servicio. Público.

**200**
```json
{ "status": "ok", "app": "Ferreteria API", "version": "1.0.0" }
```

## Documentos relacionados

- [Contrato API frontend ↔ backend](../contrato-api.md)
- [Reglas de negocio](../reglas-negocio.md)
- [Seguridad](../seguridad.md)
