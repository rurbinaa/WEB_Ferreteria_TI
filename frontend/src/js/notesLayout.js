const MIN_WIDTH = 150;
const GAP = 12;

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

// No DOM: medidas son rectángulos ya calculados por la interfaz.
export function computeZones({ viewport, workspace, topbar, paletteHeight = 140, fab }) {
  const top = Math.max(topbar?.bottom || 0, 0) + GAP;
  const bottom = viewport.height - GAP;
  const candidates = [
    { id: 'left', x: GAP, y: top, w: workspace.left - GAP * 2, h: bottom - top - paletteHeight, modo: 'fixed' },
    { id: 'right', x: workspace.right + GAP, y: top, w: viewport.width - workspace.right - GAP * 2, h: bottom - top, modo: 'fixed' }
  ];
  if (fab?.top && fab.top - GAP < bottom) candidates[1].h = Math.max(0, fab.top - GAP - top);
  return candidates.filter(zone => zone.w >= MIN_WIDTH && zone.h >= 36);
}

function noteSize(zone, scale) {
  const width = clamp(zone.w, MIN_WIDTH, 260) * scale;
  return { w: width, h: width * 0.95 };
}

export function packNotes(notes, zones) {
  const ordered = [...notes].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  if (!zones.length) return ordered.map(note => ({ id: note.id, level: 'cajón' }));
  let scale = 1;
  const fits = value => ordered.length <= zones.reduce((sum, zone) => sum + Math.floor((zone.h + GAP) / (noteSize(zone, value).h + GAP)), 0);
  while (scale > 0.7 && !fits(scale)) scale = Number((scale - 0.05).toFixed(2));
  const placed = [];
  const nextY = new Map(zones.map(zone => [zone.id, zone.y]));
  const counts = new Map(zones.map(zone => [zone.id, 0]));
  for (const note of ordered) {
    const available = zones.filter(zone => {
      const size = noteSize(zone, scale);
      return nextY.get(zone.id) + size.h <= zone.y + zone.h;
    });
    if (available.length) {
      const zone = available.sort((a, b) => counts.get(a.id) - counts.get(b.id) || b.h - a.h)[0];
      const size = noteSize(zone, scale);
      placed.push({ id: note.id, x: zone.x + (zone.w - size.w) / 2, y: nextY.get(zone.id), ...size, scale, level: scale < 1 ? 'reducido' : 'normal', zoneId: zone.id });
      nextY.set(zone.id, nextY.get(zone.id) + size.h + GAP); counts.set(zone.id, counts.get(zone.id) + 1);
    } else {
      const zone = zones[placed.length % zones.length];
      placed.push({ id: note.id, x: zone.x, y: zone.y + counts.get(zone.id) * 38, w: zone.w, h: 36, scale, level: 'compacto', zoneId: zone.id });
      counts.set(zone.id, counts.get(zone.id) + 1);
    }
  }
  return placed;
}
