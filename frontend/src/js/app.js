import { api } from './apiFactory.js';
import { initOffline, forceSync } from './offline.js';
import { initKeyboardShortcuts } from './keyboard.js';
import { initVentaModal } from './ventaModal.js';
import { initNotas } from './notas.js';

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

function initGlobalKeyboard() {
  document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') {
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
  initVentaModal();
  initNotas();
  
  console.log('Ferretería App initialized');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
