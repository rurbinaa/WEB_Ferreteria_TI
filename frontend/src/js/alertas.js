import { api, ENDPOINTS, ALERTAS_ESTADO, ALERTAS_CONFIANZA } from './apiFactory.js';
import { showToast, confirm, escapeHtml, formatDate, formatDateShort } from './ui.js';

const tabAlertasBtn = document.getElementById('tab-alertas-btn');
const tabBitacoraBtn = document.getElementById('tab-bitacora-btn');
const tabAlertas = document.getElementById('tab-alertas');
const tabBitacora = document.getElementById('tab-bitacora');
const alertasTableBody = document.querySelector('#alertas-table tbody');
const alertasEmpty = document.getElementById('alertas-empty');
const bitacoraTableBody = document.querySelector('#bitacora-table tbody');
const bitacoraEmpty = document.getElementById('bitacora-empty');
const filterAlertaProducto = document.getElementById('filter-alerta-producto');
const filterAlertaEstado = document.getElementById('filter-alerta-estado');
const filterBitacoraUsuario = document.getElementById('filter-bitacora-usuario');
const filterBitacoraAccion = document.getElementById('filter-bitacora-accion');
const filterBitacoraFecha = document.getElementById('filter-bitacora-fecha');
const btnLimpiarFiltros = document.getElementById('btn-limpiar-filtros');

let alertasFilters = { producto: '', estado: '' };
let bitacoraFilters = { usuario: '', accion: '', fecha: '' };
let accionesCache = [];

function init() {
  setupTabs();
  setupEventListeners();
  // Set default filter to 'pendiente'
  filterAlertaEstado.value = 'pendiente';
  alertasFilters.estado = 'pendiente';
  loadAlertas();
  loadBitacora();
  loadAccionesForFilter();
}

function setupTabs() {
  tabAlertasBtn.addEventListener('click', () => switchTab('alertas'));
  tabBitacoraBtn.addEventListener('click', () => switchTab('bitacora'));
}

function switchTab(tab) {
  if (tab === 'alertas') {
    tabAlertasBtn.classList.add('active');
    tabAlertasBtn.setAttribute('aria-selected', 'true');
    tabBitacoraBtn.classList.remove('active');
    tabBitacoraBtn.setAttribute('aria-selected', 'false');
    tabAlertas.classList.add('active');
    tabAlertas.hidden = false;
    tabBitacora.classList.remove('active');
    tabBitacora.hidden = true;
  } else {
    tabBitacoraBtn.classList.add('active');
    tabBitacoraBtn.setAttribute('aria-selected', 'true');
    tabAlertasBtn.classList.remove('active');
    tabAlertasBtn.setAttribute('aria-selected', 'false');
    tabBitacora.classList.add('active');
    tabBitacora.hidden = false;
    tabAlertas.classList.remove('active');
    tabAlertas.hidden = true;
  }
}

function setupEventListeners() {
  filterAlertaProducto.addEventListener('input', debounce(() => {
    alertasFilters.producto = filterAlertaProducto.value.trim();
    loadAlertas();
  }, 300));
  
  filterAlertaEstado.addEventListener('change', () => {
    alertasFilters.estado = filterAlertaEstado.value;
    loadAlertas();
  });
  
  filterBitacoraUsuario.addEventListener('input', debounce(() => {
    bitacoraFilters.usuario = filterBitacoraUsuario.value.trim();
    loadBitacora();
  }, 300));
  
  filterBitacoraAccion.addEventListener('change', () => {
    bitacoraFilters.accion = filterBitacoraAccion.value;
    loadBitacora();
  });
  
  filterBitacoraFecha.addEventListener('change', () => {
    bitacoraFilters.fecha = filterBitacoraFecha.value;
    loadBitacora();
  });
  
  btnLimpiarFiltros.addEventListener('click', () => {
    filterBitacoraUsuario.value = '';
    filterBitacoraAccion.value = '';
    filterBitacoraFecha.value = '';
    bitacoraFilters = { usuario: '', accion: '', fecha: '' };
    loadBitacora();
  });
}

