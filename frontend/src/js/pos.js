import { api, ENDPOINTS } from './apiFactory.js';
import { searchCachedCatalogo, getCachedProducto, cacheCatalogo, queueVenta, getVentasCola, forceSync, initOffline } from './offline.js';
import { showToast, confirm, escapeHtml, formatCurrency, formatDate, generateClientUUID, debounce } from './ui.js';
import { setPosCallbacks } from './keyboard.js';

let currentCart = [];
let currentInvoiceNumber = 1;
let searchDebounced = null;
let historialLoaded = false;

const IVA_RATE = 0.19;

const searchInput = document.getElementById('search-input');
const searchResults = document.getElementById('search-results');
const searchEmpty = document.getElementById('search-empty');
const invoiceLines = document.getElementById('invoice-lines');
const invoiceEmpty = document.getElementById('invoice-empty');
const invoiceTotals = document.getElementById('invoice-totals');
const subtotalEl = document.getElementById('subtotal');
const ivaEl = document.getElementById('iva');
const totalEl = document.getElementById('total');
const btnConfirm = document.getElementById('btn-confirm-sale');
const btnClear = document.getElementById('btn-clear-sale');
const btnNewSale = document.getElementById('btn-new-sale');
const invoiceNumberEl = document.getElementById('invoice-number');
const historialPanel = document.getElementById('historial-panel');
const historialHeader = document.getElementById('historial-header');
const historialBody = document.getElementById('historial-body');
const historialTableBody = document.querySelector('#historial-table tbody');
const historialCount = document.getElementById('historial-count');
const historialEmpty = document.getElementById('historial-empty');

function init() {
  loadCachedCatalogo();
  loadCartFromStorage();
  setupEventListeners();
  setupKeyboardCallbacks();
  updateInvoiceNumber();
  renderCart();
  initOffline();
}

function setupEventListeners() {
  searchDebounced = debounce(performSearch, 150);
  
  searchInput.addEventListener('input', (e) => {
    searchDebounced(e.target.value);
  });
  
  searchInput.addEventListener('focus', () => {
    if (searchInput.value.trim()) {
      performSearch(searchInput.value.trim());
    }
  });
  
  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const firstResult = searchResults.querySelector('[data-codigo]');
      if (firstResult) {
        addToCart(firstResult.dataset.codigo);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      focusFirstResult();
    } else if (e.key === 'Escape') {
      searchInput.blur();
      searchResults.innerHTML = '';
      searchEmpty.classList.add('d-none');
    }
  });
  
  btnConfirm.addEventListener('click', confirmSale);
  btnClear.addEventListener('click', clearCart);
  btnNewSale.addEventListener('click', clearCart);
  
  historialHeader.addEventListener('click', toggleHistorial);
  historialHeader.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggleHistorial();
    }
  });
  
  document.addEventListener('click', (e) => {
    if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
      searchResults.innerHTML = '';
      searchEmpty.classList.add('d-none');
    }
  });
}

function setupKeyboardCallbacks() {
  setPosCallbacks({
    onFocusSearch: () => searchInput.focus(),
    onAddToCart: () => {
      const firstResult = searchResults.querySelector('[data-codigo]');
      if (firstResult) addToCart(firstResult.dataset.codigo);
    },
    onConfirmSale: confirmSale,
    onClearCart: clearCart
  });
}

async function loadCachedCatalogo() {
  try {
    const response = await api.get(ENDPOINTS.productos.list);
    if (Array.isArray(response)) {
      cacheCatalogo(response);
    }
  } catch (error) {
    console.warn('No se pudo cargar catálogo del servidor, usando caché local');
  }
}

function performSearch(query) {
  const q = query.trim().toLowerCase();
  if (!q) {
    searchResults.innerHTML = '';
    searchEmpty.classList.add('d-none');
    return;
  }
  
  const results = searchCachedCatalogo(q);
  
  if (results.length === 0) {
    searchResults.innerHTML = '';
    searchEmpty.classList.remove('d-none');
    return;
  }
  
  searchEmpty.classList.add('d-none');
  searchResults.innerHTML = results.map(producto => `
    <div class="search-result-item" role="option" data-codigo="${escapeHtml(producto.codigo)}" tabindex="0">
      <div class="search-result-info">
        <div class="search-result-name">${escapeHtml(producto.nombre)}</div>
        <div class="search-result-meta">
          <span class="search-result-price">${formatCurrency(producto.precio_venta)}</span>
          <span class="search-result-stock ${getStockClass(producto.stock_actual, producto.stock_minimo)}">
            Stock: ${producto.stock_actual}
          </span>
        </div>
      </div>
<button class="search-result-add" aria-label="Agregar ${escapeHtml(producto.nombre)}" ${producto.stock_actual <= 0 ? 'disabled' : ''}>
          <svg class="icon icon-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
        </button>
    </div>
  `).join('');
  
  searchResults.querySelectorAll('[data-codigo]').forEach(item => {
    item.addEventListener('click', () => addToCart(item.dataset.codigo));
    item.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        addToCart(item.dataset.codigo);
      }
    });
  });
}

