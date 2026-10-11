import { api, ENDPOINTS } from './apiFactory.js';
import { showToast, confirm, escapeHtml, formatCurrency, formatDate } from './ui.js';

let currentProveedorId = null;
let isEditingProveedor = false;

const tabProveedoresBtn = document.getElementById('tab-proveedores-btn');
const tabEntradasBtn = document.getElementById('tab-entradas-btn');
const tabProveedores = document.getElementById('tab-proveedores');
const tabEntradas = document.getElementById('tab-entradas');
const proveedoresTableBody = document.querySelector('#proveedores-table tbody');
const proveedoresEmpty = document.getElementById('proveedores-empty');
const entradasTableBody = document.querySelector('#entradas-table tbody');
const entradasEmpty = document.getElementById('entradas-empty');
const btnNewProveedor = document.getElementById('btn-new-proveedor');
const proveedorModal = document.getElementById('proveedor-modal');
const proveedorForm = document.getElementById('proveedor-form');
const proveedorModalTitle = document.getElementById('proveedor-modal-title');
const entradaForm = document.getElementById('entrada-form');
const eProductoSelect = document.getElementById('e_producto_id');
const eProveedorSelect = document.getElementById('e_proveedor_id');

function init() {
  setupTabs();
  setupEventListeners();
  loadProveedores();
  loadEntradas();
  loadSelectOptions();
}

function setupTabs() {
  tabProveedoresBtn.addEventListener('click', () => switchTab('proveedores'));
  tabEntradasBtn.addEventListener('click', () => switchTab('entradas'));
}

function switchTab(tab) {
  if (tab === 'proveedores') {
    tabProveedoresBtn.classList.add('active');
    tabProveedoresBtn.setAttribute('aria-selected', 'true');
    tabEntradasBtn.classList.remove('active');
    tabEntradasBtn.setAttribute('aria-selected', 'false');
    tabProveedores.classList.add('active');
    tabProveedores.hidden = false;
    tabEntradas.classList.remove('active');
    tabEntradas.hidden = true;
  } else {
    tabEntradasBtn.classList.add('active');
    tabEntradasBtn.setAttribute('aria-selected', 'true');
    tabProveedoresBtn.classList.remove('active');
    tabProveedoresBtn.setAttribute('aria-selected', 'false');
    tabEntradas.classList.add('active');
    tabEntradas.hidden = false;
    tabProveedores.classList.remove('active');
    tabProveedores.hidden = true;
  }
}

function setupEventListeners() {
  btnNewProveedor.addEventListener('click', () => openProveedorModal());
  
  proveedorModal.querySelectorAll('[data-dismiss="modal"], .modal-close').forEach(btn => {
    btn.addEventListener('click', closeProveedorModal);
  });
  
  proveedorModal.addEventListener('click', (e) => {
    if (e.target === proveedorModal) closeProveedorModal();
  });
  
  proveedorForm.addEventListener('submit', handleProveedorSubmit);
  
  entradaForm.addEventListener('submit', handleEntradaSubmit);
  
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && proveedorModal.classList.contains('show')) {
      closeProveedorModal();
    }
  });
}

async function loadSelectOptions() {
  try {
    const [productos, proveedores] = await Promise.all([
      api.get(ENDPOINTS.productos.list),
      api.get(ENDPOINTS.proveedores.list)
    ]);
    
    eProductoSelect.innerHTML = '<option value="">Seleccionar producto...</option>' +
      productos.filter(p => p.activo).map(p => 
        `<option value="${p.id}" data-codigo="${escapeHtml(p.codigo)}" data-precio="${p.precio_venta}">${escapeHtml(p.nombre)} (${escapeHtml(p.codigo)})</option>`
      ).join('');
    
    eProveedorSelect.innerHTML = '<option value="">Seleccionar proveedor...</option>' +
      proveedores.filter(p => p.activo).map(p => 
        `<option value="${p.id}">${escapeHtml(p.nombre)}</option>`
      ).join('');
    
    document.getElementById('p_proveedor_id').innerHTML = '<option value="">Sin proveedor</option>' +
      proveedores.filter(p => p.activo).map(p => 
        `<option value="${p.id}">${escapeHtml(p.nombre)}</option>`
      ).join('');
  } catch (error) {
    console.warn('Error cargando opciones:', error);
  }
}

