import { api, ENDPOINTS, ROLES } from './apiFactory.js';
import { showToast, confirm, escapeHtml, formatCurrency } from './ui.js';

let currentProductId = null;
let isEditing = false;

const tableBody = document.querySelector('#productos-table tbody');
const emptyState = document.getElementById('empty-state');
const btnNewProduct = document.getElementById('btn-new-product');
const filterSearch = document.getElementById('filter-search');
const filterCategory = document.getElementById('filter-category');
const filterStock = document.getElementById('filter-stock');
const modal = document.getElementById('product-modal');
const form = document.getElementById('product-form');
const modalTitle = document.getElementById('product-modal-title');
const categoriasList = document.getElementById('categorias-list');
const proveedorSelect = document.getElementById('p_proveedor_id');

let currentFilters = { search: '', categoria: '', stock: '' };
let categoriasCache = [];

function init() {
  checkPermissions();
  setupEventListeners();
  loadCategorias();
  loadProveedores();
  loadProductos();
}

function checkPermissions() {
  const user = api.getUser();
  const isAdmin = user?.rol === ROLES.ADMIN;
  
  if (isAdmin) {
    btnNewProduct.classList.remove('d-none');
    document.querySelectorAll('.admin-only').forEach(el => el.classList.remove('d-none'));
  } else {
    btnNewProduct.classList.add('d-none');
    document.querySelectorAll('.admin-only').forEach(el => el.classList.add('d-none'));
  }
}

function setupEventListeners() {
  btnNewProduct?.addEventListener('click', () => openModal());
  
  filterSearch.addEventListener('input', debounce(() => {
    currentFilters.search = filterSearch.value.trim();
    loadProductos();
  }, 300));
  
  filterCategory.addEventListener('change', () => {
    currentFilters.categoria = filterCategory.value;
    loadProductos();
  });
  
  filterStock.addEventListener('change', () => {
    currentFilters.stock = filterStock.value;
    loadProductos();
  });
  
  form.addEventListener('submit', handleSubmit);
  
  modal.querySelectorAll('[data-dismiss="modal"], .modal-close').forEach(btn => {
    btn.addEventListener('click', closeModal);
  });
  
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });
  
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('show')) {
      closeModal();
    }
  });
}

async function loadCategorias() {
  try {
    const productos = await api.get(ENDPOINTS.productos.list);
    const categorias = [...new Set(productos.map(p => p.categoria).filter(Boolean))].sort();
    categoriasCache = categorias;
    categoriasList.innerHTML = categorias.map(c => `<option value="${escapeHtml(c)}">`).join('');
  } catch (error) {
    console.warn('No se pudieron cargar categorías:', error);
  }
}

async function loadProveedores() {
  try {
    const proveedores = await api.get(ENDPOINTS.proveedores.list);
    proveedorSelect.innerHTML = '<option value="">Sin proveedor</option>' +
      proveedores.filter(p => p.activo).map(p => 
        `<option value="${p.id}">${escapeHtml(p.nombre)}</option>`
      ).join('');
  } catch (error) {
    console.warn('No se pudieron cargar proveedores:', error);
  }
}

async function loadProductos() {
  try {
    const params = new URLSearchParams();
    if (currentFilters.search) params.set('q', currentFilters.search);
    if (currentFilters.categoria) params.set('categoria', currentFilters.categoria);
    if (currentFilters.stock) params.set('stock', currentFilters.stock);
    
    const url = `${ENDPOINTS.productos.list}?${params.toString()}`;
    const productos = await api.get(url);
    
    renderProductos(productos);
  } catch (error) {
    showToast(`Error cargando productos: ${error.message}`, 'danger');
    tableBody.innerHTML = '';
    emptyState.classList.remove('d-none');
  }
}

function renderProductos(productos) {
  if (!productos || productos.length === 0) {
    tableBody.innerHTML = '';
    emptyState.classList.remove('d-none');
    return;
  }
  
  emptyState.classList.add('d-none');
  tableBody.innerHTML = productos.map(p => `
    <tr data-id="${p.id}">
      <td><code>${escapeHtml(p.codigo)}</code></td>
      <td>${escapeHtml(p.nombre)}</td>
      <td>${escapeHtml(p.categoria || '-')}</td>
      <td class="d-none d-md-table-cell">${formatCurrency(p.precio_venta)}</td>
      <td class="d-none d-lg-table-cell admin-only">${formatCurrency(p.costo)}</td>
      <td>
        <span class="badge badge-stock-${getStockClass(p.stock_actual, p.stock_minimo)}">
          ${p.stock_actual}
        </span>
      </td>
      <td>
        <span class="badge ${p.activo ? 'badge-success' : 'badge-secondary'}">
          ${p.activo ? 'Activo' : 'Inactivo'}
        </span>
      </td>
      <td class="text-end admin-only">
        <div class="btn-group">
          <button class="btn btn-ghost btn-sm" data-action="edit" aria-label="Editar ${escapeHtml(p.nombre)}">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
            </svg>
          </button>
          <button class="btn btn-ghost btn-sm ${p.activo ? 'btn-outline-danger' : 'btn-outline-success'}" 
                  data-action="toggle" aria-label="${p.activo ? 'Desactivar' : 'Activar'} ${escapeHtml(p.nombre)}">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              ${p.activo ? '<circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line>' : '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline>'}
            </svg>
          </button>
        </div>
      </td>
    </tr>
  `).join('');
  
  tableBody.querySelectorAll('[data-action="edit"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const row = e.currentTarget.closest('tr');
      openModal(row.dataset.id);
    });
  });
  
  tableBody.querySelectorAll('[data-action="toggle"]').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const row = e.currentTarget.closest('tr');
      const id = row.dataset.id;
      const isActive = !btn.classList.contains('btn-outline-success');
      await toggleProductStatus(id, !isActive);
    });
  });
}