async function loadAlertas() {
  try {
    const params = new URLSearchParams();
    if (alertasFilters.producto) params.set('producto', alertasFilters.producto);
    if (alertasFilters.estado) params.set('estado', alertasFilters.estado);
    
    const url = `${ENDPOINTS.alertas.list}?${params.toString()}`;
    const alertas = await api.get(url);
    renderAlertas(alertas);
  } catch (error) {
    showToast(`Error cargando alertas: ${error.message}`, 'danger');
    alertasTableBody.innerHTML = '';
    alertasEmpty.classList.remove('d-none');
  }
}

function renderAlertas(alertas) {
  if (!alertas || alertas.length === 0) {
    alertasTableBody.innerHTML = '';
    alertasEmpty.classList.remove('d-none');
    return;
  }
  
  alertasEmpty.classList.add('d-none');
  
  // Sort by urgency: stock 0 (agotado) first, then stock <= minimo (bajo), then ok
  const sortedAlertas = [...alertas].sort((a, b) => {
    const classA = getStockClass(a.stock_al_generar, a.producto?.stock_minimo);
    const classB = getStockClass(b.stock_al_generar, b.producto?.stock_minimo);
    const urgency = { agotado: 0, bajo: 1, ok: 2 };
    return urgency[classA] - urgency[classB];
  });
  
  const warningIcon = '<svg class="icon icon-warning" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>';
  const successIcon = '<svg class="icon icon-success" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polyline points="20 6 9 17 4 12"></polyline></svg>';
  
  const atenderBtn = (id, nombre) => `
    <button class="btn btn-sm btn-primary" data-action="atender" data-id="${id}" aria-label="Atender alerta de ${escapeHtml(nombre)}">
      <svg class="icon icon-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
        <polyline points="22 4 12 14.01 9 11.01"></polyline>
      </svg>
      Atender
    </button>
  `;
  
  const atendidaBtn = `
    <button class="btn btn-sm btn-secondary" disabled aria-label="Alerta ya atendida">
      <svg class="icon icon-muted" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polyline points="20 6 9 17 4 12"></polyline></svg>
      Atendida
    </button>
  `;
  
  alertasTableBody.innerHTML = sortedAlertas.map(a => {
    const stockClass = getStockClass(a.stock_al_generar, a.producto?.stock_minimo);
    const isLowStock = stockClass === 'agotado' || stockClass === 'bajo';
    const confianzaLabel = a.confianza === ALERTAS_CONFIANZA.BAJA ? 'Baja' : 'Normal';
    const confianzaIcon = a.confianza === ALERTAS_CONFIANZA.BAJA ? warningIcon : successIcon;
    const btnHtml = a.estado === ALERTAS_ESTADO.PENDIENTE ? atenderBtn(a.id, a.producto?.nombre || '') : atendidaBtn;
    
    return `
    <tr data-id="${a.id}">
      <td>${escapeHtml(a.producto?.nombre || a.producto_nombre || 'N/A')}</td>
      <td><span class="badge badge-stock-${stockClass}">${a.stock_al_generar}</span></td>
      <td>${a.producto?.stock_minimo || 'N/A'}</td>
      <td>${a.cantidad_sugerida}</td>
      <td>${escapeHtml(a.producto?.proveedor?.nombre || a.proveedor_nombre || 'N/A')}</td>
      <td>
        <span class="badge badge-confianza-${a.confianza || ALERTAS_CONFIANZA.NORMAL}" title="${isLowStock ? 'Stock bajo - confianza calculada' : 'Stock adecuado - confianza normal'}">
          ${confianzaIcon} ${confianzaLabel}
        </span>
      </td>
      <td><span class="badge ${a.estado === ALERTAS_ESTADO.PENDIENTE ? 'badge-warning' : 'badge-success'}">${a.estado === ALERTAS_ESTADO.PENDIENTE ? 'Pendiente' : 'Atendida'}</span></td>
      <td>${formatDate(a.fecha_creada)}</td>
      <td class="text-end">${btnHtml}</td>
    </tr>
  `;
  }).join('');
  
  alertasTableBody.querySelectorAll('[data-action="atender"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.currentTarget.dataset.id;
      atenderAlerta(id);
    });
  });
}

