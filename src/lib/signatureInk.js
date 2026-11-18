// =====================================================================
//  VERIFICACIÓN VISUAL DE FIRMAS (sin IA)
//  Busca en la página los espacios de firma que el propio documento
//  trae (bloque "Nombre: / Fecha:" y "Firma:"; las columnas "Firma" de tablas no se miden) y mide
//  si hay trazo de tinta en ellos, descartando el texto reconocido y las
//  líneas rectas del formato. No reconoce QUIÉN firmó ni si la firma es
//  auténtica: solo si el espacio está vacío o tiene un trazo.
// =====================================================================
const n = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();

/**
 * words: [{ t, x0, y0, x1, y1 }] en píxeles del canvas (texto exacto del PDF o palabras del OCR con confianza alta)
 * Devuelve las zonas candidatas a firma: { kind, rect:{x0,y0,x1,y1} }
 */
export function findSlots(words, pageW, pageH) {
  const slots = [];
  const ws = words.filter((w) => w.t && w.t.trim());
  const nombres = ws.filter((w) => /^nombre\s*:$/.test(n(w.t)));
  const fechas = ws.filter((w) => /^fecha\s*:$/.test(n(w.t)));
  for (const w of nombres) {
    const h = w.y1 - w.y0;
    if (!fechas.some((f) => Math.abs(f.x0 - w.x0) < 20 && f.y0 > w.y1 - h && f.y0 - w.y1 < h * 6)) continue;
    const next = nombres.filter((o) => o !== w && Math.abs(o.y0 - w.y0) < h && o.x0 > w.x0).sort((a, b) => a.x0 - b.x0)[0];
    slots.push({ kind: 'bloque', rect: { x0: w.x0 - 6, x1: next ? next.x0 - 6 : Math.min(pageW, w.x0 + 330), y0: w.y0 - h * 9, y1: w.y0 - 2 } });
  }
  for (const w of ws) {
    const t = n(w.t); const h = w.y1 - w.y0;
    if (/^firma(s)?\s*:$/.test(t)) {
      slots.push({ kind: 'firma:', rect: { x0: w.x1 + 4, x1: Math.min(pageW, w.x1 + 340), y0: w.y0 - h * 2.5, y1: w.y1 + h } });
    }
  }
  return slots;
}

/** ¿Hay trazo de tinta en la región? ctx: contexto 2D de la página ya dibujada */
export function measureInk(ctx, slot, words, { minPx = 110 } = {}) {
  const W = ctx.canvas.width, H = ctx.canvas.height;
  const x0 = Math.max(0, Math.floor(slot.rect.x0)), y0 = Math.max(0, Math.floor(slot.rect.y0));
  const x1 = Math.min(W, Math.ceil(slot.rect.x1)), y1 = Math.min(H, Math.ceil(slot.rect.y1));
  const w = x1 - x0, h = y1 - y0;
  if (w < 20 || h < 8) return { ink: null, px: 0 };
  const d = ctx.getImageData(x0, y0, w, h).data;
  const dark = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const g = 0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2];
    dark[i] = g < 150 ? 1 : 0;
  }
  // 1) quitar líneas rectas (la raya de firma, bordes de tabla)
  const rowC = new Uint16Array(h), colC = new Uint16Array(w);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (dark[y * w + x]) { rowC[y]++; colC[x]++; }
  const kill = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) if (rowC[y] >= 0.55 * w) for (let yy = Math.max(0, y - 1); yy <= Math.min(h - 1, y + 1); yy++) for (let x = 0; x < w; x++) kill[yy * w + x] = 1;
  for (let x = 0; x < w; x++) if (colC[x] >= 0.55 * h) for (let xx = Math.max(0, x - 1); xx <= Math.min(w - 1, x + 1); xx++) for (let y = 0; y < h; y++) kill[y * w + xx] = 1;
  // 2) quitar el texto reconocido
  for (const t of words) {
    const a = Math.max(x0, Math.floor(t.x0) - 2), b = Math.min(x1, Math.ceil(t.x1) + 2), c = Math.max(y0, Math.floor(t.y0) - 2), e = Math.min(y1, Math.ceil(t.y1) + 2);
    for (let y = c; y < e; y++) for (let x = a; x < b; x++) kill[(y - y0) * w + (x - x0)] = 1;
  }
  let px = 0;
  for (let i = 0; i < w * h; i++) if (dark[i] && !kill[i]) px++;
  const solid = px > 0.45 * w * h; // relleno o sombra, no trazo
  return { ink: solid ? null : px >= minPx, px };
}
