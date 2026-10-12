import { api, ENDPOINTS } from './apiFactory.js';
import { searchCachedCatalogo, getCachedProducto, cacheCatalogo, queueVenta, initOffline } from './offline.js';
import { showToast, confirm, escapeHtml, formatCurrency, formatDate, generateClientUUID, debounce } from './ui.js';

// Re-export formatCurrency for other modules
export { formatCurrency } from './ui.js';
import { STORAGE_KEYS, IVA_RATE } from './config.js';

let currentCart = [];
let currentInvoiceNumber = 1;
let catalogoLoaded = false;

export function getCart() {
  return currentCart;
}

export function setCart(cart) {
  currentCart = cart || [];
}

export function getInvoiceNumber() {
  return currentInvoiceNumber;
}

export function setInvoiceNumber(num) {
  currentInvoiceNumber = num;
}

export async function loadCachedCatalogo() {
  if (catalogoLoaded) return;
  try {
    const response = await api.get(ENDPOINTS.productos.list);
    if (Array.isArray(response)) {
      cacheCatalogo(response);
      catalogoLoaded = true;
    }
  } catch (error) {
    console.warn('No se pudo cargar catálogo del servidor, usando caché local');
  }
}

export function performSearch(query) {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return searchCachedCatalogo(q);
}

export function getStockClass(stock, minimo) {
  if (stock <= 0) return 'agotado';
  if (stock <= minimo) return 'bajo';
  return 'ok';
}

export function addToCart(codigo) {
  const producto = getCachedProducto(codigo);
  if (!producto) {
    showToast('Producto no encontrado en catálogo local', 'danger');
    return false;
  }
  
  if (producto.stock_actual <= 0) {
    showToast('Producto sin stock disponible', 'warning');
    return false;
  }
  
  const existingIndex = currentCart.findIndex(item => item.codigo === codigo);
  
  if (existingIndex >= 0) {
    const newQty = currentCart[existingIndex].cantidad + 1;
    if (newQty > producto.stock_actual) {
      showToast(`Stock insuficiente. Disponible: ${producto.stock_actual}`, 'warning');
      return false;
    }
    currentCart[existingIndex].cantidad = newQty;
    currentCart[existingIndex].subtotal = newQty * producto.precio_venta;
  } else {
    currentCart.push({
      codigo: producto.codigo,
      nombre: producto.nombre,
      precio: producto.precio_venta,
      cantidad: 1,
      subtotal: producto.precio_venta,
      stock_disponible: producto.stock_actual
    });
  }
  
  saveCartToStorage();
  showToast(`Agregado: ${producto.nombre}`, 'success');
  return true;
}

export function removeFromCart(codigo) {
  currentCart = currentCart.filter(item => item.codigo !== codigo);
  saveCartToStorage();
}

export function updateQuantity(codigo, nuevaCantidad) {
  const item = currentCart.find(i => i.codigo === codigo);
  if (!item) return false;
  
  const producto = getCachedProducto(codigo);
  const maxStock = producto?.stock_actual || item.stock_disponible;
  
  if (nuevaCantidad < 1) {
    removeFromCart(codigo);
    return true;
  }
  
  if (nuevaCantidad > maxStock) {
    showToast(`Stock máximo: ${maxStock}`, 'warning');
    return false;
  }
  
  item.cantidad = nuevaCantidad;
  item.subtotal = nuevaCantidad * item.precio;
  saveCartToStorage();
  return true;
}

export function clearCart() {
  currentCart = [];
  saveCartToStorage();
}

export function getTotals() {
  const subtotal = currentCart.reduce((sum, item) => sum + item.subtotal, 0);
  const iva = subtotal * IVA_RATE;
  const total = subtotal + iva;
  const itemCount = currentCart.reduce((sum, item) => sum + item.cantidad, 0);
  return { subtotal, iva, total, itemCount };
}

export function saveCartToStorage() {
  sessionStorage.setItem(STORAGE_KEYS.VENTA_BORRADOR, JSON.stringify(currentCart));
}

export function loadCartFromStorage() {
  const saved = sessionStorage.getItem(STORAGE_KEYS.VENTA_BORRADOR);
  if (saved) {
    try {
      currentCart = JSON.parse(saved);
    } catch {
      currentCart = [];
    }
  }
}

export function clearCartStorage() {
  sessionStorage.removeItem(STORAGE_KEYS.VENTA_BORRADOR);
}

export function hasCartItems() {
  return currentCart.length > 0;
}

export function updateInvoiceNumber() {
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
  currentInvoiceNumber++;
  return `#${dateStr}-${String(currentInvoiceNumber).padStart(3, '0')}`;
}

export async function confirmSale() {
  if (currentCart.length === 0) return { success: false, error: 'Carrito vacío' };
  
  const clientUuid = generateClientUUID();
  const venta = {
    client_uuid: clientUuid,
    items: currentCart.map(item => ({
      producto_codigo: item.codigo,
      cantidad: item.cantidad
    }))
  };
  
  try {
    const response = await api.post(ENDPOINTS.ventas.create, venta);
    showToast('Venta confirmada correctamente', 'success');
    clearCart();
    clearCartStorage();
    updateInvoiceNumber();
    await initOffline(); // Re-sync offline queue
    return { success: true, venta: response };
  } catch (error) {
    if (error.isNetworkError || error.status === 0) {
      queueVenta(venta);
      showToast('Sin conexión - Venta guardada para sincronizar', 'warning');
      clearCart();
      clearCartStorage();
      updateInvoiceNumber();
      return { success: true, offline: true };
    } else if (error.status === 409) {
      return { success: false, error: error.message };
    } else {
      return { success: false, error: `Error al procesar venta: ${error.message}` };
    }
  }
}

export async function loadVentas(filters = {}) {
  try {
    const params = new URLSearchParams();
    if (filters.fecha) params.set('fecha', filters.fecha);
    
    const url = `${ENDPOINTS.ventas.list}?${params.toString()}`;
    const response = await api.get(url);
    return Array.isArray(response) ? response : [];
  } catch (error) {
    console.error('Error cargando ventas:', error);
    showToast(`Error cargando ventas: ${error.message}`, 'danger');
    return [];
  }
}

export function filterVentasByDate(ventas, fecha) {
  if (!fecha) return ventas;
  return ventas.filter(v => v.fecha?.startsWith(fecha));
}

export function calculatePeriodTotals(ventas) {
  const total = ventas.reduce((sum, v) => sum + (v.total || 0), 0);
  const count = ventas.length;
  return { total, count };
}