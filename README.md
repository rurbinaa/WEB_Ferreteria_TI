# Sistema Ferretería - Frontend + Backend

Sistema de gestión para ferretería desarrollado como proyecto académico (ULSA - Tecnologías de la Información).

## Estructura del Proyecto

```
Web-Ferreteria/
├── frontend/                 # Frontend (HTML5 + Bootstrap 5 + JS vanilla + Chart.js)
│   ├── public/              # HTMLs de entrada (servidos como estáticos)
│   │   ├── index.html       # Punto de entrada, redirige según sesión/rol
│   │   ├── login.html       # Login único con redirección por rol
│   │   ├── venta.html       # POS Trabajador (factura 2 columnas)
│   │   ├── dashboard.html   # Admin: KPIs + Charts + Alertas
│   │   ├── productos.html   # CRUD productos (role-aware)
│   │   ├── proveedores.html # Proveedores + Entradas (2 tabs)
│   │   └── alertas.html     # Alertas + Bitácora (solo admin)
│   └── src/
│       ├── css/             # CSS modular (concatenado en styles.css)
│       │   ├── 01-variables.css
│       │   ├── 02-base.css
│       │   ├── 03-components.css
│       │   ├── 04-layout.css
│       │   ├── 05-pos.css
│       │   ├── 06-dashboard.css
│       │   └── styles.css   # Concatenado final
│       ├── js/
│       │   ├── config.js    # URLs, endpoints, constantes
│       │   ├── api.js       # Fetch wrapper + auth
│       │   ├── auth.js      # Login, guards, top-bar
│       │   ├── ui.js        # Toast, spinner, confirm, modales
│       │   ├── offline.js   # Cache, cola offline, sync
│       │   ├── keyboard.js  # Atajos de teclado
│       │   ├── app.js       # Boot: tabs, shortcuts, online/offline
│       │   ├── pos.js       # POS Trabajador
│       │   ├── dashboard.js # Dashboard Admin
│       │   ├── productos.js # CRUD Productos
│       │   ├── proveedores.js # Proveedores + Entradas
│       │   └── alertas.js   # Alertas + Bitácora
│       └── lib/             # Librerías locales (sin CDN)
│           ├── bootstrap/   # Bootstrap 5.3.3
│           ├── bootstrap-icons/ # Bootstrap Icons 1.11
│           └── chartjs/     # Chart.js 4.4.3
│
└── backend/                  # Backend (FastAPI + SQLAlchemy + SQLite)
    ├── src/
    │   └── app/
    │       ├── main.py
    │       ├── config.py
    │       ├── database.py
    │       ├── models.py
    │       ├── schemas.py
    │       ├── security.py
    │       ├── core/
    │       ├── models/
    │       ├── schemas/
    │       ├── routers/
    │       └── services/
    ├── scripts/
    │   ├── seed.py
    │   └── backup.py
    ├── tests/
    ├── .env.example
    ├── requirements.txt
    └── README.md
```

## Roles y Pantallas

| Rol | Pantalla Principal | Acceso |
|-----|-------------------|--------|
| **Trabajador** | `/venta.html` (POS) | Venta, Productos (solo lectura) |
| **Admin** | `/dashboard.html` | Todo: Dashboard, Venta, Productos, Proveedores, Alertas |

## Flujo de Trabajo

1. **Login** (`/login.html`) → redirige según rol
2. **Trabajador** → POS estilo factura:
   - `F2` buscar producto → `Enter` agregar → `F8` confirmar → `Esc` nueva factura
   - Funciona offline (cola en localStorage, sync automático)
3. **Admin** → Dashboard con KPIs, gráficos, alertas accionables
4. **CRUDs** en modales (Productos, Proveedores)
5. **Entradas** desde alertas o manual → cierra alerta automática

## Requisitos

- **Frontend**: Navegador moderno (ES Modules), servidor estático (FastAPI StaticFiles o Live Server)
- **Backend**: Python 3.11+, `pip install -r backend/requirements.txt`

## Desarrollo Local

```bash
# Backend
cd backend
pip install -r requirements.txt
cp .env.example .env
# Editar .env con SECRET_KEY, etc.
uvicorn app.main:app --reload

# Frontend (desde backend con StaticFiles) o servidor estático
cd frontend
# Opción A: Servir desde backend (recomendado)
# Opción B: npx serve public  /  python -m http.server 8080 -d public
```

## Despliegue

Ver `backend/README.md` para instrucciones de despliegue en Render/Railway/Fly.io.

## Licencia

MIT - Proyecto académico ULSA