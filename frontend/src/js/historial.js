import { api, ENDPOINTS } from './apiFactory.js';
import { loadVentas, filterVentasByDate, calculatePeriodTotals, formatCurrency } from './saleLogic.js';
import { showToast, escapeHtml, formatDate } from './ui.js';

const historialTableBody = document.getElementById('historial-table-body');
const historialEmpty = document.getElementById('historial-empty');
const historialFecha = document.getElementById('historial-fecha');
const historialTotalVentas = document.getElementById('historial-total-ventas');
const historialCantidadVentas = document.getElementById('historial-cantidad-ventas');

let allVentas = [];
let currentFilterDate = null;

function init() {
  // Set default date to today
  const today = new Date().toISOString().split('T')[0];
  historialFecha.value = today;
  currentFilterDate = today;
  
  setupEventListeners();
  loadHistorial();
}

function setupEventListeners() {
  historialFecha.addEventListener('change', () => {
    currentFilterDate = historialFecha.value || null;
    renderHistorial();
  });
}

async function loadHistorial() {
  try {
    allVentas = await loadVentas();
    renderHistorial();
  } catch (error) {
    showToast(`Error cargando historial: ${error.message}`, 'danger');
    historialTableBody.innerHTML = '';
    historialEmpty.classList.remove('d-none');
  }
}

function renderHistorial() {
  const filtered = filterVentasByDate(allVentas, currentFilterDate);
  const { total, count } = calculatePeriodTotals(filtered);
  
  // Update totals
  historialTotalVentas.textContent = `Total: ${formatCurrency(total)}`;
  historialCantidadVentas.textContent = `${count} venta${count !== 1 ? 's' : ''}`;
  
  if (filtered.length === 0) {
    historialTableBody.innerHTML = '';
    historialEmpty.classList.remove('d-none');
    return;
  }
  
  historialEmpty.classList.add('d-none');
  
  // Sort by date descending (newest first)
  const sorted = [...filtered].sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
  
  historialTableBody.innerHTML = sorted.map(v => `
    <tr>
      <td>${formatDate(v.fecha)}</td>
      <td><code>${escapeHtml(v.client_uuid?.slice(0, 8) || v.id)}</code></td>
      <td>${escapeHtml(v.cliente_nombre || 'Público general')}</td>
      <td>${escapeHtml(v.usuario_nombre || 'N/A')}</td>
      <td class="text-end fw-semibold">${formatCurrency(v.total)}</td>
      <td>
        <span class="badge ${v.estado === 'anulada' ? 'badge-danger' : 'badge-success'}">
          ${v.estado === 'anulada' ? 'Anulada' : 'Completada'}
        </span>
      </td>
    </tr>
  `).join('');
}

// Expose for venta modal to call
window.refreshHistorial = loadHistorial;

document.addEventListener('DOMContentLoaded', init);
