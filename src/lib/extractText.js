// Extrae texto de PDF, imágenes (OCR), Word, Excel y texto plano, todo en el navegador.
// Ningún documento sale del equipo. Las librerías se cargan solo cuando se necesitan.
// El OCR (Tesseract) descarga una sola vez el idioma español desde internet.

let ocrWorker = null;
async function getOcr(onProgress) {
  if (!ocrWorker) {
    const { createWorker } = await import('tesseract.js');
    ocrWorker = await createWorker('spa', 1, {
      logger: (m) => { if (m.status === 'recognizing text') onProgress?.(Math.round(m.progress * 100)); }
    });
  }
  return ocrWorker;
}
export async function releaseOcr() { if (ocrWorker) { try { await ocrWorker.terminate(); } catch { /* */ } ocrWorker = null; } }

import { findSlots, measureInk } from './signatureInk';

async function ocrImage(source, onProgress) {
  const w = await getOcr(onProgress);
  const { data } = await w.recognize(source);
  const words = (data.words || []).filter((x) => x.confidence >= 70 && x.bbox).map((x) => ({ t: x.text, x0: x.bbox.x0, y0: x.bbox.y0, x1: x.bbox.x1, y1: x.bbox.y1 }));
  return { text: data.text || '', confidence: data.confidence ?? 0, words };
}

// Mide los espacios de firma de una página ya dibujada en un canvas
function inspectSignatures(canvas, words, minPx) {
  try {
    const slots = findSlots(words, canvas.width, canvas.height);
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    return slots.map((sl) => ({ kind: sl.kind, ...measureInk(ctx, sl, words, { minPx }) }));
  } catch { return []; }
}

