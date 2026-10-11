import { api, ENDPOINTS } from './apiFactory.js';
import { showToast, escapeHtml, formatCurrency, formatDateShort } from './ui.js';

let ventasChart = null;
let topProductosChart = null;

const kpiGrid = document.getElementById('kpi-grid');
const alertsQuickList = document.getElementById('alerts-quick-list');
const connectionStatus = document.getElementById('connection-status');

function init() {
  loadResumen();
  loadVentasPorDia();
  loadTopProductos();
  loadAlertasRecientes();
  checkConnection();
  setInterval(checkConnection, 30000);
}

async function loadResumen() {
  try {
    const data = await api.get(ENDPOINTS.reportes.resumen);
    
const kpis = [
      { 
        label: 'Ventas Hoy', 
        value: formatCurrency(data.ventas_hoy?.total || 0), 
        trend: data.ventas_hoy?.tendencia || null,
        icon: '<svg class="icon icon-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2z"></path><path d="M12 6v6l4 4"></path></svg>',
        class: 'primary'
      },
      { 
        label: 'Alertas Pendientes', 
        value: data.alertas_pendientes || 0, 
        trend: null,
        icon: '<svg class="icon icon-warning" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>',
        class: 'warning'
      },
      { 
        label: 'Productos Agotados', 
        value: data.productos_agotados || 0, 
        trend: null,
        icon: '<svg class="icon icon-danger" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>',
        class: 'danger'
      },
      { 
        label: 'Ticket Promedio', 
        value: formatCurrency(data.ticket_promedio || 0), 
        trend: null,
        icon: '<svg class="icon icon-info" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>',
        class: 'info'
      }
    ];
    
    kpiGrid.innerHTML = kpis.map(kpi => `
      <div class="kpi-card ${kpi.class}">
        <div class="kpi-icon" aria-hidden="true">${kpi.icon}</div>
        <div class="kpi-label">${escapeHtml(kpi.label)}</div>
        <div class="kpi-value">${escapeHtml(kpi.value)}</div>
        ${kpi.trend !== null ? `
          <div class="kpi-trend ${kpi.trend >= 0 ? 'up' : 'down'}">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              ${kpi.trend >= 0 ? '<polyline points="18 15 12 9 6 15"></polyline>' : '<polyline points="6 9 12 15 18 9"></polyline>'}
            </svg>
            <span>${kpi.trend >= 0 ? '+' : ''}${kpi.trend}% vs ayer</span>
          </div>
        ` : ''}
      </div>
    `).join('');
  } catch (error) {
    console.error('Error cargando resumen:', error);
    kpiGrid.innerHTML = `
      <div class="kpi-card" style="grid-column: 1 / -1; text-align: center;">
        <p class="text-danger">Error cargando métricas: ${escapeHtml(error.message)}</p>
        <button class="btn btn-outline-primary mt-2" onclick="loadResumen()">Reintentar</button>
      </div>
    `;
  }
}

async function loadVentasPorDia() {
  try {
    const data = await api.get(ENDPOINTS.reportes.ventasPorDia);
    const labels = data.map(d => formatDateShort(d.fecha));
    const values = data.map(d => d.total);
    
    const ctx = document.getElementById('chart-ventas-dia').getContext('2d');
    
    if (ventasChart) ventasChart.destroy();
    
    ventasChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Ventas',
          data: values,
          borderColor: '#2563eb',
          backgroundColor: 'rgba(37, 99, 235, 0.1)',
          fill: true,
          tension: 0.3,
          pointBackgroundColor: '#2563eb',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6
        }]
      },
      options: getChartOptions('Ventas (USD)')
    });
  } catch (error) {
    console.error('Error cargando ventas por día:', error);
    const canvas = document.getElementById('chart-ventas-dia');
    const ctx = canvas.getContext('2d');
    ctx.font = '14px system-ui';
    ctx.fillStyle = '#64748b';
    ctx.textAlign = 'center';
    ctx.fillText('Error cargando gráfico', canvas.width / 2, canvas.height / 2);
  }
}

