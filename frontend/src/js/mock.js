export const MOCK_USER_ADMIN = {
  id: 1,
  nombre_usuario: 'admin',
  nombre_completo: 'Administrador',
  rol: 'admin',
  activo: true
};

export const MOCK_USER_VENDEDOR = {
  id: 2,
  nombre_usuario: 'vendedor',
  nombre_completo: 'Juan Pérez',
  rol: 'vendedor',
  activo: true
};

export const MOCK_PRODUCTOS = [
  { id: 1, codigo: 'TORN-001', nombre: 'Tornillo 1/4" x 1"', categoria: 'Tornillos', unidad: 'unidad', precio_venta: 0.50, costo: 0.25, stock_actual: 150, stock_minimo: 20, proveedor_id: 1, activo: true },
  { id: 2, codigo: 'TORN-002', nombre: 'Tornillo 3/8" x 2"', categoria: 'Tornillos', unidad: 'unidad', precio_venta: 0.80, costo: 0.40, stock_actual: 80, stock_minimo: 15, proveedor_id: 1, activo: true },
  { id: 3, codigo: 'PVC-001', nombre: 'Tubo PVC 1/2"', categoria: 'Plomería', unidad: 'metro', precio_venta: 2.30, costo: 1.20, stock_actual: 45, stock_minimo: 10, proveedor_id: 2, activo: true },
  { id: 4, codigo: 'PVC-002', nombre: 'Tubo PVC 3/4"', categoria: 'Plomería', unidad: 'metro', precio_venta: 3.50, costo: 1.80, stock_actual: 30, stock_minimo: 8, proveedor_id: 2, activo: true },
  { id: 5, codigo: 'PINT-001', nombre: 'Pintura Blanca 1L', categoria: 'Pinturas', unidad: 'litro', precio_venta: 15.00, costo: 8.50, stock_actual: 12, stock_minimo: 5, proveedor_id: 3, activo: true },
  { id: 6, codigo: 'PINT-002', nombre: 'Pintura Roja 1L', categoria: 'Pinturas', unidad: 'litro', precio_venta: 16.50, costo: 9.00, stock_actual: 3, stock_minimo: 5, proveedor_id: 3, activo: true },
  { id: 7, codigo: 'CLAV-001', nombre: 'Clavo 2"', categoria: 'Clavos', unidad: 'kg', precio_venta: 4.50, costo: 2.20, stock_actual: 25, stock_minimo: 10, proveedor_id: 1, activo: true },
  { id: 8, codigo: 'CEM-001', nombre: 'Cemento 42.5kg', categoria: 'Construcción', unidad: 'bolsa', precio_venta: 8.90, costo: 5.50, stock_actual: 0, stock_minimo: 10, proveedor_id: 4, activo: true },
  { id: 9, codigo: 'CAL-001', nombre: 'Cal 25kg', categoria: 'Construcción', unidad: 'bolsa', precio_venta: 6.20, costo: 3.80, stock_actual: 8, stock_minimo: 5, proveedor_id: 4, activo: true },
  { id: 10, codigo: 'MART-001', nombre: 'Martillo 500g', categoria: 'Herramientas', unidad: 'unidad', precio_venta: 12.00, costo: 6.50, stock_actual: 15, stock_minimo: 3, proveedor_id: 5, activo: true }
];

export const MOCK_PROVEEDORES = [
  { id: 1, nombre: 'Ferretería Central', telefono: '2222-1111', correo: 'ventas@ferrecentral.com', dias_entrega: 3, activo: true },
  { id: 2, nombre: 'Tuberías del Norte', telefono: '2222-2222', correo: 'pedidos@tubnorte.com', dias_entrega: 5, activo: true },
  { id: 3, nombre: 'Pinturas Premium', telefono: '2222-3333', correo: 'comercial@pintpremium.com', dias_entrega: 7, activo: true },
  { id: 4, nombre: 'Materiales Básicos SA', telefono: '2222-4444', correo: 'ventas@matbasicos.com', dias_entrega: 2, activo: true },
  { id: 5, nombre: 'Herramientas Pro', telefono: '2222-5555', correo: 'pedidos@herrpro.com', dias_entrega: 10, activo: true }
];

export const MOCK_VENTAS = [
  { id: 1, client_uuid: 'a1b2c3d4-1', fecha: new Date(Date.now() - 2*60*60*1000).toISOString(), usuario_id: 2, total: 23.50, estado: 'completada', detalle_venta: [{ producto_id: 1, cantidad: 10, precio_unitario: 0.50, subtotal: 5.00 }, { producto_id: 3, cantidad: 8, precio_unitario: 2.30, subtotal: 18.40 }] },
  { id: 2, client_uuid: 'a1b2c3d4-2', fecha: new Date(Date.now() - 1*60*60*1000).toISOString(), usuario_id: 2, total: 45.00, estado: 'completada', detalle_venta: [{ producto_id: 5, cantidad: 3, precio_unitario: 15.00, subtotal: 45.00 }] },
  { id: 3, client_uuid: 'a1b2c3d4-3', fecha: new Date().toISOString(), usuario_id: 2, total: 12.80, estado: 'completada', detalle_venta: [{ producto_id: 2, cantidad: 16, precio_unitario: 0.80, subtotal: 12.80 }] }
];

