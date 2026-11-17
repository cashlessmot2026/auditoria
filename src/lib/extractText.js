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

async function ocrImage(source, onProgress) {
  const w = await getOcr(onProgress);
  const { data } = await w.recognize(source);
  return { text: data.text || '', confidence: data.confidence ?? 0 };
}

// Imagen -> canvas reducido y en escala de grises/contraste (mejora el OCR de fotos de celular)
async function prepareImage(blob) {
  const bmp = await createImageBitmap(blob);
  const scale = Math.min(1, 2400 / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas');
  c.width = Math.round(bmp.width * scale); c.height = Math.round(bmp.height * scale);
  const ctx = c.getContext('2d'); ctx.drawImage(bmp, 0, 0, c.width, c.height);
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
  let text = '';
  for (let i = 1; i <= pages; i++) {
    const p = await pdf.getPage(i);
    const tc = await p.getTextContent();
    text += tc.items.map((it) => it.str).join(' ') + '\n';
  }
  // Si casi no hay texto, es un escaneo: se aplica OCR a las primeras páginas
  if (text.replace(/\s+/g, '').length < 40 * Math.min(pages, 3)) {
    let ocr = '', conf = 0, n = 0;
    for (let i = 1; i <= Math.min(pdf.numPages, 6); i++) {
      onProgress?.(`Leyendo página ${i} (OCR)…`);
      const p = await pdf.getPage(i);
      const vp = p.getViewport({ scale: 2 });
      const c = document.createElement('canvas'); c.width = vp.width; c.height = vp.height;
      await p.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise;
      const r = await ocrImage(c); ocr += r.text + '\n'; conf += r.confidence; n++;
    }
    return { text: ocr, method: 'ocr', confidence: n ? conf / n : 0 };
  }
  return { text, method: 'pdf', confidence: null };
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
 * @returns {{text:string, method:'pdf'|'ocr'|'texto'|'word'|'excel', confidence:number|null}}
 */
export async function extractText(blob, name = '', mime = '', onProgress) {
  const ext = (name.split('.').pop() || '').toLowerCase();
  const type = mime || blob.type || '';
  if (type === 'application/pdf' || ext === 'pdf') return pdfText(blob, onProgress);
  if (type.startsWith('image/') || ['jpg', 'jpeg', 'png', 'webp', 'bmp'].includes(ext)) {
    if (/hei[cf]/.test(type) || ['heic', 'heif'].includes(ext)) throw new Error('El formato HEIC no se puede leer. Tome la foto en formato JPG o suba el PDF.');
    onProgress?.('Leyendo la imagen (OCR)…');
    const r = await ocrImage(await prepareImage(blob), (p) => onProgress?.(`Leyendo la imagen (OCR)… ${p}%`));
    return { text: r.text, method: 'ocr', confidence: r.confidence };
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