// Imagen -> canvas reducido y en escala de grises/contraste (mejora el OCR de fotos de celular)
async function prepareImage(blob) {
  const bmp = await createImageBitmap(blob);
  const scale = Math.min(1, 2400 / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas');
  c.width = Math.round(bmp.width * scale); c.height = Math.round(bmp.height * scale);
  const ctx = c.getContext('2d', { willReadFrequently: true }); ctx.drawImage(bmp, 0, 0, c.width, c.height);
  const img = ctx.getImageData(0, 0, c.width, c.height); const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const g = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    const v = Math.max(0, Math.min(255, (g - 128) * 1.25 + 128));
    d[i] = d[i + 1] = d[i + 2] = v;
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

async function pdfText(blob, onProgress) {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const workerUrl = (await import('pdfjs-dist/legacy/build/pdf.worker.min.mjs?url')).default;
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
  const pdf = await pdfjs.getDocument({ data: new Uint8Array(await blob.arrayBuffer()) }).promise;
  const pages = Math.min(pdf.numPages, 30);
  const SCALE = 2;
  let text = ''; const slots = [];
  for (let i = 1; i <= pages; i++) {
    const p = await pdf.getPage(i);
    const tc = await p.getTextContent();
    // conserva los saltos de línea (misma altura = misma línea)
    let lastY = null, line = '';
    for (const it of tc.items) {
      const y = it.transform[5];
      if (lastY !== null && Math.abs(y - lastY) > 2) { text += line + '\n'; line = ''; }
      line += (line ? ' ' : '') + it.str; lastY = y;
    }
    text += line + '\n';
    // espacios de firma de la página (solo se dibuja si hay candidatos)
    if (i <= 10) {
      try {
        const vp = p.getViewport({ scale: SCALE });
        const words = tc.items.filter((it) => it.str.trim()).map((it) => {
          const [vx, vy] = vp.convertToViewportPoint(it.transform[4], it.transform[5]);
          const h = (it.height || Math.abs(it.transform[3]) || 8) * SCALE;
          return { t: it.str, x0: vx, x1: vx + (it.width || 0) * SCALE, y0: vy - h, y1: vy + h * 0.25 };
        });
        if (findSlots(words, vp.width, vp.height).length) {
          const c = document.createElement('canvas'); c.width = vp.width; c.height = vp.height;
          const ctx = c.getContext('2d', { willReadFrequently: true });
          ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
          await p.render({ canvasContext: ctx, viewport: vp }).promise;
          slots.push(...inspectSignatures(c, words, 110));
        }
      } catch { /* la verificación visual nunca debe romper la lectura */ }
    }
  }
  // Si casi no hay texto, es un escaneo: se aplica OCR a las primeras páginas
  if (text.replace(/\s+/g, '').length < 40 * Math.min(pages, 3)) {
    let ocr = '', conf = 0, k = 0; const oslots = [];
    for (let i = 1; i <= Math.min(pdf.numPages, 6); i++) {
      onProgress?.(`Leyendo página ${i} (OCR)…`);
      const p = await pdf.getPage(i);
      const vp = p.getViewport({ scale: 2 });
      const c = document.createElement('canvas'); c.width = vp.width; c.height = vp.height;
      const ctx = c.getContext('2d', { willReadFrequently: true });
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
      await p.render({ canvasContext: ctx, viewport: vp }).promise;
      const r = await ocrImage(c); ocr += r.text + '\n'; conf += r.confidence; k++;
      oslots.push(...inspectSignatures(c, r.words, 250));
    }
    return { text: ocr, method: 'ocr', confidence: k ? conf / k : 0, signatures: oslots };
  }
  return { text, method: 'pdf', confidence: null, signatures: slots };
}

async function docxText(blob) {
  const JSZip = (await import('jszip')).default;
  const zip = await JSZip.loadAsync(await blob.arrayBuffer());
  const xml = await zip.file('word/document.xml')?.async('string');
  if (!xml) throw new Error('No se pudo leer el archivo Word.');
  return xml.replace(/<\/w:p>/g, '\n').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'");
}

async function xlsxText(blob) {
  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook(); await wb.xlsx.load(await blob.arrayBuffer());
  const out = [];
  wb.eachSheet((ws) => ws.eachRow((row) => {
    const cells = [];
    row.eachCell((cell) => { const v = cell.value; cells.push(v && typeof v === 'object' ? (v.result ?? v.text ?? (v.richText ? v.richText.map((x) => x.text).join('') : '')) : v); });
    out.push(cells.filter((x) => x !== null && x !== undefined && x !== '').join(' '));
  }));
  return out.join('\n');
}

/**
 * @returns {{text:string, method:'pdf'|'ocr'|'texto'|'word'|'excel', confidence:number|null, signatures?:{kind:string, ink:boolean|null, px:number}[]}}
 */
export async function extractText(blob, name = '', mime = '', onProgress) {
  const ext = (name.split('.').pop() || '').toLowerCase();
  const type = mime || blob.type || '';
  if (type === 'application/pdf' || ext === 'pdf') return pdfText(blob, onProgress);
  if (type.startsWith('image/') || ['jpg', 'jpeg', 'png', 'webp', 'bmp'].includes(ext)) {
    if (/hei[cf]/.test(type) || ['heic', 'heif'].includes(ext)) throw new Error('El formato HEIC no se puede leer. Tome la foto en formato JPG o suba el PDF.');
    onProgress?.('Leyendo la imagen (OCR)…');
    const canvas = await prepareImage(blob);
    const r = await ocrImage(canvas, (p) => onProgress?.(`Leyendo la imagen (OCR)… ${p}%`));
    return { text: r.text, method: 'ocr', confidence: r.confidence, signatures: inspectSignatures(canvas, r.words, 250) };
  }
  if (ext === 'docx') return { text: await docxText(blob), method: 'word', confidence: null };
  if (ext === 'xlsx') return { text: await xlsxText(blob), method: 'excel', confidence: null };
  if (['txt', 'csv'].includes(ext) || type.startsWith('text/')) return { text: await blob.text(), method: 'texto', confidence: null };
  throw new Error('Formato no compatible. Suba PDF, imagen (JPG/PNG), Word (.docx), Excel (.xlsx) o texto.');
}

export const LOCAL_ACCEPT = 'application/pdf,image/*,.txt,.csv,.docx,.xlsx';
export const canAnalyze = (name = '', mime = '') => {
  const ext = (name.split('.').pop() || '').toLowerCase();
  return mime === 'application/pdf' || mime.startsWith('image/') || mime.startsWith('text/') || ['pdf', 'jpg', 'jpeg', 'png', 'webp', 'bmp', 'txt', 'csv', 'docx', 'xlsx'].includes(ext);
};
