# Contrato API: Frontend (Mock) vs Backend (Real)

> **Estado**: Análisis inicial - diferencias identificadas entre `mockApi` y `FastAPI`

---

## 1. Autenticación

| Aspecto | Mock (Frontend) | Backend (Real) | Acción requerida |
|---------|-----------------|----------------|------------------|
| **Login request** | JSON: `{ nombre_usuario, password }` | Form data: `nombre_usuario`, `password` (OAuth2) | Adaptar `api.login` a `FormData` |
| **Login response** | Usuario completo: `{ id, nombre_usuario, nombre_completo, rol, activo }` | Token: `{ access_token, token_type: "bearer" }` | Separar login (token) y `/auth/me` (usuario) |
| **Token** | String estático `"mock-token"` | JWT HS256 con `sub`, `rol`, `nombre_usuario`, `iat`, `exp` | Guardar JWT, enviar `Authorization: Bearer` |
| **Refresh** | No implementado | No hay refresh token (expira en 480 min) | Manejar 401 → limpiar sesión → redirect login |
| **Logout** | Limpia sessionStorage | Solo limpia cliente (JWT stateless) | Igual comportamiento |

---

## 2. Productos (`/productos`)

| Campo | Mock | Backend Real | Diferencia |
|-------|------|--------------|------------|
| `id` | `int` | `int` | ✅ |
| `codigo` | `string` | `string` | ✅ |
| `nombre` | `string` | `string` | ✅ |
| `categoria` | `string` | `string` | ✅ |
| `unidad` | `string` | `string` | ✅ |
| `precio_venta` | `number` (exacto) | `float` (Float SQL) | ⚠️ Precisión |
| `costo` | `number` | `float` (Float SQL) | ⚠️ Precisión + vendedor no lo ve |
| `stock_actual` | `number` | `float` | ⚠️ Precisión |
| `stock_minimo` | `number` | `float` | ⚠️ Precisión |
| `proveedor_id` | `int` | `int` | ✅ |
| `activo` | `boolean` | `boolean` | ✅ |
| **Filtros** | `q`, `categoria`, `stock` | `q`, `categoria`, `stock` (agotado\|bajo\|ok) | ✅ |
| **Vendedor ve costo** | No (filtrado en mock) | No (filtrado en router) | ✅ Comportamiento igual |

**Acción**: Convertir `float` → `number` seguro en mapeo; validar precisión en tests.

---

## 3. Ventas (`/ventas`)

### 3.1 Crear venta (`POST /ventas`)

| Aspecto | Mock | Backend Real | Acción |
|---------|------|--------------|--------|
| **Request body** | `{ client_uuid, items: [{ producto_codigo, cantidad, precio_unitario }] }` | `{ client_uuid, items: [{ producto_codigo, cantidad }] }` | **Eliminar `precio_unitario` del request** (servidor recalcula) |
| **Idempotencia** | `client_uuid` verificado en memoria | `client_uuid` UNIQUE en BD | ✅ Igual |
| **Validación stock** | En memoria | Transaccional en BD | ✅ |
| **Response** | Venta completa con `detalle_venta` (incluye `producto_codigo`, `producto_nombre`) | `VentaOut` con `detalle_venta` (`producto_id`, `producto_codigo`, `producto_nombre`, `cantidad`, `precio_unitario`, `subtotal`) | ✅ Mapear campos |

### 3.2 Listar ventas (`GET /ventas`)

| Aspecto | Mock | Backend Real | Acción |
|---------|------|--------------|--------|
| **Admin** | Todas | Todas | ✅ |
| **Vendedor** | Solo sus ventas de hoy | Solo sus ventas de hoy (fecha >= 00:00 UTC) | ⚠️ **Zona horaria**: backend usa UTC, frontend Nicaragua (America/Managua) |
| **Filtros** | Ninguno | Ninguno | ✅ |

### 3.3 Anular venta (`POST /ventas/{id}/anular`)

| Aspecto | Mock | Backend Real | Acción |
|---------|------|--------------|--------|
| **Rol** | Solo admin | Solo admin | ✅ |
| **Body** | `{ motivo }` | `{ motivo }` | ✅ |
| **Restaura stock** | Sí | Sí | ✅ |
| **Bitácora** | Sí | Sí | ✅ |

---

## 4. Entradas (`/entradas`)

| Campo | Mock | Backend Real | Acción |
|-------|------|--------------|--------|
| **Request** | `{ proveedor_id, producto_id, cantidad, costo_unitario }` | `{ proveedor_id?, producto_id, cantidad, costo_unitario }` | `proveedor_id` opcional en real |
| **Response** | Incluye `proveedor` y `producto` objetos | Incluye `proveedor` (id, nombre) y `producto` (id, codigo, nombre) | ✅ Mapear |
| **Rol** | Solo admin | Solo admin | ✅ |
| **Efecto** | Sube stock, actualiza costo, cierra alerta | Igual | ✅ |

---

## 5. Alertas (`/alertas`)

