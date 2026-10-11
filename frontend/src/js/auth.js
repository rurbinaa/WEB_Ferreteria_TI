import { api, ROLES } from './apiFactory.js';
import { STORAGE_KEYS } from './config.js';
import { showToast, escapeHtml } from './ui.js';

const PUBLIC_PAGES = ['login.html', 'index.html'];
const ADMIN_ONLY_PAGES = ['dashboard.html', 'proveedores.html', 'alertas.html'];
const VENDEDOR_PAGES = ['venta.html', 'productos.html'];
const THEME_STORAGE_KEY = 'ferreteria_theme';

function getCurrentPage() {
  const path = window.location.pathname;
  const page = path.split('/').pop() || 'index.html';
  return page;
}

function initTheme() {
  const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const theme = savedTheme || (prefersDark ? 'dark' : 'light');
  document.documentElement.setAttribute('data-theme', theme);
  return theme;
}

function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem(THEME_STORAGE_KEY, newTheme);
  return newTheme;
}

function canAccessPage(page) {
  const user = api.getUser();
  if (!user) return false;

  if (ADMIN_ONLY_PAGES.includes(page) && user.rol !== ROLES.ADMIN) return false;
  if (VENDEDOR_PAGES.includes(page) && user.rol !== ROLES.VENDEDOR && user.rol !== ROLES.ADMIN) return false;

  return true;
}

function getDefaultPageForRole(role) {
  if (role === ROLES.ADMIN) return 'dashboard.html';
  if (role === ROLES.VENDEDOR) return 'venta.html';
  return 'login.html';
}

export function initAuthGuard() {
  initTheme();
  const page = getCurrentPage();

  if (PUBLIC_PAGES.includes(page)) {
    if (api.isAuthenticated()) {
      const user = api.getUser();
      window.location.href = getDefaultPageForRole(user.rol);
    }
    return;
  }

  if (!api.isAuthenticated() || !canAccessPage(page)) {
    window.location.href = 'login.html';
    return;
  }

  renderTopBar();
}

function renderTopBar() {
  const user = api.getUser();
  const topbarNav = document.getElementById('topbar-nav');
  const topbarUser = document.getElementById('topbar-user');
  
  if (!topbarNav || !topbarUser) return;

  const role = user?.rol;
  let tabsHtml = '';

  if (role === ROLES.ADMIN) {
    tabsHtml = `
      <a href="dashboard.html" class="topbar-tab" data-page="dashboard">Dashboard</a>
      <a href="venta.html" class="topbar-tab" data-page="venta">Nueva Venta</a>
      <a href="productos.html" class="topbar-tab" data-page="productos">Productos</a>
      <a href="proveedores.html" class="topbar-tab" data-page="proveedores">Proveedores</a>
      <a href="alertas.html" class="topbar-tab" data-page="alertas">Alertas</a>
    `;
  } else if (role === ROLES.VENDEDOR) {
    tabsHtml = `
      <a href="venta.html" class="topbar-tab" data-page="venta">Nueva Venta</a>
      <a href="productos.html" class="topbar-tab" data-page="productos">Productos</a>
    `;
  }

  topbarNav.innerHTML = tabsHtml;

  const currentPage = getCurrentPage();
  topbarNav.querySelectorAll('.topbar-tab').forEach(tab => {
    if (tab.dataset.page === currentPage.replace('.html', '')) {
      tab.classList.add('active');
    }
  });

  const roleClass = role === ROLES.ADMIN ? 'admin' : 'vendedor';
  const roleLabel = role === ROLES.ADMIN ? 'Administrador' : 'Vendedor';
  const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
  const isDark = currentTheme === 'dark';
  const themeLabel = isDark ? 'Modo claro' : 'Modo oscuro';
  const sunIcon = '<svg class="icon icon-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>';
  const moonIcon = '<svg class="icon icon-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>';
  const themeIcon = isDark ? sunIcon : moonIcon;
  
  topbarUser.innerHTML = `
    <div class="topbar-user-info">
      <span class="topbar-user-name">${escapeHtml(user?.nombre_completo || user?.nombre_usuario)}</span>
      <span class="topbar-user-role ${roleClass}">${roleLabel}</span>
    </div>
    <div class="avatar topbar-avatar">${escapeHtml((user?.nombre_completo || user?.nombre_usuario || 'U')[0].toUpperCase())}</div>
    <button class="btn btn-ghost btn-sm" id="btn-theme-toggle" aria-label="${themeLabel}" title="${themeLabel}">
      <span class="theme-toggle-icon">${themeIcon}</span>
    </button>
    <button class="btn btn-ghost btn-sm" id="btn-logout" aria-label="Cerrar sesión">Salir</button>
  `;

  document.getElementById('btn-logout')?.addEventListener('click', () => api.logout());

  // Theme toggle - ensure button exists before attaching listener
  const themeToggleBtn = document.getElementById('btn-theme-toggle');
  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
      const newTheme = toggleTheme();
      const btn = document.getElementById('btn-theme-toggle');
      if (btn) {
        const isDark = newTheme === 'dark';
        const sunIcon = '<svg class="icon icon-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>';
        const moonIcon = '<svg class="icon icon-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>';
        const newIcon = isDark ? sunIcon : moonIcon;
        const newLabel = isDark ? 'Modo claro' : 'Modo oscuro';
        btn.innerHTML = `<span class="theme-toggle-icon">${newIcon}</span>`;
        btn.setAttribute('aria-label', newLabel);
        btn.setAttribute('title', newLabel);
      }
    });
  }
}

