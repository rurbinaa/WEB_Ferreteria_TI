export const API_BASE_URL = 'http://localhost:8000';

// Flag para alternar entre API real y mock (configurable via localStorage o URL).
// La rama de integración usa la API real por defecto; ?api=mock conserva el
// modo de demostración para pruebas de interfaz sin backend.
export const USE_REAL_API = (() => {
  // Prioridad: 1. URL param ?api=real|mock  2. localStorage  3. API real
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.has('api')) {
    return urlParams.get('api') === 'real';
  }
  const stored = localStorage.getItem('ferreteria_use_real_api');
  if (stored !== null) {
    return stored === 'true';
  }
  return true;
})();

// Función para cambiar el modo en runtime (requiere recarga)
export function setUseRealAPI(useReal) {
  localStorage.setItem('ferreteria_use_real_api', useReal.toString());
  window.location.reload();
}

export const ENDPOINTS = {
  auth: {
    login: '/auth/login',
    me: '/auth/me'
  },
  productos: {
    list: '/productos',
    detail: (id) => `/productos/${id}`,
    create: '/productos',
    update: (id) => `/productos/${id}`,
    delete: (id) => `/productos/${id}`
  },
  proveedores: {
    list: '/proveedores',
    detail: (id) => `/proveedores/${id}`,
    create: '/proveedores',
    update: (id) => `/proveedores/${id}`
  },
  ventas: {
    list: '/ventas',
    detail: (id) => `/ventas/${id}`,
    create: '/ventas',
    anular: (id) => `/ventas/${id}/anular`
  },
  entradas: {
    list: '/entradas',
    create: '/entradas'
  },
  alertas: {
    list: '/alertas',
    atender: (id) => `/alertas/${id}/atender`
  },
  reportes: {
    resumen: '/reportes/resumen',
    ventasPorDia: '/reportes/ventas-por-dia',
    topProductos: '/reportes/top-productos',
    abc: '/reportes/abc',
    csv: '/reportes/ventas.csv'
  },
  bitacora: {
    list: '/bitacora'
  },
  health: '/health'
};

export const ROLES = {
  ADMIN: 'admin',
  VENDEDOR: 'vendedor'
};

export const STORAGE_KEYS = {
  TOKEN: 'ferreteria_token',
  USER: 'ferreteria_user',
  CATALOGO_CACHE: 'ferreteria_catalogo_cache',
  VENTAS_COLA: 'ferreteria_ventas_cola',
  VENTAS_RECHAZADAS: 'ferreteria_ventas_rechazadas',
  POS_CART: 'ferreteria_pos_cart',
  VENTA_BORRADOR: 'ferreteria_venta_borrador'
};

export const ALERTAS_CONFIANZA = {
  NORMAL: 'normal',
  BAJA: 'baja'
};

export const ALERTAS_ESTADO = {
  PENDIENTE: 'pendiente',
  ATENDIDA: 'atendida'
};

export const VENTA_ESTADO = {
  COMPLETADA: 'completada',
  ANULADA: 'anulada'
};

export const KEYBOARD_SHORTCUTS = {
  FOCUS_SEARCH: 'F2',
  ADD_TO_CART: 'Enter',
  CONFIRM_SALE: 'F8',
  CLEAR_CART: 'Escape',
  NEXT_TAB: 'Tab',
  PREV_TAB: 'Shift+Tab'
};

export const DEBOUNCE_MS = 150;
export const SYNC_INTERVAL_MS = 30000;
export const TOAST_DURATION_MS = 4000;
export const IVA_RATE = 0.19;
