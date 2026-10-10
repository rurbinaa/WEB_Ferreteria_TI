# Ferretería API

API REST (FastAPI + SQLAlchemy 2 + SQLite) para una ferretería. Registra
ventas, controla el stock, genera alertas de reposición y deja bitácora de
cada operación, con dos roles: `admin` y `vendedor`.

Proyecto académico — Tecnologías de la Información (ULSA), Unidad I.
Los datos son 100 % sintéticos.

## Stack

- Python 3.11+ · FastAPI · SQLAlchemy 2 · SQLite
- Pydantic v2 · PyJWT · bcrypt · uvicorn
- pytest + httpx (pruebas)
- Swagger automático en `/docs`

## Requisitos

- Python 3.11 o superior.

## Instalación y ejecución desde cero

```bash
cd backend
python -m venv .venv
# Windows (PowerShell/cmd):
.venv\Scripts\activate
# Linux/macOS:
# source .venv/bin/activate

pip install -r requirements.txt
```

Crea el archivo de configuración:

```bash
# Windows:
copy .env.example .env
# Linux/macOS:
cp .env.example .env
```

Genera una `SECRET_KEY` propia (opcional, pero recomendado):

```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

Carga los datos de demostración (reproducible, tarda segundos):

```bash
python scripts/seed.py
```

Levanta el servidor:

```bash
uvicorn app.main:app --reload
```

- API: <http://127.0.0.1:8000>
- Documentación Swagger: <http://127.0.0.1:8000/docs>
- Health check: <http://127.0.0.1:8000/health>

### Usuarios de prueba (seed)

| Usuario    | Contraseña      | Rol      |
|------------|-----------------|----------|
| `admin`    | `admin123`      | admin    |
| `vendedor` | `vendedor123`   | vendedor |

Las claves salen de `.env` (`SEED_ADMIN_PASSWORD`, `SEED_VENDEDOR_PASSWORD`).

## Pruebas

```bash
pytest
```

Cubren la matriz B-01 a B-15 (login, ventas, alertas, entradas, roles,
idempotencia, bitácora y reglas de negocio). Usan una base de datos en
memoria, no tocan tu base de datos de desarrollo.

## Endpoints

| Método | Ruta | Permiso |
|---|---|---|
| POST | `/auth/login` | público |
| GET | `/auth/me` | autenticado |
| GET | `/productos`, `/productos/{id}` | autenticado (vendedor **no** ve `costo`) |
| POST / PUT / DELETE | `/productos`, `/productos/{id}` | admin (DELETE desactiva) |
| GET / POST / PUT | `/proveedores`, `/proveedores/{id}` | admin |
| POST | `/ventas` | autenticado |
| GET | `/ventas`, `/ventas/{id}` | admin: todas / vendedor: solo las suyas del día |
| POST | `/ventas/{id}/anular` | admin |
| GET / POST | `/entradas` | admin |
| GET | `/alertas` · POST `/alertas/{id}/atender` | admin |
| GET | `/reportes/resumen`, `/ventas-por-dia`, `/top-productos`, `/abc`, `/ventas.csv` | admin |
| GET | `/bitacora` | admin |
| GET | `/health` | público |

### Formato de errores

Todas las respuestas de error tienen la misma forma:

```json
{ "error": "mensaje", "detalle": null }
```

Códigos: `401` sin sesión · `403` rol insuficiente · `404` no existe ·
`409` conflicto (stock insuficiente, duplicado, ya anulada) ·
`422` datos inválidos.

## Reglas de negocio

- **Venta:** mínimo 1 ítem, cantidad entera > 0, producto activo y stock
  suficiente. El servidor calcula precios y total (no confía en el cliente).
  Todo en una sola transacción. Si el `client_uuid` ya existe, devuelve la
  venta original sin duplicar (idempotencia para ventas offline).
- **Alerta (automatización):** tras cada venta o anulación, si
  `stock_actual <= stock_minimo` y no hay alerta pendiente, se crea una.
  `cantidad_sugerida = ceil(promedio_diario × (dias_entrega + DIAS_COBERTURA)) - stock_actual`.
  Con menos de 7 días de historial o cero ventas usa
  `stock_minimo × 2 - stock_actual` con confianza `baja`.
  **Solo recomienda, nunca compra.** Puede fallar con productos de
  temporada, compras grandes puntuales y productos nuevos.
- **Anular venta**: solo si está `completada`, exige motivo, devuelve el
  stock y registra quién anuló. Anular dos veces → `409`.
- **Entrada de mercancía:** cantidad y costo > 0, producto activo. Suma
  stock, actualiza el costo y **cierra sola** la alerta pendiente si el
  stock supera el mínimo.

## Seguridad

- Contraseñas con bcrypt (nunca se devuelven por la API).
- JWT con caducidad (`TOKEN_EXPIRE_MINUTES`, por defecto 8 h).
- El rol se valida en el servidor con `require_role()`, no solo en el frontend.
- Login con error genérico y bloqueo temporal tras 5 intentos fallidos.
- CORS limitado a `ALLOWED_ORIGINS`.
- `.env` está en `.gitignore`: no hay claves ni contraseñas en el repositorio.

## Variables de entorno

Ver `.env.example`. Resumen:

| Variable | Descripción |
|---|---|
| `SECRET_KEY` | Clave para firmar los JWT |
| `DATABASE_URL` | `sqlite:///./ferreteria.db` o `postgresql+psycopg://...` |
| `TOKEN_EXPIRE_MINUTES` | Caducidad del token (480) |
| `ALLOWED_ORIGINS` | Orígenes CORS separados por comas |
| `DIAS_VENTANA` | Días para el promedio diario de ventas (30) |
| `DIAS_COBERTURA` | Días de cobertura de la recomendación (7) |
| `DIAS_HISTORIAL_MINIMO` | Mínimo de días con historial para confianza normal (7) |
| `SEED_ADMIN_PASSWORD` / `SEED_VENDEDOR_PASSWORD` | Claves del seed |

## Estructura

```
backend/
  app/
    main.py         app, CORS, manejo global de errores, routers
    config.py       variables de .env
    database.py     engine y sesión
    models.py       tablas (8)
    schemas.py      validación (Pydantic)
    security.py     hash, JWT, require_role()
    errors.py       formato único de error
    utils.py        utilidades de fecha
    routers/        auth, productos, proveedores, ventas, entradas,
                    alertas, reportes, bitacora
    services/       bitacora, inventario, ventas, alertas, reportes
                    (la lógica va aquí, no en los routers)
  scripts/          seed.py, backup.py
  tests/            pruebas B-01 a B-15
  .env.example, pytest.ini, requirements.txt, README.md, LICENSE
```

## Respaldo

```bash
python scripts/backup.py            # guarda en backend/backups/
python scripts/backup.py --dir ruta # otro destino
```

Copia la base SQLite con fecha. Opcional: subir el archivo a
almacenamiento en la nube.

## Despliegue (Render, Railway o similar)

Comando de arranque:

```bash
uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

Define el **root directory** del servicio en `backend/` y las variables de
entorno del panel. Ojo con los planes gratuitos: el disco suele ser
temporal y SQLite se reinicia en cada despliegue. Opciones:

1. correr `python scripts/seed.py` al arrancar,
2. montar un disco persistente, o
3. usar un Postgres gratuito (basta cambiar `DATABASE_URL`).

## Licencia

MIT — ver [LICENSE](LICENSE).