async function loadTopProductos() {
  try {
    const data = await api.get(ENDPOINTS.reportes.topProductos);
    const labels = data.map(d => d.nombre.length > 20 ? d.nombre.slice(0, 17) + '...' : d.nombre);
    const values = data.map(d => d.cantidad_vendida);
    
    const ctx = document.getElementById('chart-top-productos').getContext('2d');
    
    if (topProductosChart) topProductosChart.destroy();
    
    topProductosChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Unidades vendidas',
          data: values,
          backgroundColor: 'rgba(37, 99, 235, 0.8)',
          borderColor: '#2563eb',
          borderWidth: 1,
          borderRadius: 4
        }]
      },
      options: {
        ...getChartOptions('Unidades'),
        indexAxis: 'y'
      }
    });
  } catch (error) {
    console.error('Error cargando top productos:', error);
    const canvas = document.getElementById('chart-top-productos');
    const ctx = canvas.getContext('2d');
    ctx.font = '14px system-ui';
    ctx.fillStyle = '#64748b';
    ctx.textAlign = 'center';
    ctx.fillText('Error cargando gráfico', canvas.width / 2, canvas.height / 2);
  }
}

async function loadAlertasRecientes() {
  try {
    const data = await api.get(ENDPOINTS.alertas.list);
    const alertas = Array.isArray(data) ? data.filter(a => a.estado === 'pendiente').slice(0, 5) : [];
    
    if (alertas.length === 0) {
      alertsQuickList.innerHTML = `
        <div class="empty-state" style="padding: var(--space-6);">
          <svg class="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
            <line x1="12" y1="9" x2="12" y2="13"></line>
            <line x1="12" y1="17" x2="12.01" y2="17"></line>
          </svg>
          <p class="empty-state-title">Sin alertas pendientes</p>
          <p class="empty-state-message">Todo el stock está en niveles normales</p>
        </div>
      `;
      return;
    }
    
    alertsQuickList.innerHTML = alertas.map(a => `
      <div class="alert-quick-item">
        <div class="alert-quick-info">
          <div class="alert-quick-product">${escapeHtml(a.producto?.nombre || a.producto_nombre || 'Producto')}</div>
          <div class="alert-quick-meta">
            <span class="alert-quick-stock ${getStockClass(a.stock_al_generar, a.producto?.stock_minimo)}">
              Stock: ${a.stock_al_generar}
            </span>
            <span>Mín: ${a.producto?.stock_minimo || 'N/A'}</span>
<span class="alert-quick-confianza ${a.confianza || 'normal'}">
              ${a.confianza === 'baja' 
                ? '<svg class="icon icon-warning" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg> Confianza baja' 
                : '<svg class="icon icon-success" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polyline points="20 6 9 17 4 12"></polyline></svg> Normal'}
            </span>
          </div>
        </div>
        <div class="alert-quick-action">
          <a href="proveedores.html?atender=${a.id}&producto=${encodeURIComponent(a.producto?.codigo || '')}" class="btn btn-sm btn-primary">Atender</a>
        </div>
      </div>
    `).join('');
  } catch (error) {
    console.error('Error cargando alertas:', error);
    alertsQuickList.innerHTML = `
      <div class="empty-state" style="padding: var(--space-6);">
        <p class="empty-state-title text-danger">Error cargando alertas</p>
        <p class="empty-state-message">${escapeHtml(error.message)}</p>
      </div>
    `;
  }
}

function getStockClass(stock, minimo) {
  if (!stock || stock <= 0) return 'agotado';
  if (minimo && stock <= minimo) return 'bajo';
  return 'ok';
}

function getChartOptions(yLabel) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.9)',
        titleFont: { size: 13, weight: '600' },
        bodyFont: { size: 12 },
        padding: 12,
        cornerRadius: 8,
        displayColors: false
      }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: '#94a3b8', font: { size: 11 } }
      },
      y: {
        grid: { color: '#e2e8f0' },
        ticks: { color: '#94a3b8', font: { size: 11 }, callback: v => '$' + v.toLocaleString() },
        title: { display: true, text: yLabel, color: '#64748b', font: { size: 11, weight: '500' } }
      }
    },
    interaction: { intersect: false, mode: 'index' }
  };
}

async function checkConnection() {
  try {
    await api.get(ENDPOINTS.health);
    connectionStatus.className = 'badge badge-success d-flex align-items-center gap-1';
    connectionStatus.innerHTML = '<span>Conectado</span>';
  } catch {
    connectionStatus.className = 'badge badge-danger d-flex align-items-center gap-1';
    connectionStatus.innerHTML = '<span>Sin conexión</span>';
  }
}

document.addEventListener('DOMContentLoaded', init);
