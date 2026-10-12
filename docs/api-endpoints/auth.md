# Autenticación

## `POST /auth/login`

Inicia sesión y devuelve un token JWT. **Público.**

- **Cuerpo (JSON):**

| Campo            | Tipo   | Requerido | Notas                          |
|------------------|--------|-----------|--------------------------------|
| `nombre_usuario` | string | sí        | mín. 1 caracter                |
| `password`       | string | sí        | mín. 1 caracter                |

```json
{ "nombre_usuario": "admin", "password": "admin123" }
```

- **200 — Token:**

| Campo          | Tipo   | Notas             |
|----------------|--------|-------------------|
| `access_token` | string | JWT HS256         |
| `token_type`   | string | siempre `bearer`  |

```json
{ "access_token": "eyJhbGciOi...", "token_type": "bearer" }
```

- **Errores:** `401` credenciales inválidas (mensaje genérico: no revela si el
  usuario existe), `422` datos inválidos, `429` cuenta bloqueada temporalmente
  por demasiados intentos (ver [seguridad](../seguridad.md)).

Registra en bitácora `LOGIN_OK` o `LOGIN_FAIL`.

## `GET /auth/me`

Devuelve el usuario autenticado. Requiere token.

- **200 — Usuario:**

| Campo             | Tipo    | Notas                    |
|-------------------|---------|--------------------------|
| `id`              | int     |                          |
| `nombre_usuario`  | string  |                          |
| `nombre_completo` | string  |                          |
| `rol`             | string  | `admin` \| `vendedor`    |
| `activo`          | boolean |                          |

- **Errores:** `401` no autenticado / token inválido o expirado.

## Ejemplo

```bash
# 1) Login
curl -s -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"nombre_usuario":"admin","password":"admin123"}'

# 2) Usar el token
curl -s http://localhost:8000/auth/me \
  -H "Authorization: Bearer <access_token>"
```