async function loadProveedores() {
  try {
    const proveedores = await api.get(ENDPOINTS.proveedores.list);
    renderProveedores(proveedores);
  } catch (error) {
    showToast(`Error cargando proveedores: ${error.message}`, 'danger');
    proveedoresTableBody.innerHTML = '';
    proveedoresEmpty.classList.remove('d-none');
  }
}

function renderProveedores(proveedores) {
  if (!proveedores || proveedores.length === 0) {
    proveedoresTableBody.innerHTML = '';
    proveedoresEmpty.classList.remove('d-none');
    return;
  }
  
  proveedoresEmpty.classList.add('d-none');
  proveedoresTableBody.innerHTML = proveedores.map(p => `
    <tr data-id="${p.id}">
      <td>${escapeHtml(p.nombre)}</td>
      <td>${escapeHtml(p.telefono || '-')}</td>
      <td>${escapeHtml(p.correo || '-')}</td>
      <td>${p.dias_entrega} días</td>
      <td>
        <span class="badge ${p.activo ? 'badge-success' : 'badge-secondary'}">
          ${p.activo ? 'Activo' : 'Inactivo'}
        </span>
      </td>
<td class="text-end">
        <div class="btn-group">
          <button class="btn btn-ghost btn-sm" data-action="edit" aria-label="Editar ${escapeHtml(p.nombre)}">
            <svg class="icon icon-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
            </svg>
          </button>
          <button class="btn btn-ghost btn-sm ${p.activo ? 'btn-outline-danger' : 'btn-outline-success'}" 
                  data-action="toggle" aria-label="${p.activo ? 'Desactivar' : 'Activar'} ${escapeHtml(p.nombre)}">
            <svg class="icon ${p.activo ? 'icon-danger' : 'icon-success'}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              ${p.activo ? '<circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line>' : '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline>'}
            </svg>
          </button>
        </div>
      </td>
    </tr>
  `).join('');
  
  proveedoresTableBody.querySelectorAll('[data-action="edit"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const row = e.currentTarget.closest('tr');
      openProveedorModal(row.dataset.id);
    });
  });
  
  proveedoresTableBody.querySelectorAll('[data-action="toggle"]').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const row = e.currentTarget.closest('tr');
      const id = row.dataset.id;
      const isActive = !btn.classList.contains('btn-outline-success');
      await toggleProveedorStatus(id, !isActive);
    });
  });
}

async function loadEntradas() {
  try {
    const entradas = await api.get(ENDPOINTS.entradas.list);
    renderEntradas(entradas);
  } catch (error) {
    console.warn('Error cargando entradas:', error);
    entradasTableBody.innerHTML = '';
    entradasEmpty.classList.remove('d-none');
  }
}

function renderEntradas(entradas) {
  if (!entradas || entradas.length === 0) {
    entradasTableBody.innerHTML = '';
    entradasEmpty.classList.remove('d-none');
    return;
  }
  
  entradasEmpty.classList.add('d-none');
  entradasTableBody.innerHTML = entradas.map(e => `
    <tr>
      <td>${formatDate(e.fecha)}</td>
      <td>${escapeHtml(e.producto?.nombre || e.producto_nombre || 'N/A')}</td>
      <td class="text-center">${e.cantidad}</td>
      <td class="text-end">${formatCurrency(e.costo_unitario)}</td>
      <td>${escapeHtml(e.proveedor?.nombre || e.proveedor_nombre || 'N/A')}</td>
      <td class="text-end fw-semibold">${formatCurrency(e.cantidad * e.costo_unitario)}</td>
    </tr>
  `).join('');
}

