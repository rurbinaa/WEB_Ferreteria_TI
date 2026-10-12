import { API_BASE_URL, ENDPOINTS, STORAGE_KEYS } from './config.js';

let authToken = null;
let currentUser = null;

function getToken() {
  if (!authToken) {
    authToken = sessionStorage.getItem(STORAGE_KEYS.TOKEN);
  }
  return authToken;
}

function setToken(token) {
  authToken = token;
  if (token) {
    sessionStorage.setItem(STORAGE_KEYS.TOKEN, token);
  } else {
    sessionStorage.removeItem(STORAGE_KEYS.TOKEN);
  }
}

function getUser() {
  if (!currentUser) {
    const stored = sessionStorage.getItem(STORAGE_KEYS.USER);
    if (stored) {
      currentUser = JSON.parse(stored);
    }
  }
  return currentUser;
}

function setUser(user) {
  currentUser = user;
  if (user) {
    sessionStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
  } else {
    sessionStorage.removeItem(STORAGE_KEYS.USER);
  }
}

function clearAuth() {
  authToken = null;
  currentUser = null;
  sessionStorage.removeItem(STORAGE_KEYS.TOKEN);
  sessionStorage.removeItem(STORAGE_KEYS.USER);
}

async function request(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };

  const token = getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    ...options,
    headers
  };

  try {
    const response = await fetch(url, config);

    if (response.status === 401) {
      clearAuth();
      if (!window.location.pathname.endsWith('login.html') && !window.location.pathname.endsWith('index.html')) {
        window.location.href = 'login.html?session=expired';
      }
      throw new Error('Sesión expirada');
    }

    if (response.status === 403) {
      throw new Error('No tienes permiso para realizar esta acción');
    }

    const contentType = response.headers.get('content-type');
    let data = null;
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    if (!response.ok) {
      const errorMsg = data?.error || data?.message || `Error ${response.status}`;
      const error = new Error(errorMsg);
      error.status = response.status;
      error.detail = data?.detalle;
      throw error;
    }

    return data;
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      const networkError = new Error('Sin conexión al servidor');
      networkError.isNetworkError = true;
      throw networkError;
    }
    throw error;
  }
}

export const api = {
  get: (endpoint) => request(endpoint, { method: 'GET' }),
  post: (endpoint, body) => request(endpoint, { method: 'POST', body: JSON.stringify(body) }),
  put: (endpoint, body) => request(endpoint, { method: 'PUT', body: JSON.stringify(body) }),
  patch: (endpoint, body) => request(endpoint, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: (endpoint) => request(endpoint, { method: 'DELETE' }),

  setToken,
  getToken,
  setUser,
  getUser,
  clearAuth,

  async login(credentials) {
    const data = await this.post(ENDPOINTS.auth.login, credentials);
    if (data.access_token) {
      setToken(data.access_token);
      const user = await this.get(ENDPOINTS.auth.me);
      setUser(user);
      return user;
    }
    throw new Error('Respuesta de login inválida');
  },

  async logout() {
    clearAuth();
    window.location.href = 'login.html';
  },

  isAuthenticated() {
    return !!getToken();
  },

  hasRole(role) {
    const user = getUser();
    return user?.rol === role;
  },

  isAdmin() {
    return this.hasRole(ROLES.ADMIN);
  },

  isVendedor() {
    return this.hasRole(ROLES.VENDEDOR);
  },

  getCurrentUser() {
    return getUser();
  }
};

export const ROLES = {
  ADMIN: 'admin',
  VENDEDOR: 'vendedor'
};

export default api;