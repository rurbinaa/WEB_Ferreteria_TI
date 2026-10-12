import { api } from './apiFactory.js';
import { showToast } from './ui.js';
import { createNote, deleteNote, listNotes, updateNote } from './notesStore.js';
import { computeZones, packNotes } from './notesLayout.js';

const PUBLIC_PAGES = ['login.html', 'index.html'];
const COLORS = ['amarillo', 'rosa', 'menta', 'celeste', 'lila'];
const debounce = (fn, delay) => { let timer; return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), delay); }; };

let notes = [];
let layer;
let drawer;

function author() { return api.getUser()?.nombre_completo || api.getUser()?.nombre_usuario || 'Usuario'; }
function dateLabel(value) {
  const date = new Date(value); const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
  if (sameDay && now - date < 60_000) return 'ahora';
  if (sameDay) return `hoy ${date.toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit' })}`;
  if (date.toDateString() === yesterday.toDateString()) return 'ayer';
  return date.toLocaleDateString('es-GT');
}
function rotation(id) { return (([...id].reduce((sum, char) => sum + char.charCodeAt(0), 0) % 5) - 2) * 0.8; }

function createShell() {
  layer = document.createElement('aside'); layer.id = 'notas-layer'; layer.setAttribute('aria-label', 'Notas adhesivas');
  const palette = document.createElement('div'); palette.className = 'notas-palette'; palette.setAttribute('aria-label', 'Crear nota');
  COLORS.forEach(color => {
    const button = document.createElement('button'); button.className = `notas-palette-note notas-${color}`; button.type = 'button';
    button.dataset.color = color; button.textContent = '+ Nota'; button.setAttribute('aria-label', `Crear nota ${color}`);
    button.addEventListener('click', () => addNote(color)); palette.appendChild(button);
  });
  const drawerButton = document.createElement('button'); drawerButton.className = 'notas-drawer-button'; drawerButton.type = 'button'; drawerButton.hidden = true;
  drawerButton.addEventListener('click', toggleDrawer); palette.appendChild(drawerButton);
  drawer = document.createElement('section'); drawer.className = 'notas-drawer'; drawer.hidden = true; drawer.setAttribute('aria-label', 'Todas las notas');
  layer.append(palette, drawer); document.body.appendChild(layer);
}

function getMeasures() {
  const workspace = document.querySelector('.workspace')?.getBoundingClientRect();
  const topbar = document.querySelector('.topbar')?.getBoundingClientRect();
  const fab = document.getElementById('venta-fab')?.getBoundingClientRect();
  if (!workspace) return { zones: [], workspace: null, topbar, fab };
  const zones = computeZones({ viewport: { width: innerWidth, height: innerHeight }, workspace, topbar, fab });
  return { zones, workspace, topbar, fab };
}

function noteElement(note, placement, drawerMode = false) {
  const article = document.createElement('article'); article.className = `nota notas-${note.color} nota-${placement.level}`; article.dataset.id = note.id;
  article.style.setProperty('--note-x', `${placement.x || 0}px`); article.style.setProperty('--note-y', `${placement.y || 0}px`);
  article.style.setProperty('--note-w', `${placement.w || 260}px`); article.style.setProperty('--note-h', `${placement.h || 247}px`);
  article.style.setProperty('--note-font', `${Math.max(15, Math.min(26, ((placement.w || 260) / 216) * 22))}px`);
  article.style.setProperty('--note-rotation', `${drawerMode ? 0 : rotation(note.id)}deg`);
  const tools = document.createElement('header'); tools.className = 'nota-tools';
  const compactText = document.createElement('span'); compactText.className = 'nota-compact-text'; compactText.textContent = note.text || 'Nota sin texto';
  const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'nota-delete'; remove.setAttribute('aria-label', 'Eliminar nota'); remove.textContent = '×';
  remove.addEventListener('click', () => removeNote(note)); tools.append(compactText, remove);
  const textarea = document.createElement('textarea'); textarea.value = note.text; textarea.placeholder = 'Escribe una nota…'; textarea.setAttribute('aria-label', 'Texto de la nota');
  const meta = document.createElement('footer'); meta.textContent = `${note.author || author()} · ${dateLabel(note.createdAt)}`;
  let saveTimer;
  textarea.addEventListener('input', () => { clearTimeout(saveTimer); saveTimer = setTimeout(async () => { note.text = textarea.value; await updateNote(note.id, { text: note.text, author: note.author || author() }); compactText.textContent = note.text || 'Nota sin texto'; }, 400); });
  article.addEventListener('focusin', () => article.classList.add('nota-editing'));
  article.addEventListener('focusout', () => article.classList.remove('nota-editing'));
  article.append(tools, textarea, meta); return article;
}

