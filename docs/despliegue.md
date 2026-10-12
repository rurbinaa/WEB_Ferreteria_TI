# Despliegue

Dos formas de levantar el backend: **local** (Python + SQLite) o con
**Docker Compose** (API + PostgreSQL).

## Requisitos

- **Local:** Python **3.13**.
- **Docker:** Docker Desktop con Compose v2.
- Dependencias: `backend/requirements.txt`.

---

## Opción A — Local (SQLite)

```bat
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
python scripts\seed.py
uvicorn app.main:app --reload
```

- Sin `DATABASE_URL` se usa **SQLite** (`sqlite:///./ferreteria.db`).
- `python scripts\seed.py` crea datos de demo (reproducibles, `random.seed(42)`):
  admin/vendedor, 5 proveedores, ~35 productos y 60 días de ventas. **Borra y
  recrea** las tablas.
- API en `http://localhost:8000`, docs en `http://localhost:8000/docs`.

### Pruebas

```bat
cd backend
.venv\Scripts\python.exe -m pytest
```

Matriz de pruebas B-01..B-15 (esperado: **37 passed**). Corren sobre SQLite.

---

## Opción B — Docker Compose (API + PostgreSQL)

Desde la **raíz del repositorio**:

```bat
docker compose up --build -d
```

Levanta dos servicios:

| Servicio | Imagen              | Puerto | Notas |
|----------|---------------------|--------|-------|
| `db`     | `postgres:16-alpine`| `5432` | Volumen `pgdata`, healthcheck `pg_isready`. |
| `api`    | build de `backend/` | `8000` | Espera a `db` (`service_healthy`) y arranca uvicorn. |

- El contenedor de la API usa `scripts/entrypoint.py`: espera a la base, crea las
  tablas, **siembra datos si la base está vacía** (`AUTO_SEED=true`) y arranca uvicorn.
- Usuario/clave/base por defecto: `ferreteria` / `ferreteria` / `ferreteria`.

### Comandos útiles

```bat
docker compose logs -f api        # ver logs de la API
docker compose ps                 # estado de los servicios
docker compose down               # detener y eliminar contenedores (conserva datos)
docker compose down -v            # detener y BORRAR el volumen pgdata (reset total)
docker compose up -d --build      # reconstruir la imagen tras cambios de código
```

> **Reset de datos:** `docker compose down -v` elimina el volumen `pgdata`; al
> volver a levantar, la base queda vacía y `AUTO_SEED` la vuelve a sembrar.

### Docker sin Compose

```bat
docker build -t ferreteria-api backend
docker run --rm -p 8000:8000 ^
  -e DATABASE_URL="sqlite:///./ferreteria.db" ^
  -e AUTO_SEED=true ^
  ferreteria-api
```

---

## Variables de entorno

Configurables en `.env` (local) o en `docker-compose.yml` (Docker). Ver
`backend/.env.example` para la lista comentada.

| Variable | Por defecto | Descripción |
|----------|-------------|-------------|
| `APP_NAME` / `APP_VERSION` | `Ferreteria API` / `1.0.0` | Metadatos. |
| `DEBUG` | `false` | Modo depuración. |
| `SECRET_KEY` | (cambiar) | Firma de los JWT. **Cámbiala en producción.** |
| `ALGORITHM` | `HS256` | Algoritmo JWT. |
| `TOKEN_EXPIRE_MINUTES` | `480` | Vigencia del token (8 h). |
| `LOGIN_MAX_INTENTOS` / `LOGIN_BLOQUEO_MINUTOS` | `5` / `15` | Bloqueo de login. |
| `DATABASE_URL` | `sqlite:///./ferreteria.db` | En Docker: `postgresql+psycopg://...`. |
| `ALLOWED_ORIGINS` | `http://localhost:3000,http://127.0.0.1:3000,http://localhost:8080,http://127.0.0.1:8080` | CORS. |
| `DIAS_VENTANA` / `DIAS_COBERTURA` / `DIAS_HISTORIAL_MINIMO` | `30` / `7` / `7` | Reglas de alertas. |
| `SEED_ADMIN_PASSWORD` / `SEED_VENDEDOR_PASSWORD` | `admin123` / `vendedor123` | Claves del seed. |
| `AUTO_SEED` | `false` (Docker: `true`) | Sembrar si la base está vacía al arrancar. |

> En PostgreSQL la URL debe usar el driver **psycopg 3**:
> `postgresql+psycopg://usuario:clave@host:5432/base`.

---

## Verificación

```bat
curl http://localhost:8000/health
curl -X POST http://localhost:8000/auth/login -H "Content-Type: application/json" -d "{\"nombre_usuario\":\"admin\",\"password\":\"admin123\"}"
```

- `GET /health` → `200` (`status: ok`).
- `POST /auth/login` → `200` con `access_token`.
- Docs interactivas: `http://localhost:8000/docs`.

## Documentos relacionados

- [Arquitectura](./arquitectura.md)
- [Seguridad](./seguridad.md)
- [Referencia de endpoints](./api-endpoints/README.md)
