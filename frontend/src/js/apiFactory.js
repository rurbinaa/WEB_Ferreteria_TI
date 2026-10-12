import { api as realApi } from './api.js';
import { mockApi } from './mockApi.js';
import { 
  ENDPOINTS, 
  ROLES, 
  STORAGE_KEYS, 
  ALERTAS_ESTADO, 
  ALERTAS_CONFIANZA,
  VENTA_ESTADO,
  KEYBOARD_SHORTCUTS,
  DEBOUNCE_MS,
  SYNC_INTERVAL_MS,
  TOAST_DURATION_MS,
  USE_REAL_API
} from './config.js';

export const api = USE_REAL_API ? realApi : mockApi;

// Re-export config constants
export { 
  ENDPOINTS, 
  ROLES, 
  STORAGE_KEYS, 
  ALERTAS_ESTADO, 
  ALERTAS_CONFIANZA,
  VENTA_ESTADO,
  KEYBOARD_SHORTCUTS,
  DEBOUNCE_MS,
  SYNC_INTERVAL_MS,
  TOAST_DURATION_MS
};

export function setUseRealAPI(useReal) {
  // Esta función requiere recarga para tomar efecto
  localStorage.setItem('ferreteria_use_real_api', useReal.toString());
  window.location.reload();
}

export default api;