function render() {
  if (!layer) return;
  layer.querySelectorAll('.nota, .notas-debug').forEach(element => element.remove());
  const { zones, workspace, topbar, fab } = getMeasures(); const placements = packNotes(notes, zones);
  const inDrawer = placements.every(item => item.level === 'cajón');
  const drawerButton = layer.querySelector('.notas-drawer-button'); drawerButton.hidden = !inDrawer; drawerButton.textContent = `Notas (${notes.length})`;
  drawer.replaceChildren();
  placements.forEach(placement => {
    const note = notes.find(item => item.id === placement.id);
    if (placement.level === 'cajón') drawer.appendChild(noteElement(note, { level: 'normal', w: 260, h: 247 }, true));
    else layer.appendChild(noteElement(note, placement));
  });
  if (new URLSearchParams(location.search).get('debugNotas') === '1') {
    drawDebug(zones, workspace, topbar, fab); console.info('packNotes', placements);
  }
}

function drawDebug(zones, workspace, topbar, fab) {
  [...zones, workspace, topbar, fab].filter(Boolean).forEach(rect => {
    const debug = document.createElement('div'); debug.className = 'notas-debug';
    const x = rect.x ?? rect.left; const y = rect.y ?? rect.top; const w = rect.w ?? rect.width; const h = rect.h ?? rect.height;
    Object.assign(debug.style, { left: `${x}px`, top: `${y}px`, width: `${w}px`, height: `${h}px` }); layer.appendChild(debug);
  });
}

async function addNote(color) {
  if (notes.length >= 8) { showToast('Máximo 8 notas; quita alguna para agregar otra', 'warning'); return; }
  const note = await createNote({ color, text: '' }); note.author = author(); await updateNote(note.id, { author: note.author }); notes.push(note); render();
  requestAnimationFrame(() => layer.querySelector(`[data-id="${note.id}"] textarea`)?.focus());
}

async function removeNote(note) {
  await deleteNote(note.id); notes = notes.filter(item => item.id !== note.id); render();
  const toast = showToast('Nota eliminada', 'info', null, 6000);
  const undo = document.createElement('button'); undo.type = 'button'; undo.className = 'nota-undo'; undo.textContent = 'Deshacer';
  undo.addEventListener('click', async () => {
    const restored = await createNote({ color: note.color, text: note.text });
    await updateNote(restored.id, { author: note.author, createdAt: note.createdAt });
    Object.assign(restored, { author: note.author, createdAt: note.createdAt });
    notes.push(restored); render(); toast.remove();
  });
  toast.querySelector('.toast-content')?.appendChild(undo);
}

function toggleDrawer() { drawer.hidden = !drawer.hidden; if (!drawer.hidden) drawer.querySelector('textarea')?.focus(); }

function observeLayout() {
  const schedule = debounce(render, 100); const workspace = document.querySelector('.workspace');
  new ResizeObserver(schedule).observe(workspace || document.body); new ResizeObserver(schedule).observe(document.body);
  new MutationObserver(mutations => {
    if (mutations.some(mutation => !layer.contains(mutation.target))) schedule();
  }).observe(document.body, { childList: true, subtree: true }); window.addEventListener('resize', schedule);
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && !drawer.hidden) drawer.hidden = true; });
  document.addEventListener('click', event => { if (!drawer.hidden && !drawer.contains(event.target) && !event.target.closest('.notas-drawer-button')) drawer.hidden = true; });
}

export async function initNotas() {
  const page = location.pathname.split('/').pop() || 'index.html';
  if (PUBLIC_PAGES.includes(page) || !api.isAuthenticated() || document.getElementById('notas-layer')) return;
  createShell(); notes = await listNotes(); render(); observeLayout();
}
