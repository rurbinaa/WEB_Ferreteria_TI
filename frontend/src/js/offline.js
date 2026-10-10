import { api, STORAGE_KEYS, ENDPOINTS } from './apiFactory.js';
import { showToast, generateClientUUID } from './ui.js';

let isOnline = navigator.onLine;
let syncInProgress = false;

export function initOffline() {
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
  updateOfflineBadge();
  
  if (isOnline) {
    syncQueue();
  }
}

function handleOnline() {
  isOnline = true;
  updateOfflineBadge();
  showToast('Conexión restablecida', 'success');
  syncQueue();
}

function handleOffline() {
  isOnline = false;
  updateOfflineBadge();
  showToast('Sin conexión - Modo offline activado', 'warning');
}

export function isOnlineStatus() {
  return isOnline;
}

export async function cacheCatalogo(productos) {
  const cache = productos.map(p => ({
    codigo: p.codigo,
    nombre: p.nombre,
    precio_venta: p.precio_venta,
    stock_actual: p.stock_actual,
    stock_minimo: p.stock_minimo,
    categoria: p.categoria,
    unidad: p.unidad
  }));
  localStorage.setItem(STORAGE_KEYS.CATALOGO_CACHE, JSON.stringify(cache));
}

export function getCachedCatalogo() {
  const cached = localStorage.getItem(STORAGE_KEYS.CATALOGO_CACHE);
  return cached ? JSON.parse(cached) : [];
}

export function searchCachedCatalogo(query) {
  const catalogo = getCachedCatalogo();
  const q = query.toLowerCase().trim();
  if (!q) return catalogo;
  return catalogo.filter(p => 
    p.codigo.toLowerCase().includes(q) || 
    p.nombre.toLowerCase().includes(q)
  );
}

export function getCachedProducto(codigo) {
  const catalogo = getCachedCatalogo();
  return catalogo.find(p => p.codigo === codigo);
}

export function queueVenta(venta) {
  const cola = getVentasCola();
  venta.client_uuid = venta.client_uuid || generateClientUUID();
  venta.fecha_creacion = new Date().toISOString();
  venta.intentos = 0;
  cola.push(venta);
  localStorage.setItem(STORAGE_KEYS.VENTAS_COLA, JSON.stringify(cola));
  updateOfflineBadge();
}

export function getVentasCola() {
  const cola = localStorage.getItem(STORAGE_KEYS.VENTAS_COLA);
  return cola ? JSON.parse(cola) : [];
}

export function removeVentaFromCola(clientUuid) {
  const cola = getVentasCola().filter(v => v.client_uuid !== clientUuid);
  localStorage.setItem(STORAGE_KEYS.VENTAS_COLA, JSON.stringify(cola));
  updateOfflineBadge();
}

export function moveToRechazadas(venta, motivo) {
  const rechazadas = getVentasRechazadas();
  venta.motivo_rechazo = motivo;
  venta.fecha_rechazo = new Date().toISOString();
  rechazadas.push(venta);
  localStorage.setItem(STORAGE_KEYS.VENTAS_RECHAZADAS, JSON.stringify(rechazadas));
  removeVentaFromCola(venta.client_uuid);
  updateOfflineBadge();
}

export function getVentasRechazadas() {
  const rechazadas = localStorage.getItem(STORAGE_KEYS.VENTAS_RECHAZADAS);
  return rechazadas ? JSON.parse(rechazadas) : [];
}

export function clearRechazada(clientUuid) {
  const rechazadas = getVentasRechazadas().filter(v => v.client_uuid !== clientUuid);
  localStorage.setItem(STORAGE_KEYS.VENTAS_RECHAZADAS, JSON.stringify(rechazadas));
}

export async function syncQueue() {
  if (syncInProgress || !isOnline) return;
  
  const cola = getVentasCola();
  if (cola.length === 0) return;
  
  syncInProgress = true;
  showToast(`Sincronizando ${cola.length} venta(s)...`, 'info');
  
  for (const venta of cola) {
    if (!isOnline) break;
    
    try {
      venta.intentos++;
      const response = await api.post(ENDPOINTS.ventas.create, venta);
      
      if (response) {
        removeVentaFromCola(venta.client_uuid);
        showToast(`Venta ${venta.client_uuid.slice(0,8)} sincronizada`, 'success');
      }
    } catch (error) {
      if (error.status === 409) {
        moveToRechazadas(venta, error.message || 'Conflicto (stock insuficiente o duplicado)');
        showToast(`Venta rechazada: ${error.message}`, 'danger');
      } else if (error.isNetworkError) {
        showToast('Error de red al sincronizar, reintentando...', 'warning');
        break;
      } else {
        showToast(`Error al sincronizar: ${error.message}`, 'danger');
      }
    }
  }
  
  syncInProgress = false;
  updateOfflineBadge();
  
  const remaining = getVentasCola().length;
  if (remaining === 0) {
    showToast('Sincronización completa', 'success');
  }
}

function updateOfflineBadge() {
  const badge = document.getElementById('offline-badge');
  const btnSync = document.getElementById('btn-sync');
  const cola = getVentasCola();
  
  if (badge) {
    if (cola.length > 0 || !isOnline) {
      badge.textContent = `● ${cola.length} pendiente${cola.length !== 1 ? 's' : ''}${!isOnline ? ' (offline)' : ''}`;
      badge.classList.remove('d-none');
    } else {
      badge.classList.add('d-none');
    }
  }
  
  if (btnSync) {
    if (cola.length > 0) {
      btnSync.classList.remove('d-none');
    } else {
      btnSync.classList.add('d-none');
    }
  }
}

export function getOfflineStats() {
  return {
    isOnline,
    colaLength: getVentasCola().length,
    rechazadasLength: getVentasRechazadas().length,
    catalogoCached: getCachedCatalogo().length > 0
  };
}

export function forceSync() {
  if (isOnline) {
    syncQueue();
  } else {
    showToast('Sin conexión, no se puede sincronizar', 'warning');
  }
}
