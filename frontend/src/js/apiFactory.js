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
  TOAST_DURATION_MS
} from './config.js';

const USE_MOCK = true;

export const api = USE_MOCK ? mockApi : realApi;

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

export function setUseMock(useMock) {
  if (useMock !== USE_MOCK) {
    console.warn('USE_MOCK es constante en build. Cambia USE_MOCK en apiFactory.js y recarga.');
  }
}

export default api;