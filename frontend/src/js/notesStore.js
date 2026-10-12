const STORAGE_KEY = 'ferreteria_notas_prueba';

function seedNotes() {
  const now = new Date();
  const today0915 = new Date(now); today0915.setHours(9, 15, 0, 0);
  const today0840 = new Date(now); today0840.setHours(8, 40, 0, 0);
  const yesterday = new Date(now); yesterday.setDate(yesterday.getDate() - 1); yesterday.setHours(12, 0, 0, 0);
  return [
    { id: crypto.randomUUID(), color: 'amarillo', text: 'Llamar a Materiales Básicos por el cemento (stock 0)', author: 'Admin', createdAt: today0915.toISOString() },
    { id: crypto.randomUUID(), color: 'menta', text: 'Cuadrar caja chica antes de las 5 pm', author: 'Juan Pérez', createdAt: yesterday.toISOString() },
    { id: crypto.randomUUID(), color: 'rosa', text: 'Pintura Roja 1L: pedir 12 unidades', author: 'Admin', createdAt: today0840.toISOString() }
  ];
}

function read() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try { return JSON.parse(stored); } catch { /* se reemplaza por la semilla */ }
  }
  const notes = seedNotes();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
  return notes;
}

function write(notes) { localStorage.setItem(STORAGE_KEY, JSON.stringify(notes)); }

// TEMPORAL: reemplazar por llamadas a la API.
export async function listNotes() { return read(); }

export async function createNote({ color, text = '' }) {
  const notes = read();
  const note = { id: crypto.randomUUID(), color, text, author: '', createdAt: new Date().toISOString() };
  notes.push(note); write(notes); return note;
}

export async function updateNote(id, patch) {
  const notes = read();
  const note = notes.find(item => item.id === id);
  if (!note) return null;
  Object.assign(note, patch); write(notes); return note;
}

export async function deleteNote(id) {
  const notes = read();
  const index = notes.findIndex(item => item.id === id);
  if (index < 0) return null;
  const [deleted] = notes.splice(index, 1); write(notes); return deleted;
}