function focusFirstResult() {
  const first = searchResults.querySelector('[data-codigo]');
  if (first) first.focus();
}

function getStockClass(stock, minimo) {
  if (stock <= 0) return 'agotado';
  if (stock <= minimo) return 'bajo';
  return 'ok';
}

function addToCart(codigo) {
  const producto = getCachedProducto(codigo);
  if (!producto) {
    showToast('Producto no encontrado en catálogo local', 'danger');
    return;
  }
  
  if (producto.stock_actual <= 0) {
    showToast('Producto sin stock disponible', 'warning');
    return;
  }
  
  const existingIndex = currentCart.findIndex(item => item.codigo === codigo);
  
  if (existingIndex >= 0) {
    const newQty = currentCart[existingIndex].cantidad + 1;
    if (newQty > producto.stock_actual) {
      showToast(`Stock insuficiente. Disponible: ${producto.stock_actual}`, 'warning');
      return;
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
  renderCart();
  searchInput.value = '';
  searchResults.innerHTML = '';
  searchInput.focus();
  showToast(`Agregado: ${producto.nombre}`, 'success');
}

function removeFromCart(codigo) {
  currentCart = currentCart.filter(item => item.codigo !== codigo);
  saveCartToStorage();
  renderCart();
}

function updateQuantity(codigo, nuevaCantidad) {
  const item = currentCart.find(i => i.codigo === codigo);
  if (!item) return;
  
  const producto = getCachedProducto(codigo);
  const maxStock = producto?.stock_actual || item.stock_disponible;
  
  if (nuevaCantidad < 1) {
    removeFromCart(codigo);
    return;
  }
  
  if (nuevaCantidad > maxStock) {
    showToast(`Stock máximo: ${maxStock}`, 'warning');
    return;
  }
  
  item.cantidad = nuevaCantidad;
  item.subtotal = nuevaCantidad * item.precio;
  saveCartToStorage();
  renderCart();
}

function renderCart() {
  if (currentCart.length === 0) {
    invoiceLines.innerHTML = '';
    invoiceEmpty.style.display = 'flex';
    invoiceTotals.style.display = 'none';
    btnConfirm.disabled = true;
    return;
  }
  
  invoiceEmpty.style.display = 'none';
  invoiceTotals.style.display = 'flex';
  btnConfirm.disabled = false;
  
  invoiceLines.innerHTML = currentCart.map(item => `
    <div class="invoice-line" data-codigo="${escapeHtml(item.codigo)}" role="listitem">
      <div class="invoice-line-product">
        <div class="invoice-line-name">${escapeHtml(item.nombre)}</div>
        <div class="invoice-line-sku">${escapeHtml(item.codigo)}</div>
      </div>
      <div class="invoice-line-price">${formatCurrency(item.precio)}</div>
<div class="invoice-line-qty">
        <button class="qty-btn" data-action="decrease" aria-label="Disminuir cantidad" ${item.cantidad <= 1 ? 'disabled' : ''}>
          <svg class="icon icon-muted" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><line x1="5" y1="12" x2="19" y2="12"></line></svg>
        </button>
        <input type="number" class="qty-input" value="${item.cantidad}" min="1" max="${item.stock_disponible}" aria-label="Cantidad">
        <button class="qty-btn" data-action="increase" aria-label="Aumentar cantidad" ${item.cantidad >= item.stock_disponible ? 'disabled' : ''}>
          <svg class="icon icon-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
        </button>
      </div>
      <div class="invoice-line-subtotal">${formatCurrency(item.subtotal)}</div>
      <button class="invoice-line-remove" aria-label="Eliminar ${escapeHtml(item.nombre)}">
        <svg class="icon icon-danger" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
      </button>
    </div>
  `).join('');
  
  invoiceLines.querySelectorAll('.qty-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const line = e.currentTarget.closest('.invoice-line');
      const codigo = line.dataset.codigo;
      const action = e.currentTarget.dataset.action;
      const item = currentCart.find(i => i.codigo === codigo);
      if (item) {
        updateQuantity(codigo, item.cantidad + (action === 'increase' ? 1 : -1));
      }
    });
  });
  
  invoiceLines.querySelectorAll('.qty-input').forEach(input => {
    input.addEventListener('change', (e) => {
      const line = e.currentTarget.closest('.invoice-line');
      const codigo = line.dataset.codigo;
      const qty = parseInt(e.currentTarget.value) || 1;
      updateQuantity(codigo, qty);
    });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') e.currentTarget.blur();
    });
  });
  
  invoiceLines.querySelectorAll('.invoice-line-remove').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const line = e.currentTarget.closest('.invoice-line');
      removeFromCart(line.dataset.codigo);
    });
  });
  
  updateTotals();
}

