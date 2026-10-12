import { 
  loadCachedCatalogo, 
  performSearch, 
  addToCart, 
  removeFromCart, 
  updateQuantity, 
  clearCart, 
  getTotals, 
  loadCartFromStorage, 
  saveCartToStorage,
  clearCartStorage,
  hasCartItems,
  updateInvoiceNumber,
  confirmSale,
  getCart
} from './saleLogic.js';
import { showToast, confirm, escapeHtml, formatCurrency, debounce } from './ui.js';

let modalOverlay = null;
let isInitialized = false;
let lastFocusedElement = null;

// Element references
let elements = {};

function createModalHTML() {
  return `
    <div class="modal-overlay venta-modal-overlay" id="venta-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="venta-modal-title">
      <div class="modal modal-xl venta-modal">
        <div class="modal-header">
          <h3 class="modal-title" id="venta-modal-title">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="me-2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <polyline points="10 9 9 9 8 9"></polyline>
            </svg>
            Nueva Venta
          </h3>
          <button type="button" class="modal-close btn-cerrar" aria-label="Cerrar venta" id="venta-btn-cerrar">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        <div class="modal-body venta-modal-body">
          <div class="venta-modal-grid">
            <!-- Left: Product Search -->
            <section class="venta-panel venta-panel-search" aria-label="Buscar productos">
              <header class="venta-panel-header">
                <h4 class="venta-panel-title">Buscar Producto <kbd class="kbd ms-2">F2</kbd></h4>
              </header>
              <div class="venta-panel-body">
                <div class="search-box">
                  <div class="search-input-wrapper">
                    <svg class="search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <circle cx="11" cy="11" r="8"></circle>
                      <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                    </svg>
                    <input type="search" id="venta-search-input" class="form-control" 
                           placeholder="Código o nombre del producto..." 
                           autocomplete="off" aria-label="Buscar producto por código o nombre">
                    <kbd class="search-shortcut">F2</kbd>
                  </div>
                </div>
                <div id="venta-search-results" class="search-results" role="listbox" aria-label="Resultados de búsqueda"></div>
                <div id="venta-search-empty" class="empty-state d-none" style="padding: var(--space-6);">
                  <svg class="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                  </svg>
                  <p class="empty-state-title">Sin resultados</p>
                  <p class="empty-state-message">Intenta con otro código o nombre</p>
                </div>
              </div>
            </section>
            
            <!-- Right: Cart -->
            <aside class="venta-panel venta-panel-cart" aria-label="Factura actual">
              <header class="venta-panel-header">
                <div class="venta-title-row">
                  <span class="venta-number">Factura <strong id="venta-invoice-number">#NEW-001</strong></span>
                  <span class="venta-status pendiente" id="venta-invoice-status">Pendiente</span>
                </div>
                <div class="venta-customer">
                  <span id="venta-customer-info">Cliente: Público general</span>
                </div>
              </header>
              
              <div class="venta-lines" id="venta-invoice-lines" role="list" aria-label="Líneas de la factura">
                <div class="venta-empty" id="venta-invoice-empty">
                  <svg class="venta-empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                    <line x1="16" y1="13" x2="8" y2="13"></line>
                    <line x1="16" y1="17" x2="8" y2="17"></line>
                    <polyline points="10 9 9 9 8 9"></polyline>
                  </svg>
                  <p class="venta-empty-title">Factura vacía</p>
                  <p class="venta-empty-hint">Busca un producto con <kbd class="kbd">F2</kbd> para empezar</p>
                </div>
              </div>
              
              <footer class="venta-footer">
                <div class="venta-totals" id="venta-invoice-totals">
                  <div class="venta-total-row">
                    <span class="venta-total-label">Subtotal</span>
                    <span class="venta-total-value" id="venta-subtotal">C$ 0.00</span>
                  </div>
                  <div class="venta-total-row">
                    <span class="venta-total-label">IVA (19%)</span>
                    <span class="venta-total-value" id="venta-iva">C$ 0.00</span>
                  </div>
                  <div class="venta-total-row grand">
                    <span class="venta-total-label">TOTAL</span>
                    <span class="venta-total-value" id="venta-total">C$ 0.00</span>
                  </div>
                  <div class="venta-total-row items-count">
                    <span class="venta-total-label">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="me-1">
                        <path d="M16 11V5a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h8"></path>
                        <path d="M16 5v6h6"></path>
                      </svg>
                      Ítems
                    </span>
                    <span class="venta-total-value" id="venta-items-count">0</span>
                  </div>
                </div>
                
                <div class="venta-actions">
                  <button type="button" id="venta-btn-confirm" class="btn btn-success btn-lg" disabled aria-label="Confirmar venta (F8)">
                    <kbd class="kbd me-1">F8</kbd> Confirmar Venta
                  </button>
                  <button type="button" id="venta-btn-clear" class="btn btn-outline-secondary btn-lg" aria-label="Limpiar factura (Esc)">
                    <kbd class="kbd me-1">Esc</kbd> Nueva Factura
                  </button>
                </div>
              </footer>
            </aside>
          </div>
        </div>
      </div>
    </div>
  `;
}

