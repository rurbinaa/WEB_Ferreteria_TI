import { API_BASE_URL, ENDPOINTS, STORAGE_KEYS, USE_REAL_API } from './config.js';

let authToken = null;
let currentUser = null;
let refreshPromise = null;

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
  sessionStorage.removeItem(STORAGE_KEYS.POS_CART);
  sessionStorage.removeItem(STORAGE_KEYS.VENTA_BORRADOR);
}

async function refreshToken() {
  // El backend no tiene refresh token, el JWT expira en 480min (8h)
  // Si el token expira, el usuario debe volver a loguearse
  return false;
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

    // Manejar 401: token expirado o inválido
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
      // Normalizar errores del backend (FastAPI devuelve { error, detalle })
      const errorMsg = data?.error || data?.detail || data?.message || `Error ${response.status}`;
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

// Login usando JSON (según especificación del backend)
async function login(credentials) {
  const response = await fetch(`${API_BASE_URL}${ENDPOINTS.auth.login}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      nombre_usuario: credentials.nombre_usuario,
      password: credentials.password
    }),
  });

  if (response.status === 401) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data?.error || data?.detail || 'Usuario o contraseña incorrectos');
  }

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data?.error || data?.detail || `Error ${response.status}`);
  }

  const data = await response.json();
  if (data.access_token) {
    setToken(data.access_token);
    const user = await getMe();
    setUser(user);
    return user;
  }
  throw new Error('Respuesta de login inválida');
}

async function getMe() {
  const response = await fetch(`${API_BASE_URL}${ENDPOINTS.auth.me}`, {
    headers: {
      'Authorization': `Bearer ${getToken()}`
    }
  });
  
  if (!response.ok) {
    throw new Error('No autenticado');
  }
  
  return response.json();
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
  login,
  logout: () => { clearAuth(); window.location.href = 'login.html'; },

  isAuthenticated() {
    return !!getToken();
  },

  hasRole(role) {
    const user = getUser();
    return user?.rol === role;
  },

  isAdmin() {
    return this.hasRole('admin');
  },

  isVendedor() {
    return this.hasRole('vendedor');
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