function getStockClass(stock, minimo) {
  if (stock <= 0) return 'agotado';
  if (stock <= minimo) return 'bajo';
  return 'ok';
}

function openModal(productId = null) {
  isEditing = !!productId;
  currentProductId = productId;
  
  form.reset();
  form.classList.remove('was-validated');
  document.getElementById('product-id').value = productId || '';
  
  if (isEditing) {
    modalTitle.textContent = 'Editar Producto';
    loadProductoForEdit(productId);
  } else {
    modalTitle.textContent = 'Nuevo Producto';
    document.getElementById('p_activo').checked = true;
  }
  
  modal.classList.add('show');
  document.body.style.overflow = 'hidden';
  
  setTimeout(() => {
    document.getElementById('p_codigo').focus();
  }, 100);
}

async function loadProductoForEdit(id) {
  try {
    const producto = await api.get(ENDPOINTS.productos.detail(id));
    document.getElementById('p_codigo').value = producto.codigo;
    document.getElementById('p_nombre').value = producto.nombre;
    document.getElementById('p_categoria').value = producto.categoria || '';
    document.getElementById('p_unidad').value = producto.unidad || 'unidad';
    document.getElementById('p_precio_venta').value = producto.precio_venta;
    document.getElementById('p_costo').value = producto.costo;
    document.getElementById('p_stock_actual').value = producto.stock_actual;
    document.getElementById('p_stock_minimo').value = producto.stock_minimo;
    document.getElementById('p_proveedor_id').value = producto.proveedor_id || '';
    document.getElementById('p_activo').checked = producto.activo;
    
    document.getElementById('p_codigo').readOnly = true;
  } catch (error) {
    showToast(`Error cargando producto: ${error.message}`, 'danger');
    closeModal();
  }
}

function closeModal() {
  modal.classList.remove('show');
  document.body.style.overflow = '';
  currentProductId = null;
  isEditing = false;
}

async function handleSubmit(e) {
  e.preventDefault();
  
  if (!form.checkValidity()) {
    form.classList.add('was-validated');
    return;
  }
  
  const submitBtn = form.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<span class="spinner spinner-sm me-2"></span> Guardando...';
  
  const data = {
    codigo: document.getElementById('p_codigo').value.trim(),
    nombre: document.getElementById('p_nombre').value.trim(),
    categoria: document.getElementById('p_categoria').value.trim() || null,
    unidad: document.getElementById('p_unidad').value.trim() || 'unidad',
    precio_venta: parseFloat(document.getElementById('p_precio_venta').value),
    costo: parseFloat(document.getElementById('p_costo').value),
    stock_actual: parseInt(document.getElementById('p_stock_actual').value) || 0,
    stock_minimo: parseInt(document.getElementById('p_stock_minimo').value) || 5,
    proveedor_id: document.getElementById('p_proveedor_id').value || null,
    activo: document.getElementById('p_activo').checked
  };
  
  try {
    if (isEditing) {
      await api.put(ENDPOINTS.productos.update(currentProductId), data);
      showToast('Producto actualizado correctamente', 'success');
    } else {
      await api.post(ENDPOINTS.productos.create, data);
      showToast('Producto creado correctamente', 'success');
    }
    closeModal();
    loadProductos();
    loadCategorias();
  } catch (error) {
    showToast(`Error: ${error.message}`, 'danger');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Guardar';
  }
}

async function toggleProductStatus(id, activo) {
  try {
    await api.put(ENDPOINTS.productos.update(id), { activo });
    showToast(`Producto ${activo ? 'activado' : 'desactivado'}`, 'success');
    loadProductos();
  } catch (error) {
    showToast(`Error: ${error.message}`, 'danger');
  }
}

function debounce(fn, delay) {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

document.addEventListener('DOMContentLoaded', init);