function getElements() {
  return {
    overlay: document.getElementById('venta-modal-overlay'),
    modal: document.querySelector('.venta-modal'),
    searchInput: document.getElementById('venta-search-input'),
    searchResults: document.getElementById('venta-search-results'),
    searchEmpty: document.getElementById('venta-search-empty'),
    invoiceLines: document.getElementById('venta-invoice-lines'),
    invoiceEmpty: document.getElementById('venta-invoice-empty'),
    invoiceTotals: document.getElementById('venta-invoice-totals'),
    subtotalEl: document.getElementById('venta-subtotal'),
    ivaEl: document.getElementById('venta-iva'),
    totalEl: document.getElementById('venta-total'),
    itemsCountEl: document.getElementById('venta-items-count'),
    btnConfirm: document.getElementById('venta-btn-confirm'),
    btnClear: document.getElementById('venta-btn-clear'),
    btnCerrar: document.getElementById('venta-btn-cerrar'),
    invoiceNumberEl: document.getElementById('venta-invoice-number'),
  };
}

function setupEventListeners() {
  const { searchInput, searchResults, btnConfirm, btnClear, btnCerrar, overlay } = elements;
  
  // Search input
  const searchDebounced = debounce(performSearchHandler, 150);
  
  searchInput.addEventListener('input', (e) => {
    searchDebounced(e.target.value);
  });
  
  searchInput.addEventListener('focus', () => {
    if (searchInput.value.trim()) {
      performSearchHandler(searchInput.value.trim());
    }
  });
  
  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const firstResult = searchResults.querySelector('[data-codigo]');
      if (firstResult) {
        addToCart(firstResult.dataset.codigo);
        renderCart();
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      focusFirstResult();
    } else if (e.key === 'Escape') {
      searchInput.blur();
      searchResults.innerHTML = '';
      elements.searchEmpty.classList.add('d-none');
    }
  });
  
  // Buttons
  btnConfirm.addEventListener('click', handleConfirmSale);
  btnClear.addEventListener('click', handleClearCart);
  btnCerrar.addEventListener('click', () => closeModal(false));
  
  // Close on overlay click - NO (requirement: clic fuera NO cierra)
  // overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });
  
  // Keyboard shortcuts for modal
  document.addEventListener('keydown', handleGlobalKeydown);
  
  // Focus trap
  overlay.addEventListener('focusin', handleFocusTrap);
}