| Campo | Mock | Backend Real | Acción |
|-------|------|--------------|--------|
| `producto` | Objeto con `proveedor` (id, nombre) | Objeto con `proveedor` (id, nombre) | ✅ |
| `confianza` | `"normal"` \| `"baja"` | `"normal"` \| `"baja"` | ✅ |
| `estado` | `"pendiente"` \| `"atendida"` | `"pendiente"` \| `"atendida"` | ✅ |
| **Filtros** | `producto` (string), `estado` | `producto` (string), `estado` (pendiente\|atendida) | ✅ |
| **Atender** | `POST /alertas/{id}/atender` → `{ redirect, producto_id, proveedor_id, cantidad_sugerida }` | Igual | ✅ |
| **Cálculo confianza** | En mock: hardcoded | Real: basado en historial ventas (30 días, 7 días mín) | Documentar en `docs/` |

---

## 6. Bitácora (`/bitacora`)

| Campo | Mock | Backend Real | Acción |
|-------|------|--------------|--------|
| `usuario_id` | No incluido | `int` | Agregar en mapeo |
| `usuario_nombre` | `string` | `string` | ✅ |
| `accion` | `string` (ej: `VENTA_CREADA`) | `string` | ✅ |
| `entidad` | `string` | `string` | ✅ |
| `entidad_id` | `string` | `string` | ✅ |
| `resultado` | `"ok"` \| `"error"` | `"ok"` \| `"error"` | ✅ |
| `detalle` | `string` | `string` | ✅ |
| `fecha` | ISO string | ISO string (UTC) | ✅ |
| **Filtros** | `usuario`, `accion`, `fecha` | `usuario`, `accion`, `fecha`, `limite` (default 200) | Mapear params |
| **Paginación** | No | `limite` (default 200, max 1000) | Implementar |

---

## 7. Reportes (`/reportes`)

| Endpoint | Mock | Backend Real | Acción |
|----------|------|--------------|--------|
| `/resumen` | `{ ventas_hoy: {total, tendencia}, alertas_pendientes, productos_agotados, ticket_promedio }` | Igual | ✅ |
| `/ventas-por-dia` | `[{ fecha: "YYYY-MM-DD", total }]` | Igual | ✅ |
| `/top-productos` | `[{ nombre, cantidad_vendida }]` | `[{ producto_id, codigo, nombre, cantidad_vendida }]` | Mapear campos extra |
| `/abc` | No en mock | `[{ producto_id, codigo, nombre, valor_vendido, porcentaje, acumulado, clase }]` | Nuevo en frontend |
| `/ventas.csv` | No en mock | CSV download | Nuevo en frontend |

---

## 8. Diferencias Críticas de Contrato

### 8.1 Login - **Breaking Change**
```
MOCK:  POST /auth/login  { nombre_usuario, password } (JSON)
       → { id, nombre_usuario, nombre_completo, rol, activo }

REAL:  POST /auth/login  nombre_usuario=xxx&password=yyy (form-urlencoded)
       → { access_token, token_type: "bearer" }
       → GET /auth/me → { id, nombre_usuario, nombre_completo, rol, activo }
```

### 8.2 Venta Create - **Breaking Change**
```
MOCK:  items: [{ producto_codigo, cantidad, precio_unitario }]
REAL:  items: [{ producto_codigo, cantidad }]  // precio_unitario NO se envía
```

### 8.3 Vendedor - Ventas de hoy
- Backend filtra por `fecha >= 00:00 UTC` (ahora_utc())
- Nicaragua es UTC-6 → "hoy" en backend ≠ "hoy" en frontend 6h
- **Solución**: Frontend debe enviar filtro de fecha explícito o backend aceptar zona horaria

### 8.4 Montos y Precisión
- Backend usa `Float` (SQL) → problemas de precisión (ej: 0.1 + 0.2 = 0.30000000000000004)
- Frontend `formatCurrency` espera decimales exactos
- **Solución**: `Math.round(valor * 100) / 100` en mapeo o usar `Decimal` en backend (fuera de alcance)

### 8.5 IVA Rate
- Frontend: `IVA_RATE = 0.19` (19%) en `config.js`
- Nicaragua: 15% IVA general
- Backend: No tiene IVA explícito, calcula totales en `crear_venta` (precio_venta ya incluye IVA?)
- **Verificar**: ¿Backend incluye IVA en `precio_venta`? Documentar discrepancia.

### 8.4 Fechas y Zona Horaria
- Backend: `ahora_utc()` → guarda en UTC
- Frontend: `new Date()` → zona local (America/Managua, UTC-6)
- Filtros "hoy": Backend usa `ahora_utc().replace(hour=0...)` → 00:00 UTC
- **Solución**: Frontend enviar fecha en UTC o backend aceptar TZ

### 8.5 Errores
```
MOCK:  throw { message, status, detail }
REAL:  FastAPI → { error: "...", detalle: "..." } (ErrorResponse schema)
```
Normalizar en `api.js` request().

---

## 9. Mapeo de Endpoints

