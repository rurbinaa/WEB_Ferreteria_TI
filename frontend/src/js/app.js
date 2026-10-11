import { api } from './apiFactory.js';
import { initOffline, forceSync } from './offline.js';
import { initKeyboardShortcuts } from './keyboard.js';
import { toggleTheme } from './auth.js';

function initTabs() {
  document.querySelectorAll('[data-tab]').forEach(btn => {
    btn.addEventListener('click', () => {
      const tabName = btn.dataset.tab;
      const container = btn.closest('.tab-bar')?.parentElement;
      if (!container) return;
      
      container.querySelectorAll('[data-tab]').forEach(b => b.classList.remove('active'));
      container.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
      
      btn.classList.add('active');
      const panel = container.querySelector(`[data-tab-panel="${tabName}"]`);
      if (panel) panel.classList.add('active');
    });
  });
}

function initTopBarSync() {
  const btnSync = document.getElementById('btn-sync');
  if (btnSync) {
    btnSync.addEventListener('click', forceSync);
  }
}

// Global theme toggle function - can be called from anywhere
export function toggleThemeGlobal() {
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
}

function initGlobalKeyboard() {
  document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') {
      return;
    }
    
    // Ctrl+Shift+D to toggle theme
    if (e.ctrlKey && e.shiftKey && e.key === 'D') {
      e.preventDefault();
      toggleThemeGlobal();
      return;
    }
    
    if (e.key >= '1' && e.key <= '4' && !e.ctrlKey && !e.metaKey && !e.altKey) {
      const tabs = document.querySelectorAll('.topbar-tab[data-page]');
      const index = parseInt(e.key) - 1;
      if (tabs[index]) {
        tabs[index].click();
      }
    }
  });
}

export function initApp() {
  initTabs();
  initTopBarSync();
  initOffline();
  initKeyboardShortcuts();
  initGlobalKeyboard();
  
  console.log('Ferretería App initialized');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
