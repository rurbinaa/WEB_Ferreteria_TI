import { 
  MOCK_USER_ADMIN, 
  MOCK_USER_VENDEDOR, 
  MOCK_PRODUCTOS, 
  MOCK_PROVEEDORES, 
  MOCK_VENTAS, 
  MOCK_ALERTAS, 
  MOCK_ENTRADAS, 
  MOCK_BITACORA,
  MOCK_REPORTES_RESUMEN,
  MOCK_VENTAS_POR_DIA,
  MOCK_TOP_PRODUCTOS
} from './mock.js';

const DELAY = 300;

function delay(ms = DELAY) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function mockResponse(data, status = 200) {
  return delay().then(() => {
    if (status >= 400) {
      const error = new Error(data.error || 'Error');
      error.status = status;
      error.detail = data.detalle;
      throw error;
    }
    return data;
  });
}

let currentUser = null;

function getAuthUser() {
  const token = sessionStorage.getItem('ferreteria_token');
  const user = sessionStorage.getItem('ferreteria_user');
  return token && user ? JSON.parse(user) : null;
}

function setAuthUser(user, token = 'mock-token') {
  currentUser = user;
  sessionStorage.setItem('ferreteria_token', token);
  sessionStorage.setItem('ferreteria_user', JSON.stringify(user));
}

function clearAuth() {
  currentUser = null;
  sessionStorage.removeItem('ferreteria_token');
  sessionStorage.removeItem('ferreteria_user');
}

function requireAuth() {
  const user = getAuthUser();
  if (!user) {
    throw Object.assign(new Error('Sesión expirada'), { status: 401 });
  }
  return user;
}

function requireAdmin() {
  const user = requireAuth();
  if (user.rol !== 'admin') {
    throw Object.assign(new Error('No tienes permiso'), { status: 403 });
  }
  return user;
}