| Funcionalidad | Mock Endpoint | Real Endpoint | Método |
|---------------|---------------|---------------|--------|
| Login | `/auth/login` | `/auth/login` | POST |
| Usuario actual | `/auth/me` | `/auth/me` | GET |
| Logout | - | - (client-side) | - |
| Productos list | `/productos` | `/productos` | GET |
| Producto detail | `/productos/{id}` | `/productos/{id}` | GET |
| Crear producto | `/productos` | `/productos` | POST (admin) |
| Actualizar producto | `/productos/{id}` | `/productos/{id}` | PUT (admin) |
| Desactivar producto | `/productos/{id}` | `/productos/{id}` | DELETE (admin) |
| Proveedores list | `/proveedores` | `/proveedores` | GET (admin) |
| Crear proveedor | `/proveedores` | `/proveedores` | POST (admin) |
| Actualizar proveedor | `/proveedores/{id}` | `/proveedores/{id}` | PUT (admin) |
| Ventas list | `/ventas` | `/ventas` | GET |
| Crear venta | `/ventas` | `/ventas` | POST |
| Anular venta | `/ventas/{id}/anular` | `/ventas/{id}/anular` | POST (admin) |
| Entradas list | `/entradas` | `/entradas` | GET (admin) |
| Crear entrada | `/entradas` | `/entradas` | POST (admin) |
| Alertas list | `/alertas` | `/alertas` | GET (admin) |
| Atender alerta | `/alertas/{id}/atender` | `/alertas/{id}/atender` | POST (admin) |
| Reportes resumen | `/reportes/resumen` | `/reportes/resumen` | GET (admin) |
| Ventas por día | `/reportes/ventas-por-dia` | `/reportes/ventas-por-dia` | GET (admin) |
| Top productos | `/reportes/top-productos` | `/reportes/top-productos` | GET (admin) |
| ABC | No | `/reportes/abc` | GET (admin) |
| Bitácora | `/bitacora` | `/bitacora` | GET (admin) |
| Health | `/health` | `/health` | GET |

---

## 10. Resumen de Cambios Requeridos en Frontend

### Archivos a modificar:
1. **`config.js`**: `API_BASE_URL`, flag `USE_REAL_API`, `IVA_RATE` (reportar discrepancia)
2. **`api.js`**: Implementar `realApi` con JWT, refresh, manejo 401, form-data login
3. **`apiFactory.js`**: Switch `USE_REAL_API`, re-exportar interfaz unificada
4. **`auth.js`**: `handleLogin` → form-data, manejar JWT, 401 auto-refresh
5. **`saleLogic.js`**: `confirmSale` → sin `precio_unitario`, usar totales del servidor
6. **`ventaModal.js`**: Mostrar totales del servidor, no recalcular IVA local
7. **`historial.js`**: Filtro fecha en UTC, usar totales del servidor
8. **`dashboard.js`**: Usar totales del servidor
9. **`productos.js`**: Manejar `ProductoPublicoOut` (sin costo) para vendedor
10. **`proveedores.js`**: Mapear `proveedor_id` opcional en entradas
11. **`alertas.js`**: Mapear `confianza`, `proveedor` en response
12. **`bitacora` (alertas.js)**: Mapear `usuario_id`, paginación
12. **`ui.js`**: `formatCurrency` seguro para floats, `formatDate` zona horaria Nicaragua
13. **`config.js`**: `API_BASE_URL = 'http://localhost:8000'`, flag `USE_REAL_API`

### Archivos nuevos:
- `docs/contrato-api.md` (este documento)
- `backend/.env.example`
- `README.md` actualizado
- `scripts/dev.ps1` para levantar ambos

---

## 11. Riesgos Identificados

| Riesgo | Impacto | Mitigación |
|--------|---------|------------|
| Precisión `Float` en montos | Cálculos incorrectos en totales | Redondear a 2 decimales en mapeo frontend |
| Zona horaria "hoy" | Vendedor ve ventas vacías | Enviar filtro fecha explícito desde frontend |
| Login form-data vs JSON | Login falla en real | Adaptar `api.login` a `FormData` |
| IVA 19% vs 15% | Totales incorrectos | Reportar, usar total del servidor |
| Sin refresh token | Sesión expira en 8h | Limpiar sesión en 401, redirect login |
| CORS | Requests bloqueados | Configurar `ALLOWED_ORIGINS` con localhost:3000 |
| Vendedor ve costos | Fuga de datos | Verificar `ProductoPublicoOut` en backend |

---

## 12. Próximos Pasos

1. ✅ Crear `docs/contrato-api.md`
2. Crear rama `feature/integracion-api` desde `develop`
3. Implementar `realApi` en `api.js`
4. Actualizar `apiFactory.js` con switch `USE_REAL_API`
5. Adaptar `auth.js` login + JWT
6. Adaptar `saleLogic.js` y `ventaModal.js` para totales del servidor
7. Configurar CORS en backend (`localhost:3000`)
8. Crear `backend/.env.example`
8. Tests de integración manuales
9. Documentar en `README.md`