export const MOCK_ALERTAS = [
  { id: 1, producto_id: 6, producto: { id: 6, codigo: 'PINT-002', nombre: 'Pintura Roja 1L', stock_minimo: 5, proveedor: { id: 3, nombre: 'Pinturas Premium' } }, fecha_creada: new Date(Date.now() - 2*24*60*60*1000).toISOString(), stock_al_generar: 3, cantidad_sugerida: 12, confianza: 'normal', estado: 'pendiente', fecha_atendida: null, atendida_por: null },
  { id: 2, producto_id: 8, producto: { id: 8, codigo: 'CEM-001', nombre: 'Cemento 42.5kg', stock_minimo: 10, proveedor: { id: 4, nombre: 'Materiales Básicos SA' } }, fecha_creada: new Date(Date.now() - 1*24*60*60*1000).toISOString(), stock_al_generar: 0, cantidad_sugerida: 20, confianza: 'baja', estado: 'pendiente', fecha_atendida: null, atendida_por: null },
  { id: 3, producto_id: 9, producto: { id: 9, codigo: 'CAL-001', nombre: 'Cal 25kg', stock_minimo: 5, proveedor: { id: 4, nombre: 'Materiales Básicos SA' } }, fecha_creada: new Date(Date.now() - 3*24*60*60*1000).toISOString(), stock_al_generar: 8, cantidad_sugerida: 0, confianza: 'normal', estado: 'atendida', fecha_atendida: new Date(Date.now() - 1*24*60*60*1000).toISOString(), atendida_por: 1 }
];

export const MOCK_ENTRADAS = [
  { id: 1, fecha: new Date(Date.now() - 2*24*60*60*1000).toISOString(), proveedor_id: 4, proveedor: { nombre: 'Materiales Básicos SA' }, producto_id: 9, producto: { nombre: 'Cal 25kg' }, cantidad: 20, costo_unitario: 3.80, usuario_id: 1 },
  { id: 2, fecha: new Date(Date.now() - 5*24*60*60*1000).toISOString(), proveedor_id: 1, proveedor: { nombre: 'Ferretería Central' }, producto_id: 1, producto: { nombre: 'Tornillo 1/4" x 1"' }, cantidad: 500, costo_unitario: 0.25, usuario_id: 1 }
];

export const MOCK_BITACORA = [
  { id: 1, fecha: new Date().toISOString(), usuario_id: 2, usuario_nombre: 'Juan Pérez', accion: 'VENTA_CREADA', entidad: 'venta', entidad_id: 'a1b2c3d4-3', resultado: 'ok', detalle: 'Venta por $12.80' },
  { id: 2, fecha: new Date(Date.now() - 30*60*1000).toISOString(), usuario_id: 1, usuario_nombre: 'Administrador', accion: 'PRODUCTO_CREADO', entidad: 'producto', entidad_id: 10, resultado: 'ok', detalle: 'Martillo 500g creado' },
  { id: 3, fecha: new Date(Date.now() - 2*60*60*1000).toISOString(), usuario_id: 2, usuario_nombre: 'Juan Pérez', accion: 'VENTA_CREADA', entidad: 'venta', entidad_id: 'a1b2c3d4-1', resultado: 'ok', detalle: 'Venta por $23.50' },
  { id: 4, fecha: new Date(Date.now() - 1*24*60*60*1000).toISOString(), usuario_id: 1, usuario_nombre: 'Administrador', accion: 'ENTRADA_REGISTRADA', entidad: 'entrada', entidad_id: 1, resultado: 'ok', detalle: '20 unidades de Cal 25kg' },
  { id: 5, fecha: new Date(Date.now() - 2*24*60*60*1000).toISOString(), usuario_id: 2, usuario_nombre: 'Juan Pérez', accion: 'LOGIN_OK', entidad: 'auth', entidad_id: null, resultado: 'ok', detalle: 'Inicio de sesión' }
];

export const MOCK_REPORTES_RESUMEN = {
  ventas_hoy: { total: 81.30, tendencia: 12 },
  alertas_pendientes: 2,
  productos_agotados: 1,
  ticket_promedio: 27.10
};

export const MOCK_VENTAS_POR_DIA = [
  { fecha: new Date(Date.now() - 6*24*60*60*1000).toISOString().split('T')[0], total: 145.20 },
  { fecha: new Date(Date.now() - 5*24*60*60*1000).toISOString().split('T')[0], total: 230.50 },
  { fecha: new Date(Date.now() - 4*24*60*60*1000).toISOString().split('T')[0], total: 180.00 },
  { fecha: new Date(Date.now() - 3*24*60*60*1000).toISOString().split('T')[0], total: 310.75 },
  { fecha: new Date(Date.now() - 2*24*60*60*1000).toISOString().split('T')[0], total: 195.30 },
  { fecha: new Date(Date.now() - 1*24*60*60*1000).toISOString().split('T')[0], total: 265.80 },
  { fecha: new Date().toISOString().split('T')[0], total: 81.30 }
];

export const MOCK_TOP_PRODUCTOS = [
  { nombre: 'Tornillo 1/4" x 1"', cantidad_vendida: 1250 },
  { nombre: 'Tubo PVC 1/2"', cantidad_vendida: 890 },
  { nombre: 'Clavo 2"', cantidad_vendida: 650 },
  { nombre: 'Pintura Blanca 1L', cantidad_vendida: 420 },
  { nombre: 'Cemento 42.5kg', cantidad_vendida: 380 }
];