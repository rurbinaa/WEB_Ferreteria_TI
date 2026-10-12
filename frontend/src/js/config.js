export const API_BASE_URL = '';

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
  POS_CART: 'ferreteria_pos_cart'
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