export const mockApi = {
  async login(credentials) {
    await delay();
    const { nombre_usuario, password } = credentials;
    
    if (nombre_usuario === 'admin' && password === 'admin123') {
      setAuthUser(MOCK_USER_ADMIN);
      return MOCK_USER_ADMIN;
    }
    if (nombre_usuario === 'vendedor' && password === 'vendedor123') {
      setAuthUser(MOCK_USER_VENDEDOR);
      return MOCK_USER_VENDEDOR;
    }
    
    throw Object.assign(new Error('Usuario o contraseña incorrectos'), { status: 401 });
  },

  async getMe() {
    const user = getAuthUser();
    if (!user) throw Object.assign(new Error('No autenticado'), { status: 401 });
    return user;
  },

  async logout() {
    clearAuth();
    window.location.href = 'login.html';
  },

  isAuthenticated() {
    return !!getAuthUser();
  },

  getUser() {
    return getAuthUser();
  },

  hasRole(role) {
    const user = getAuthUser();
    return user?.rol === role;
  },

  isAdmin() {
    return this.hasRole('admin');
  },

  isVendedor() {
    return this.hasRole('vendedor');
  },

  // Productos
  async getProductos(params = {}) {
    requireAuth();
    let productos = [...MOCK_PRODUCTOS];
    
    if (params.q) {
      const q = params.q.toLowerCase();
      productos = productos.filter(p => 
        p.codigo.toLowerCase().includes(q) || 
        p.nombre.toLowerCase().includes(q)
      );
    }
    if (params.categoria) {
      productos = productos.filter(p => p.categoria === params.categoria);
    }
    if (params.stock === 'agotado') {
      productos = productos.filter(p => p.stock_actual <= 0);
    } else if (params.stock === 'bajo') {
      productos = productos.filter(p => p.stock_actual > 0 && p.stock_actual <= p.stock_minimo);
    } else if (params.stock === 'ok') {
      productos = productos.filter(p => p.stock_actual > p.stock_minimo);
    }
    
    const user = getAuthUser();
    if (user?.rol !== 'admin') {
      productos = productos.map(({ costo, ...p }) => p);
    }
    
    return mockResponse(productos);
  },

  async getProducto(id) {
    requireAuth();
    const producto = MOCK_PRODUCTOS.find(p => p.id == id);
    if (!producto) throw Object.assign(new Error('Producto no encontrado'), { status: 404 });
    
    const user = getAuthUser();
    if (user?.rol !== 'admin') {
      const { costo, ...p } = producto;
      return mockResponse(p);
    }
    return mockResponse(producto);
  },

  async createProducto(data) {
    requireAdmin();
    const exists = MOCK_PRODUCTOS.find(p => p.codigo === data.codigo);
    if (exists) throw Object.assign(new Error('Código ya existe'), { status: 409 });
    
    const newProducto = { id: Date.now(), ...data, activo: true };
    MOCK_PRODUCTOS.push(newProducto);
    return mockResponse(newProducto, 201);
  },

  async updateProducto(id, data) {
    requireAdmin();
    const idx = MOCK_PRODUCTOS.findIndex(p => p.id == id);
    if (idx === -1) throw Object.assign(new Error('Producto no encontrado'), { status: 404 });
    
    MOCK_PRODUCTOS[idx] = { ...MOCK_PRODUCTOS[idx], ...data };
    return mockResponse(MOCK_PRODUCTOS[idx]);
  },

  async deleteProducto(id) {
    requireAdmin();
    const idx = MOCK_PRODUCTOS.findIndex(p => p.id == id);
    if (idx === -1) throw Object.assign(new Error('Producto no encontrado'), { status: 404 });
    
    MOCK_PRODUCTOS[idx].activo = false;
    return mockResponse(MOCK_PRODUCTOS[idx]);
  },

  // Proveedores
  async getProveedores() {
    requireAdmin();
    return mockResponse([...MOCK_PROVEEDORES]);
  },

  async getProveedor(id) {
    requireAdmin();
    const p = MOCK_PROVEEDORES.find(p => p.id == id);
    if (!p) throw Object.assign(new Error('Proveedor no encontrado'), { status: 404 });
    return mockResponse(p);
  },

  async createProveedor(data) {
    requireAdmin();
    const newProv = { id: Date.now(), ...data, activo: true };
    MOCK_PROVEEDORES.push(newProv);
    return mockResponse(newProv, 201);
  },

  async updateProveedor(id, data) {
    requireAdmin();
    const idx = MOCK_PROVEEDORES.findIndex(p => p.id == id);
    if (idx === -1) throw Object.assign(new Error('Proveedor no encontrado'), { status: 404 });
    MOCK_PROVEEDORES[idx] = { ...MOCK_PROVEEDORES[idx], ...data };
    return mockResponse(MOCK_PROVEEDORES[idx]);
  },

  // Ventas
  async getVentas() {
    const user = requireAuth();
    let ventas = [...MOCK_VENTAS];
    
    if (user.rol !== 'admin') {
      const hoy = new Date().toISOString().split('T')[0];
      ventas = ventas.filter(v => v.fecha.startsWith(hoy) && v.usuario_id === user.id);
    }
    return mockResponse(ventas);
  },

  async getVenta(id) {
    requireAuth();
    const venta = MOCK_VENTAS.find(v => v.id == id || v.client_uuid === id);
    if (!venta) throw Object.assign(new Error('Venta no encontrada'), { status: 404 });
    return mockResponse(venta);
  },

  async createVenta(data) {
    requireAuth();
    const { client_uuid, items } = data;
    
    const existing = MOCK_VENTAS.find(v => v.client_uuid === client_uuid);
    if (existing) return mockResponse(existing);
    
    for (const item of items) {
      const prod = MOCK_PRODUCTOS.find(p => p.codigo === item.producto_codigo);
      if (!prod) throw Object.assign(new Error(`Producto ${item.producto_codigo} no existe`), { status: 404 });
      if (!prod.activo) throw Object.assign(new Error(`Producto ${prod.nombre} inactivo`), { status: 409 });
      if (prod.stock_actual < item.cantidad) throw Object.assign(new Error(`Stock insuficiente para ${prod.nombre}`), { status: 409 });
    }
    
    let total = 0;
    const detalle = [];
    for (const item of items) {
      const prod = MOCK_PRODUCTOS.find(p => p.codigo === item.producto_codigo);
      const subtotal = item.cantidad * prod.precio_venta;
      total += subtotal;
      prod.stock_actual -= item.cantidad;
      detalle.push({ producto_id: prod.id, cantidad: item.cantidad, precio_unitario: prod.precio_venta, subtotal });
    }
    
    const venta = {
      id: MOCK_VENTAS.length + 1,
      client_uuid,
      fecha: new Date().toISOString(),
      usuario_id: getAuthUser().id,
      total,
      estado: 'completada',
      detalle_venta: detalle
    };
    MOCK_VENTAS.push(venta);
    
    // Check alerts
    for (const item of items) {
      const prod = MOCK_PRODUCTOS.find(p => p.codigo === item.producto_codigo);
      if (prod.stock_actual <= prod.stock_minimo) {
        const exists = MOCK_ALERTAS.find(a => a.producto_id === prod.id && a.estado === 'pendiente');
        if (!exists) {
          MOCK_ALERTAS.push({
            id: MOCK_ALERTAS.length + 1,
            producto_id: prod.id,
            producto: { ...prod, proveedor: MOCK_PROVEEDORES.find(pr => pr.id === prod.proveedor_id) },
            fecha_creada: new Date().toISOString(),
            stock_al_generar: prod.stock_actual,
            cantidad_sugerida: prod.stock_minimo * 2,
            confianza: 'baja',
            estado: 'pendiente'
          });
        }
      }
    }
    
    return mockResponse(venta, 201);
  },

  async anularVenta(id, data) {
    requireAdmin();
    const venta = MOCK_VENTAS.find(v => v.id == id);
    if (!venta) throw Object.assign(new Error('Venta no encontrada'), { status: 404 });
    if (venta.estado === 'anulada') throw Object.assign(new Error('Venta ya anulada'), { status: 409 });
    
    venta.estado = 'anulada';
    venta.motivo_anulacion = data.motivo;
    venta.anulada_por = getAuthUser().id;
    
    for (const det of venta.detalle_venta) {
      const prod = MOCK_PRODUCTOS.find(p => p.id === det.producto_id);
      if (prod) prod.stock_actual += det.cantidad;
    }
    
    return mockResponse(venta);
  },

  // Entradas
  async getEntradas() {
    requireAdmin();
    return mockResponse([...MOCK_ENTRADAS].sort((a,b) => new Date(b.fecha) - new Date(a.fecha)));
  },

  async createEntrada(data) {
    requireAdmin();
    const prod = MOCK_PRODUCTOS.find(p => p.id == data.producto_id);
    if (!prod) throw Object.assign(new Error('Producto no encontrado'), { status: 404 });
    if (!prod.activo) throw Object.assign(new Error('Producto inactivo'), { status: 409 });
    
    prod.stock_actual += data.cantidad;
    prod.costo = data.costo_unitario;
    
    const entrada = {
      id: MOCK_ENTRADAS.length + 1,
      fecha: new Date().toISOString(),
      proveedor_id: data.proveedor_id,
      proveedor: MOCK_PROVEEDORES.find(p => p.id == data.proveedor_id),
      producto_id: data.producto_id,
      producto: { nombre: prod.nombre },
      cantidad: data.cantidad,
      costo_unitario: data.costo_unitario,
      usuario_id: getAuthUser().id
    };
    MOCK_ENTRADAS.push(entrada);
    
    // Close alert if stock > min
    const alerta = MOCK_ALERTAS.find(a => a.producto_id === prod.id && a.estado === 'pendiente');
    if (alerta && prod.stock_actual > prod.stock_minimo) {
      alerta.estado = 'atendida';
      alerta.fecha_atendida = new Date().toISOString();
      alerta.atendida_por = getAuthUser().id;
    }
    
    return mockResponse(entrada, 201);
  },

  // Alertas
  async getAlertas(params = {}) {
    requireAdmin();
    let alertas = [...MOCK_ALERTAS];
    if (params.producto) {
      const q = params.producto.toLowerCase();
      alertas = alertas.filter(a => a.producto?.nombre?.toLowerCase().includes(q));
    }
    if (params.estado) {
      alertas = alertas.filter(a => a.estado === params.estado);
    }
    return mockResponse(alertas.sort((a,b) => new Date(b.fecha_creada) - new Date(a.fecha_creada)));
  },

  async atenderAlerta(id) {
    requireAdmin();
    const alerta = MOCK_ALERTAS.find(a => a.id == id);
    if (!alerta) throw Object.assign(new Error('Alerta no encontrada'), { status: 404 });
    if (alerta.estado === 'atendida') throw Object.assign(new Error('Alerta ya atendida'), { status: 409 });
    
    alerta.estado = 'atendida';
    alerta.fecha_atendida = new Date().toISOString();
    alerta.atendida_por = getAuthUser().id;
    
    return mockResponse({ 
      redirect: true, 
      producto_id: alerta.producto_id,
      proveedor_id: alerta.producto?.proveedor?.id,
      cantidad_sugerida: alerta.cantidad_sugerida
    });
  },

  // Reportes
  async getResumen() {
    requireAdmin();
    return mockResponse(MOCK_REPORTES_RESUMEN);
  },

  async getVentasPorDia() {
    requireAdmin();
    return mockResponse(MOCK_VENTAS_POR_DIA);
  },

  async getTopProductos() {
    requireAdmin();
    return mockResponse(MOCK_TOP_PRODUCTOS);
  },

  // Bitácora
  async getBitacora(params = {}) {
    requireAdmin();
    let bitacora = [...MOCK_BITACORA];
    if (params.usuario) bitacora = bitacora.filter(b => b.usuario_nombre.toLowerCase().includes(params.usuario.toLowerCase()));
    if (params.accion) bitacora = bitacora.filter(b => b.accion === params.accion);
    if (params.fecha) bitacora = bitacora.filter(b => b.fecha.startsWith(params.fecha));
    return mockResponse(bitacora.sort((a,b) => new Date(b.fecha) - new Date(a.fecha)));
  },

  // Health
  async health() {
    return mockResponse({ status: 'ok', mock: true });
  },

  // Generic HTTP methods (compatible with real api.js)
  async get(endpoint) {
    const params = new URLSearchParams(endpoint.split('?')[1] || '');
    const path = endpoint.split('?')[0];
    
    switch (path) {
      case '/auth/me':
        return this.getMe();
      case '/productos':
        return this.getProductos(Object.fromEntries(params));
      case '/proveedores':
        return this.getProveedores();
      case '/ventas':
        return this.getVentas();
      case '/entradas':
        return this.getEntradas();
      case '/alertas':
        return this.getAlertas(Object.fromEntries(params));
      case '/reportes/resumen':
        return this.getResumen();
      case '/reportes/ventas-por-dia':
        return this.getVentasPorDia();
      case '/reportes/top-productos':
        return this.getTopProductos();
      case '/bitacora':
        return this.getBitacora(Object.fromEntries(params));
      case '/health':
        return this.health();
      default:
        if (path.startsWith('/productos/')) {
          const id = path.split('/')[2];
          return this.getProducto(id);
        }
        if (path.startsWith('/proveedores/')) {
          const id = path.split('/')[2];
          return this.getProveedor(id);
        }
        if (path.startsWith('/ventas/')) {
          const id = path.split('/')[2];
          return this.getVenta(id);
        }
        if (path.startsWith('/alertas/')) {
          const id = path.split('/')[2];
          if (path.includes('/atender')) {
            return this.atenderAlerta(id);
          }
        }
        throw Object.assign(new Error(`Endpoint no implementado en mock: ${endpoint}`), { status: 404 });
    }
  },

  async post(endpoint, body) {
    const path = endpoint.split('?')[0];
    
    switch (path) {
      case '/auth/login':
        return this.login(body);
      case '/productos':
        return this.createProducto(body);
      case '/proveedores':
        return this.createProveedor(body);
      case '/ventas':
        return this.createVenta(body);
      case '/entradas':
        return this.createEntrada(body);
      default:
        if (path.match(/^\/ventas\/\d+\/anular$/)) {
          const id = path.split('/')[2];
          return this.anularVenta(id, body);
        }
        if (path.match(/^\/alertas\/\d+\/atender$/)) {
          const id = path.split('/')[2];
          return this.atenderAlerta(id);
        }
        throw Object.assign(new Error(`Endpoint POST no implementado en mock: ${endpoint}`), { status: 404 });
    }
  },

  async put(endpoint, body) {
    const path = endpoint.split('?')[0];
    
    if (path.startsWith('/productos/')) {
      const id = path.split('/')[2];
      return this.updateProducto(id, body);
    }
    if (path.startsWith('/proveedores/')) {
      const id = path.split('/')[2];
      return this.updateProveedor(id, body);
    }
    throw Object.assign(new Error(`Endpoint PUT no implementado en mock: ${endpoint}`), { status: 404 });
  },

  async delete(endpoint) {
    const path = endpoint.split('?')[0];
    
    if (path.startsWith('/productos/')) {
      const id = path.split('/')[2];
      return this.deleteProducto(id);
    }
    throw Object.assign(new Error(`Endpoint DELETE no implementado en mock: ${endpoint}`), { status: 404 });
  }
};

export default mockApi;