function getStockClass(stock, minimo) {
  if (!stock || stock <= 0) return 'agotado';
  if (minimo && stock <= minimo) return 'bajo';
  return 'ok';
}

async function atenderAlerta(id) {
  const confirmed = await confirm(
    '¿Deseas atender esta alerta? Se te redirigirá a la pantalla de entradas con los datos precargados.',
    'Atender Alerta'
  );
  
  if (!confirmed) return;
  
  try {
    const response = await api.post(ENDPOINTS.alertas.atender(id));
    
    if (response && response.redirect) {
      const params = new URLSearchParams();
      if (response.producto_id) params.set('producto', response.producto_id);
      if (response.proveedor_id) params.set('proveedor', response.proveedor_id);
      if (response.cantidad_sugerida) params.set('cantidad', response.cantidad_sugerida);
      
      window.location.href = `proveedores.html?tab=entradas&${params.toString()}`;
    } else {
      showToast('Alerta atendida correctamente', 'success');
      loadAlertas();
    }
  } catch (error) {
    showToast(`Error: ${error.message}`, 'danger');
  }
}

async function loadBitacora() {
  try {
    const params = new URLSearchParams();
    if (bitacoraFilters.usuario) params.set('usuario', bitacoraFilters.usuario);
    if (bitacoraFilters.accion) params.set('accion', bitacoraFilters.accion);
    if (bitacoraFilters.fecha) params.set('fecha', bitacoraFilters.fecha);
    
    const url = `${ENDPOINTS.bitacora.list}?${params.toString()}`;
    const bitacora = await api.get(url);
    renderBitacora(bitacora);
  } catch (error) {
    showToast(`Error cargando bitácora: ${error.message}`, 'danger');
    bitacoraTableBody.innerHTML = '';
    bitacoraEmpty.classList.remove('d-none');
  }
}

function renderBitacora(bitacora) {
  if (!bitacora || bitacora.length === 0) {
    bitacoraTableBody.innerHTML = '';
    bitacoraEmpty.classList.remove('d-none');
    return;
  }
  
  bitacoraEmpty.classList.add('d-none');
  
  // Add counter
  const counter = document.getElementById('bitacora-counter');
  if (counter) {
    counter.textContent = `${bitacora.length} registros`;
  }
  
  bitacoraTableBody.innerHTML = bitacora.map(b => `
    <tr>
      <td>${formatDate(b.fecha)}</td>
      <td>${escapeHtml(b.usuario_nombre || 'N/A')}</td>
      <td>
        <span class="badge badge-soft" style="background-color: var(--color-primary-light); color: var(--color-primary);">
          ${formatActionLabel(b.accion)}
        </span>
      </td>
      <td>${escapeHtml(b.entidad || '-')}</td>
      <td>${escapeHtml(b.entidad_id || '-')}</td>
      <td>
        <span class="badge ${b.resultado === 'ok' ? 'badge-success' : 'badge-danger'}">
          ${b.resultado === 'ok' ? 'Éxito' : 'Error'}
        </span>
      </td>
      <td>${escapeHtml(b.detalle || '-')}</td>
    </tr>
  `).join('');
}

async function loadAccionesForFilter() {
  try {
    const bitacora = await api.get(ENDPOINTS.bitacora.list);
    const acciones = [...new Set(bitacora.map(b => b.accion).filter(Boolean))].sort();
    accionesCache = acciones;
    filterBitacoraAccion.innerHTML = '<option value="">Todas las acciones</option>' +
      acciones.map(a => `<option value="${escapeHtml(a)}">${escapeHtml(a)}</option>`).join('');
  } catch (error) {
    console.warn('Error cargando acciones:', error);
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
