# Seguridad

Resumen de los controles de seguridad implementados en `backend/app/security.py`,
`app/errors.py` y los routers.

## Autenticación (JWT)

- Al iniciar sesión (`POST /auth/login`) se emite un **JWT HS256** firmado con
  `SECRET_KEY`.
- **Payload** del token:

| Claim            | Contenido                          |
|------------------|------------------------------------|
| `sub`            | id del usuario (string)            |
| `rol`            | `admin` \| `vendedor`              |
| `nombre_usuario` | nombre de usuario                  |
| `iat`            | emitido en (epoch)                 |
| `exp`            | expira en `iat + TOKEN_EXPIRE_MINUTES*60` |

- **Duración:** `TOKEN_EXPIRE_MINUTES` = **480** minutos (8 h). **No hay refresh
  token**: al expirar, el cliente debe volver a iniciar sesión.
- **Uso:** header `Authorization: Bearer <token>`. La dependencia
  `get_current_user` decodifica el token, ignora usuarios inexistentes o inactivos
  (`activo = false`) y devuelve `401` en cualquier caso inválido.
- **Errores de token:** `Sesion expirada` (firma expirada) o `Token invalido`,
  ambos `401`.

## Contraseñas

- Almacenadas como **hash bcrypt** (`hash_password` / `verify_password`).
- `verify_password` captura `ValueError`/`TypeError` y devuelve `False` ante un
  hash malformado (no lanza excepción).
- Nunca se devuelve `password_hash` en ninguna respuesta.

## Autorización por roles

| Operación | `admin` | `vendedor` |
|-----------|:-------:|:----------:|
| Registrar ventas | sí | sí |
| Ver productos | sí (con `costo`) | sí (**sin** `costo`) |
| Ver sus propias ventas | sí | sí |
| Ver ventas de otros | sí | **no** (`403`) |
| Anular ventas | sí | no (`403`) |
| Productos: crear/editar/desactivar | sí | no (`403`) |
| Proveedores, entradas, alertas, reportes, bitácora | sí | no (`403`) |

- La validación es **del lado del servidor** con `require_role(...)`.
- Un rol insuficiente devuelve `403` y se registra en la bitácora como
  `ACCESO_DENEGADO` (usuario, método y ruta).
- El **vendedor no recibe `costo`** (se filtra en el router de productos), y solo
  puede ver sus propias ventas del día.

## Bloqueo por intentos fallidos

- Se cuentan los fallos por `nombre_usuario` en memoria (`_intentos`).
- Al alcanzar `LOGIN_MAX_INTENTOS` (**5**), la cuenta se bloquea
  `LOGIN_BLOQUEO_MINUTOS` (**15**) minutos y el contador se reinicia.
- Mientras está bloqueada, el login devuelve **`429`**
  ("Demasiados intentos. Intente mas tarde.").
- Un login correcto limpia el contador (`limpiar_intentos`).

> **Limitación:** el estado del bloqueo vive en memoria del proceso. Se pierde al
> reiniciar y **no se comparte** entre múltiples workers/procesos. Para producción
> conviene moverlo a un almacén compartido (Redis o base de datos).

## Otros controles

- **Mensajes genéricos en login:** siempre `Usuario o contrasena incorrectos`, sin
  revelar si el usuario existe.
- **CORS** restringido a `ALLOWED_ORIGINS` (incluye `:3000` del frontend).
- **Bitácora de seguridad:** `LOGIN_OK`, `LOGIN_FAIL` y `ACCESO_DENEGADO`.
- **Errores uniformes** `{error, detalle}`; el `500` no expone trazas al cliente
  más allá del mensaje.
- **`SECRET_KEY`:** por defecto hay un valor de ejemplo; **debe cambiarse** en
  producción (variable de entorno).

## Recomendaciones (fuera del alcance actual)

- Cambiar `SECRET_KEY` por una aleatoria y larga.
- Servir siempre por **HTTPS**.
- Mover el bloqueo de login y (si aplica) la revocación de tokens a un almacén
  compartido.
- Añadir refresh tokens o sesiones revocables si se requiere cierre de sesión real.
- Añadir límite de tasa (rate limiting) por IP.

## Documentos relacionados

- [Referencia de endpoints](./api-endpoints/README.md) (`401`, `403`, `429`)
- [Reglas de negocio](./reglas-negocio.md)
- [Despliegue](./despliegue.md)