function performSearchHandler(query) {
  const q = query.trim().toLowerCase();
  if (!q) {
    elements.searchResults.innerHTML = '';
    elements.searchEmpty.classList.add('d-none');
    return;
  }
  
  const results = performSearch(q);
  
  if (results.length === 0) {
    elements.searchResults.innerHTML = '';
    elements.searchEmpty.classList.remove('d-none');
    return;
  }
  
  elements.searchEmpty.classList.add('d-none');
  elements.searchResults.innerHTML = results.map(producto => `
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
  
  elements.searchResults.querySelectorAll('[data-codigo]').forEach(item => {
    item.addEventListener('click', () => {
      addToCart(item.dataset.codigo);
      renderCart();
    });
    item.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        addToCart(item.dataset.codigo);
        renderCart();
      }
    });
  });
}

function focusFirstResult() {
  const first = elements.searchResults.querySelector('[data-codigo]');
  if (first) first.focus();
}

function getStockClass(stock, minimo) {
  if (stock <= 0) return 'agotado';
  if (stock <= minimo) return 'bajo';
  return 'ok';
}

function handleGlobalKeydown(e) {
  if (!elements.overlay.classList.contains('show')) return;
  
  // F2 - Focus search
  if (e.key === 'F2') {
    e.preventDefault();
    elements.searchInput.focus();
    return;
  }
  
  // Enter - Add to cart (when search has focus)
  if (e.key === 'Enter' && document.activeElement === elements.searchInput) {
    e.preventDefault();
    const firstResult = elements.searchResults.querySelector('[data-codigo]');
    if (firstResult) {
      addToCart(firstResult.dataset.codigo);
      renderCart();
    }
    return;
  }
  
  // F8 - Confirm sale
  if (e.key === 'F8') {
    e.preventDefault();
    handleConfirmSale();
    return;
  }
  
  // Escape - Clear cart or close modal
  if (e.key === 'Escape') {
    e.preventDefault();
    if (hasCartItems()) {
      handleClearCart();
    } else {
      closeModal(false);
    }
    return;
  }
}

function handleFocusTrap(e) {
  if (!elements.overlay.classList.contains('show')) return;
  
  const focusableElements = elements.modal.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];
  
  if (e.key === 'Tab') {
    if (e.shiftKey && document.activeElement === firstElement) {
      e.preventDefault();
      lastElement.focus();
    } else if (!e.shiftKey && document.activeElement === lastElement) {
      e.preventDefault();
      firstElement.focus();
    }
  }
}

function renderCart() {
  const cart = getCart();
  
  if (cart.length === 0) {
    elements.invoiceLines.innerHTML = '';
    elements.invoiceEmpty.style.display = 'flex';
    elements.invoiceTotals.style.display = 'flex';
    elements.btnConfirm.disabled = true;
    updateTotals();
    return;
  }
  
  elements.invoiceEmpty.style.display = 'none';
  elements.invoiceTotals.style.display = 'flex';
  elements.btnConfirm.disabled = false;
  
  elements.invoiceLines.innerHTML = cart.map(item => `
    <div class="venta-line" data-codigo="${escapeHtml(item.codigo)}" role="listitem">
      <div class="venta-line-product">
        <div class="venta-line-name">${escapeHtml(item.nombre)}</div>
        <div class="venta-line-sku">${escapeHtml(item.codigo)}</div>
      </div>
      <div class="venta-line-price">${formatCurrency(item.precio)}</div>
      <div class="venta-line-qty">
        <button class="qty-btn" data-action="decrease" aria-label="Disminuir cantidad" ${item.cantidad <= 1 ? 'disabled' : ''}>
          <svg class="icon icon-muted" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><line x1="5" y1="12" x2="19" y2="12"></line></svg>
        </button>
        <input type="number" class="qty-input" value="${item.cantidad}" min="1" max="${item.stock_disponible}" aria-label="Cantidad">
        <button class="qty-btn" data-action="increase" aria-label="Aumentar cantidad" ${item.cantidad >= item.stock_disponible ? 'disabled' : ''}>
          <svg class="icon icon-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
        </button>
      </div>
      <div class="venta-line-subtotal">${formatCurrency(item.subtotal)}</div>
      <button class="venta-line-remove" aria-label="Eliminar ${escapeHtml(item.nombre)}">
        <svg class="icon icon-danger" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
      </button>
    </div>
  `).join('');
  
  // Quantity buttons
  elements.invoiceLines.querySelectorAll('.qty-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const line = e.currentTarget.closest('.venta-line');
      const codigo = line.dataset.codigo;
      const action = e.currentTarget.dataset.action;
      const item = getCart().find(i => i.codigo === codigo);
      if (item) {
        updateQuantity(codigo, item.cantidad + (action === 'increase' ? 1 : -1));
        renderCart();
      }
    });
  });
  
  // Quantity inputs
  elements.invoiceLines.querySelectorAll('.qty-input').forEach(input => {
    input.addEventListener('change', (e) => {
      const line = e.currentTarget.closest('.venta-line');
      const codigo = line.dataset.codigo;
      const qty = parseInt(e.currentTarget.value) || 1;
      updateQuantity(codigo, qty);
      renderCart();
    });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') e.currentTarget.blur();
    });
  });
  
  // Remove buttons
  elements.invoiceLines.querySelectorAll('.venta-line-remove').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const line = e.currentTarget.closest('.venta-line');
      removeFromCart(line.dataset.codigo);
      renderCart();
    });
  });
  
  updateTotals();
}

function updateTotals() {
  const { subtotal, iva, total, itemCount } = getTotals();
  
  elements.subtotalEl.textContent = formatCurrency(subtotal);
  elements.ivaEl.textContent = formatCurrency(iva);
  elements.totalEl.textContent = formatCurrency(total);
  elements.itemsCountEl.textContent = itemCount;
}

async function handleConfirmSale() {
  if (!hasCartItems()) return;
  
  elements.btnConfirm.disabled = true;
  elements.btnConfirm.innerHTML = '<span class="spinner spinner-sm me-2"></span> Procesando...';
  
  const result = await confirmSale();
  
  if (result.success) {
    // Keep modal open for next sale, update invoice number
    elements.invoiceNumberEl.textContent = updateInvoiceNumber();
    renderCart();
    elements.searchInput.focus();
    
    // Trigger custom event for historial page to refresh
    window.dispatchEvent(new CustomEvent('venta:confirmada'));
  }
  
  elements.btnConfirm.disabled = !hasCartItems();
  elements.btnConfirm.innerHTML = '<kbd class="kbd me-1">F8</kbd> Confirmar Venta';
}

async function handleClearCart() {
  if (!hasCartItems()) {
    clearCart();
    renderCart();
    elements.searchInput.focus();
    return;
  }
  
  const confirmed = await confirm(
    'Tienes una venta en curso, ¿descartarla?',
    'Descartar venta'
  );
  
  if (confirmed) {
    clearCart();
    clearCartStorage();
    renderCart();
    elements.searchInput.focus();
  }
}

function openModal() {
  if (!isInitialized) {
    initializeModal();
  }
  
  lastFocusedElement = document.activeElement;
  
  // Load catalog and cart
  loadCachedCatalogo();
  loadCartFromStorage();
  renderCart();
  elements.invoiceNumberEl.textContent = updateInvoiceNumber();
  
  // Show modal
  elements.overlay.classList.add('show');
  document.body.style.overflow = 'hidden';
  
  // Focus search input
  setTimeout(() => elements.searchInput.focus(), 100);
  
  // Dispatch event
  window.dispatchEvent(new CustomEvent('venta:modal:open'));
}

function closeModal(force = false) {
  if (!elements.overlay || !elements.overlay.classList.contains('show')) return;
  
  if (!force && hasCartItems()) {
    handleClearCart();
    return;
  }
  
  elements.overlay.classList.remove('show');
  document.body.style.overflow = '';
  
  // Return focus to floating button
  const fab = document.getElementById('venta-fab');
  if (fab) fab.focus();
  
  // Dispatch event
  window.dispatchEvent(new CustomEvent('venta:modal:close'));
}

function initializeModal() {
  // Inject modal HTML
  const modalHTML = createModalHTML();
  document.body.insertAdjacentHTML('beforeend', modalHTML);
  
  // Get elements
  elements = getElements();
  
  // Setup event listeners
  setupEventListeners();
  
  isInitialized = true;
}

function createFloatingButton() {
  const fab = document.createElement('button');
  fab.id = 'venta-fab';
  fab.className = 'btn btn-fab';
  fab.setAttribute('aria-label', 'Nueva venta');
  fab.innerHTML = `
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
      <line x1="12" y1="5" x2="12" y2="19"></line>
      <line x1="5" y1="12" x2="19" y2="12"></line>
    </svg>
    <span>Nueva venta</span>
  `;
  
  fab.addEventListener('click', openModal);
  
  document.body.appendChild(fab);
  
  return fab;
}

// Global 'N' key shortcut
function registerGlobalShortcut() {
  document.addEventListener('keydown', (e) => {
    if (e.key.toLowerCase() === 'n' && !e.ctrlKey && !e.shiftKey && !e.altKey) {
      const activeTag = e.target.tagName;
      if (activeTag === 'INPUT' || activeTag === 'SELECT' || activeTag === 'TEXTAREA') {
        return;
      }
      e.preventDefault();
      openModal();
    }
  });
}

import { api } from './apiFactory.js'; // si ya está importado arriba, no lo repitas

const PUBLIC_PAGES = ['login.html', 'index.html'];

export function initVentaModal() {
  const page = window.location.pathname.split('/').pop() || 'index.html';
  if (PUBLIC_PAGES.includes(page)) return;          // no en login/index
  if (!api.isAuthenticated()) return;               // no sin sesión
  if (document.getElementById('venta-fab')) return; // ya inicializado

  createFloatingButton();
  registerGlobalShortcut();

  // Listen for historial refresh
  window.addEventListener('venta:confirmada', () => {
    if (typeof window.refreshHistorial === 'function') {
      window.refreshHistorial();
    }
  });
}

export { openModal, closeModal };
