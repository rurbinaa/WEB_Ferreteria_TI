import { KEYBOARD_SHORTCUTS } from './apiFactory.js';

let posCallbacks = {
  onFocusSearch: null,
  onAddToCart: null,
  onConfirmSale: null,
  onClearCart: null
};

export function setPosCallbacks(callbacks) {
  posCallbacks = { ...posCallbacks, ...callbacks };
}

export function initKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') {
      if (e.key === 'Escape') {
        e.target.blur();
      }
      return;
    }
    
    switch (e.key) {
      case 'F2':
        e.preventDefault();
        if (posCallbacks.onFocusSearch) posCallbacks.onFocusSearch();
        break;
      case 'Enter':
        if (posCallbacks.onAddToCart) posCallbacks.onAddToCart();
        break;
      case 'F8':
        e.preventDefault();
        if (posCallbacks.onConfirmSale) posCallbacks.onConfirmSale();
        break;
      case 'Escape':
        if (posCallbacks.onClearCart) posCallbacks.onClearCart();
        break;
    }
  });
}

export function registerGlobalShortcut(key, callback, options = {}) {
  const { ctrlKey = false, shiftKey = false, altKey = false } = options;
  
  document.addEventListener('keydown', (e) => {
    if (e.key.toLowerCase() === key.toLowerCase() &&
        e.ctrlKey === ctrlKey &&
        e.shiftKey === shiftKey &&
        e.altKey === altKey) {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') {
        return;
      }
      e.preventDefault();
      callback();
    }
  });
}