function updateTotals() {
  const subtotal = currentCart.reduce((sum, item) => sum + item.subtotal, 0);
  const iva = subtotal * IVA_RATE;
  const total = subtotal + iva;
  
  subtotalEl.textContent = formatCurrency(subtotal);
  ivaEl.textContent = formatCurrency(iva);
  totalEl.textContent = formatCurrency(total);
}

async function confirmSale() {
  if (currentCart.length === 0) return;
  
  const clientUuid = generateClientUUID();
  const venta = {
    client_uuid: clientUuid,
    items: currentCart.map(item => ({
      producto_codigo: item.codigo,
      cantidad: item.cantidad,
      precio_unitario: item.precio
    }))
  };
  
  btnConfirm.disabled = true;
  btnConfirm.innerHTML = '<span class="spinner spinner-sm me-2"></span> Procesando...';
  
  try {
    const response = await api.post(ENDPOINTS.ventas.create, venta);
    showToast('Venta confirmada correctamente', 'success');
    clearCart();
    await loadHistorial();
    updateInvoiceNumber();
  } catch (error) {
    if (error.isNetworkError || error.status === 0) {
      queueVenta(venta);
      showToast('Sin conexión - Venta guardada para sincronizar', 'warning');
      clearCart();
    } else if (error.status === 409) {
      showToast(`Error: ${error.message}`, 'danger');
    } else {
      showToast(`Error al procesar venta: ${error.message}`, 'danger');
    }
  } finally {
    btnConfirm.disabled = false;
    btnConfirm.innerHTML = '<kbd class="kbd me-1">F8</kbd> Confirmar Venta';
  }
}

function clearCart() {
  currentCart = [];
  saveCartToStorage();
  renderCart();
  searchInput.focus();
}

function saveCartToStorage() {
  sessionStorage.setItem('ferreteria_pos_cart', JSON.stringify(currentCart));
}

function loadCartFromStorage() {
  const saved = sessionStorage.getItem('ferreteria_pos_cart');
  if (saved) {
    try {
      currentCart = JSON.parse(saved);
    } catch {
      currentCart = [];
    }
  }
}

function updateInvoiceNumber() {
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
  invoiceNumberEl.textContent = `#${dateStr}-${String(currentInvoiceNumber).padStart(3, '0')}`;
}

function toggleHistorial() {
  const isOpen = historialPanel.classList.toggle('open');
  historialHeader.setAttribute('aria-expanded', isOpen);
  if (isOpen && !historialLoaded) {
    loadHistorial();
  }
}

async function loadHistorial() {
  try {
    const response = await api.get(ENDPOINTS.ventas.list);
    const ventas = Array.isArray(response) ? response : [];
    
    const hoy = new Date().toISOString().split('T')[0];
    const ventasHoy = ventas.filter(v => v.fecha?.startsWith(hoy));
    
    historialCount.textContent = ventasHoy.length;
    
    if (ventasHoy.length === 0) {
      historialTableBody.innerHTML = '';
      historialEmpty.classList.remove('d-none');
      return;
    }
    
    historialEmpty.classList.add('d-none');
    historialTableBody.innerHTML = ventasHoy.map(v => `
      <tr>
        <td>${formatDate(v.fecha).split(', ')[1] || ''}</td>
        <td><code>${v.client_uuid?.slice(0, 8) || v.id}</code></td>
        <td>${v.detalle_venta?.length || v.items?.length || 0} items</td>
        <td class="text-end fw-semibold">${formatCurrency(v.total)}</td>
        <td>
          <span class="badge badge-${v.estado === 'anulada' ? 'danger' : 'success'}">
            ${v.estado === 'anulada' ? 'Anulada' : 'Completada'}
          </span>
        </td>
      </tr>
    `).join('');
    
    historialLoaded = true;
  } catch (error) {
    console.error('Error cargando historial:', error);
    historialEmpty.classList.remove('d-none');
    historialEmpty.querySelector('.empty-state-title').textContent = 'Error al cargar';
    historialEmpty.querySelector('.empty-state-message').textContent = error.message;
  }
}

document.addEventListener('DOMContentLoaded', init);