export async function handleLogin(form) {
  const username = form.querySelector('#username').value.trim();
  const password = form.querySelector('#password').value;
  const errorEl = document.getElementById('login-error');
  const btn = form.querySelector('#login-btn');

  if (!username || !password) {
    showError('Complete todos los campos');
    return;
  }

  btn.disabled = true;
  btn.classList.add('loading');
  if (errorEl) errorEl.classList.add('d-none');

  try {
    const user = await api.login({ nombre_usuario: username, password });
    showToast(`Bienvenido, ${escapeHtml(user.nombre_completo)}`, 'success');
    window.location.href = getDefaultPageForRole(user.rol);
  } catch (error) {
    showError(error.message || 'Usuario o contraseña incorrectos');
  } finally {
    btn.disabled = true;
    btn.classList.remove('loading');
  }

  function showError(msg) {
    if (errorEl) {
      errorEl.textContent = msg;
      errorEl.classList.remove('d-none');
    }
    form.querySelector('#password').value = '';
    form.querySelector('#username').focus();
  }
}

export function requireAuth() {
  if (!api.isAuthenticated()) {
    window.location.href = 'login.html';
    return false;
  }
  return true;
}

export function requireRole(role) {
  if (!requireAuth()) return false;
  const user = api.getUser();
  if (user?.rol !== role && user?.rol !== ROLES.ADMIN) {
    showToast('No tienes permiso para acceder a esta página', 'danger');
    window.location.href = getDefaultPageForRole(user.rol);
    return false;
  }
  return true;
}

if (document.getElementById('login-form')) {
  document.getElementById('login-form').addEventListener('submit', (e) => {
    e.preventDefault();
    handleLogin(e.target);
  });

  const togglePassword = document.getElementById('toggle-password');
  const passwordInput = document.getElementById('password');
  togglePassword?.addEventListener('click', () => {
    const visible = passwordInput.type === 'text';
    passwordInput.type = visible ? 'password' : 'text';
    togglePassword.setAttribute('aria-label', visible ? 'Mostrar contraseña' : 'Ocultar contraseña');
  });

  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('session') === 'expired') {
    showToast('Su sesión ha expirado, por favor inicie sesión nuevamente', 'warning');
  }
}

document.addEventListener('DOMContentLoaded', initAuthGuard);