function openProveedorModal(id = null) {
  isEditingProveedor = !!id;
  currentProveedorId = id;
  
  proveedorForm.reset();
  proveedorForm.classList.remove('was-validated');
  document.getElementById('proveedor-id').value = id || '';
  
  if (isEditingProveedor) {
    proveedorModalTitle.textContent = 'Editar Proveedor';
    loadProveedorForEdit(id);
  } else {
    proveedorModalTitle.textContent = 'Nuevo Proveedor';
    document.getElementById('pr_activo').checked = true;
  }
  
  proveedorModal.classList.add('show');
  document.body.style.overflow = 'hidden';
  
  setTimeout(() => document.getElementById('pr_nombre').focus(), 100);
}

async function loadProveedorForEdit(id) {
  try {
    const proveedor = await api.get(ENDPOINTS.proveedores.detail(id));
    document.getElementById('pr_nombre').value = proveedor.nombre;
    document.getElementById('pr_telefono').value = proveedor.telefono || '';
    document.getElementById('pr_correo').value = proveedor.correo || '';
    document.getElementById('pr_dias_entrega').value = proveedor.dias_entrega;
    document.getElementById('pr_activo').checked = proveedor.activo;
  } catch (error) {
    showToast(`Error cargando proveedor: ${error.message}`, 'danger');
    closeProveedorModal();
  }
}

function closeProveedorModal() {
  proveedorModal.classList.remove('show');
  document.body.style.overflow = '';
  currentProveedorId = null;
  isEditingProveedor = false;
}

async function handleProveedorSubmit(e) {
  e.preventDefault();
  
  if (!proveedorForm.checkValidity()) {
    proveedorForm.classList.add('was-validated');
    return;
  }
  
  const submitBtn = proveedorForm.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<span class="spinner spinner-sm me-2"></span> Guardando...';
  
  const data = {
    nombre: document.getElementById('pr_nombre').value.trim(),
    telefono: document.getElementById('pr_telefono').value.trim() || null,
    correo: document.getElementById('pr_correo').value.trim() || null,
    dias_entrega: parseInt(document.getElementById('pr_dias_entrega').value) || 7,
    activo: document.getElementById('pr_activo').checked
  };
  
  try {
    if (isEditingProveedor) {
      await api.put(ENDPOINTS.proveedores.update(currentProveedorId), data);
      showToast('Proveedor actualizado correctamente', 'success');
    } else {
      await api.post(ENDPOINTS.proveedores.create, data);
      showToast('Proveedor creado correctamente', 'success');
    }
    closeProveedorModal();
    loadProveedores();
    loadSelectOptions();
  } catch (error) {
    showToast(`Error: ${error.message}`, 'danger');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Guardar';
  }
}

async function toggleProveedorStatus(id, activo) {
  try {
    await api.put(ENDPOINTS.proveedores.update(id), { activo });
    showToast(`Proveedor ${activo ? 'activado' : 'desactivado'}`, 'success');
    loadProveedores();
    loadSelectOptions();
  } catch (error) {
    showToast(`Error: ${error.message}`, 'danger');
  }
}

async function handleEntradaSubmit(e) {
  e.preventDefault();
  
  if (!entradaForm.checkValidity()) {
    entradaForm.classList.add('was-validated');
    return;
  }
  
  const submitBtn = entradaForm.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<span class="spinner spinner-sm me-2"></span> Registrando...';
  
  const data = {
    producto_id: parseInt(eProductoSelect.value),
    cantidad: parseInt(document.getElementById('e_cantidad').value),
    costo_unitario: parseFloat(document.getElementById('e_costo_unitario').value),
    proveedor_id: parseInt(eProveedorSelect.value)
  };
  
  try {
    await api.post(ENDPOINTS.entradas.create, data);
    showToast('Entrada registrada correctamente', 'success');
    entradaForm.reset();
    entradaForm.classList.remove('was-validated');
    document.getElementById('e_cantidad').value = 1;
    loadEntradas();
    loadSelectOptions();
  } catch (error) {
    showToast(`Error: ${error.message}`, 'danger');
} finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = `
      <svg class="icon icon-white me-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
        <polyline points="22 4 12 14.01 9 11.01"></polyline>
      </svg>
      Registrar Entrada
    `;
  }
}

document.addEventListener('DOMContentLoaded', init);
