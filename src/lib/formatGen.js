// Generación de formatos en PDF (jsPDF + autotable) y Excel (ExcelJS).
// Las librerías se cargan solo cuando el usuario descarga, para no pesar en la app.
import { FORMATS } from '../data/formatos';
import LOGO from '../assets/logoData.js'; // logo I.P.S. Urueta Dermatología (fondo transparente)

const LOGO_RATIO = 576 / 170; // ancho / alto

const TEAL = [15, 118, 110];
const MARK_ONLY = ['Marque X', 'Calificación', 'Respuesta'];
const VERSION = '01';

const slug = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 60);
export const fileBase = (f) => `${f.id}_${slug(f.title)}`;
const today = () => new Date().toLocaleDateString('es-CO');
const ipsName = (ips) => ips?.nombre || 'Urueta Dermatología IPS';
const ipsLine = (ips) => [ips?.nit ? 'NIT ' + ips.nit : null, ips?.codigo_habilitacion ? 'Cód. habilitación ' + ips.codigo_habilitacion : null, ips?.municipio || 'San Andrés Islas'].filter(Boolean).join(' · ');
const isMarkOnly = (s) => MARK_ONLY.includes(s.extra);

export function downloadBlob(blob, name) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

// ============================== PDF ==============================
export async function buildPDF(f, ips) {
  const [jsp, at] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
  const jsPDF = jsp.jsPDF || jsp.default?.jsPDF;
  const autoTable = [at.autoTable, at.default, at.default?.default, at.default?.autoTable].find((x) => typeof x === 'function');
  const doc = new jsPDF({ orientation: f.landscape ? 'landscape' : 'portrait', unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 10;
  const CW = W - 2 * M;
  const TOP = 33;
  let y = TOP;

  const base = { theme: 'grid', margin: { top: TOP, left: M, right: M, bottom: 14 }, styles: { font: 'helvetica', fontSize: 8, cellPadding: 1.6, lineColor: [150, 160, 165], lineWidth: 0.2, textColor: 20, valign: 'middle' }, headStyles: { fillColor: TEAL, textColor: 255, fontStyle: 'bold', halign: 'center', fontSize: 7.5 } };
  const run = (opts) => { autoTable(doc, { ...base, startY: y, ...opts, styles: { ...base.styles, ...(opts.styles || {}) } }); y = doc.lastAutoTable.finalY + 4; };
  const title = (t) => { run({ body: [[t]], theme: 'plain', styles: { fontStyle: 'bold', fontSize: 9, textColor: TEAL, cellPadding: { top: 1, bottom: 0.3, left: 0 } } }); y -= 3; };
  const widths = (cols, extra = []) => {
    const all = [...cols.map((x) => x.w || 1), ...extra];
    const sum = all.reduce((a, b) => a + b, 0);
    return Object.fromEntries(all.map((w, i) => [i, { cellWidth: (CW * w) / sum }]));
  };

  run({ body: [[{ content: 'Objetivo: ', styles: { fontStyle: 'bold' } }, f.objetivo]], theme: 'plain', styles: { fontSize: 8.5 }, columnStyles: { 0: { cellWidth: 18 } } });

  for (const s of f.sections) {
    if (s.type === 'info') {
      const per = s.cols || 2;
      const rows = [];
      for (let i = 0; i < s.fields.length; i += per) {
        const row = [];
        for (let j = 0; j < per; j++) {
          const fld = s.fields[i + j];
          row.push({ content: fld || '', styles: { fontStyle: 'bold', fillColor: [236, 246, 245] } }, '');
        }
        rows.push(row);
      }
      run({ body: rows, styles: { minCellHeight: 7 }, columnStyles: Object.fromEntries(Array.from({ length: per * 2 }, (_, k) => [k, { cellWidth: (CW / per) * (k % 2 === 0 ? 0.42 : 0.58) }])) });
    } else if (s.type === 'table') {
      if (s.title) title(s.title);
      const n = Math.max(s.rows || 0, s.prefill?.length || 0);
      const body = Array.from({ length: n }, (_, i) => s.columns.map((_, k) => (s.prefill?.[i]?.[k] ?? '')));
      if (s.totals) body.push(s.columns.map((_, k) => (k === 0 ? 'Total' : '')));
      run({ head: [s.columns.map((x) => x.h)], body, styles: { minCellHeight: 6.5, fontSize: s.columns.length > 10 ? 7 : 8 }, columnStyles: widths(s.columns) });
    } else if (s.type === 'check') {
      title(s.title);
      const mark = isMarkOnly(s);
      const head = mark ? [['Criterio', s.extra]] : [['Criterio', 'Cumple', 'No cumple', 'N/A', s.extra]];
      const body = s.items.map((it) => (mark ? [it, ''] : [it, '', '', '', '']));
      run({ head, body, styles: { minCellHeight: 5.6, cellPadding: 1.2 }, columnStyles: mark ? { 0: { cellWidth: CW * 0.75 } } : { 0: { cellWidth: CW * 0.5 }, 1: { cellWidth: CW * 0.08, halign: 'center' }, 2: { cellWidth: CW * 0.08, halign: 'center' }, 3: { cellWidth: CW * 0.07, halign: 'center' } } });
    } else if (s.type === 'text') {
      run({ head: [[{ content: s.label, styles: { halign: 'left' } }]], body: [['']], bodyStyles: { minCellHeight: 6 * (s.lines || 3) } });
    } else if (s.type === 'para') {
      run({ body: [[s.body]], theme: 'plain', styles: { fontSize: 8, fontStyle: 'italic', textColor: 60, fillColor: [244, 248, 249] } });
    } else if (s.type === 'sign') {
      const per = Math.min(s.roles.length, 4);
      for (let i = 0; i < s.roles.length; i += per) {
        const roles = s.roles.slice(i, i + per);
        if (y + 34 > H - 14) { doc.addPage(); y = TOP; }
        run({
          body: [roles.map(() => ''), roles.map((r) => r), roles.map(() => 'Nombre:'), roles.map(() => 'Fecha:')],
          theme: 'plain',
          styles: { fontSize: 8, minCellHeight: 5 },
          didParseCell: (d) => { if (d.row.index === 0) d.cell.styles.minCellHeight = 14; if (d.row.index === 1) d.cell.styles.fontStyle = 'bold'; },
          didDrawCell: (d) => { if (d.row.index === 0) doc.line(d.cell.x + 3, d.cell.y + d.cell.height - 1, d.cell.x + d.cell.width - 3, d.cell.y + d.cell.height - 1); }
        });
      }
    }
  }
  run({ body: [[`Norma: ${f.norma}`], [`Fuente: ${f.fuente}`], ['Requisitos PAMEC que soporta: ' + f.reqs.join(', ')]], theme: 'plain', styles: { fontSize: 7, textColor: 90, cellPadding: 0.6 } });

  // Encabezado y pie en todas las páginas
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    autoTable(doc, {
      ...base, startY: 8, margin: { left: M, right: M }, pageBreak: 'avoid',
      styles: { ...base.styles, fontSize: 7.5, cellPadding: 1.2 },
      body: [
        [{ content: '', rowSpan: 3, styles: { minCellHeight: 18 } },
          { content: 'SISTEMA OBLIGATORIO DE GARANTÍA DE CALIDAD EN SALUD', styles: { halign: 'center', fontStyle: 'bold', fontSize: 7 } },
          { content: 'Código: ' + f.id }],
        [{ content: f.title.toUpperCase(), rowSpan: 2, styles: { halign: 'center', fontStyle: 'bold', fontSize: 9 } }, { content: 'Versión: ' + VERSION + '   Fecha: ' + today() }],
        [{ content: `Página ${p} de ${pages}` }]
      ],
      columnStyles: { 0: { cellWidth: CW * 0.27 }, 1: { cellWidth: CW * 0.5 }, 2: { cellWidth: CW * 0.23 } },
      didDrawCell: (d) => {
        if (d.section !== 'body' || d.row.index !== 0 || d.column.index !== 0) return;
        const pad = 1.5;
        const maxW = d.cell.width - 2 * pad, maxH = d.cell.height - 2 * pad;
        const w = Math.min(maxW, maxH * LOGO_RATIO), h = w / LOGO_RATIO;
        doc.addImage(LOGO, 'PNG', d.cell.x + (d.cell.width - w) / 2, d.cell.y + (d.cell.height - h) / 2, w, h);
      }
    });
    doc.setFontSize(6.5); doc.setTextColor(120);
    doc.text('Formato sugerido generado con la app Urueta PAMEC. Ajústelo y apruébelo según el control de documentos de la IPS.', M, H - 6);
  }
  return doc.output('blob');
}

// ============================== EXCEL ==============================
let ExcelJSmod;
async function excelLib() { if (!ExcelJSmod) ExcelJSmod = (await import('exceljs')).default; return ExcelJSmod; }

const colL = (n) => { let s = ''; while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); } return s; };
const thin = { style: 'thin', color: { argb: 'FF9AA5AA' } };
const BORDER = { top: thin, left: thin, bottom: thin, right: thin };
const HEAD_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F766E' } };
const LABEL_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFECF6F5' } };
const NOTE_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF4F8F9' } };
const CALC_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF8E1' } };

export async function buildXLSX(f, ips, wb) {
  const ExcelJS = await excelLib();
  const own = !wb;
  if (own) { wb = new ExcelJS.Workbook(); wb.creator = ipsName(ips); wb.created = new Date(); }
  const ws = wb.addWorksheet(f.id.slice(0, 31), {
    pageSetup: { paperSize: 9, orientation: f.landscape ? 'landscape' : 'portrait', fitToPage: true, fitToWidth: 1, fitToHeight: 0, margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 } },
    headerFooter: { oddFooter: `&L${f.id} v${VERSION}&RPágina &P de &N` },
    views: [{ showGridLines: false }]
  });

  // Ancho de la cuadrícula = la tabla con más columnas (así las fórmulas quedan en su columna real)
  const tables = f.sections.filter((s) => s.type === 'table');
  const widest = tables.reduce((a, t) => (t.columns.length > (a?.columns.length || 0) ? t : a), null);
  const maxPer = Math.max(0, ...f.sections.filter((s) => s.type === 'info').map((s) => s.cols || 2));
  const G = widest ? Math.max(widest.columns.length, 2 * maxPer, 6) : Math.max(8, 2 * maxPer);
  const relW = widest && widest.columns.length === G ? widest.columns.map((x) => x.w || 1) : Array(G).fill(1);
  const totalRel = relW.reduce((a, b) => a + b, 0);
  const totalChars = f.landscape ? 190 : 125;
  relW.forEach((w, i) => { ws.getColumn(i + 1).width = Math.max(6, Math.round((totalChars * w) / totalRel)); });

  let r = 1;
  const merge = (r1, c1, r2, c2) => { if (r2 > r1 || c2 > c1) ws.mergeCells(r1, c1, r2, c2); };
  const box = (r1, c1, r2, c2) => { for (let i = r1; i <= r2; i++) for (let j = c1; j <= c2; j++) ws.getCell(i, j).border = BORDER; };
  const put = (row, col, value, style = {}) => { const cell = ws.getCell(row, col); cell.value = value; Object.assign(cell, style); cell.alignment = { wrapText: true, vertical: 'middle', ...(style.alignment || {}) }; return cell; };
  const section = (t) => { merge(r, 1, r, G); put(r, 1, t, { font: { bold: true, color: { argb: 'FF0F766E' }, size: 11 } }); r++; };
  // Distribuye k columnas lógicas en G columnas físicas (la última se estira)
  const spans = (k) => { const out = []; const base = Math.floor(G / k); let start = 1; for (let i = 0; i < k; i++) { const end = i === k - 1 ? G : start + base - 1; out.push([start, end]); start = end + 1; } return out; };
  const spansMatching = (cols) => (cols.length === G ? cols.map((_, i) => [i + 1, i + 1]) : spans(cols.length));

  // ---------- Encabezado ----------
  const c1 = Math.max(2, Math.round(G * 0.27)); const c3 = G - Math.max(2, Math.round(G * 0.23)) + 1;
  merge(1, 1, 3, c1);
  const logoId = wb.addImage({ base64: LOGO.split(',')[1], extension: 'png' });
  // Logo centrado en el bloque combinado (filas 1-3 = 20+22+22 pt ≈ 85 px)
  const colPx = Array.from({ length: c1 }, (_, i) => (ws.getColumn(i + 1).width || 8) * 7 + 5);
  const rowPx = [20, 22, 22].map((pt) => (pt * 96) / 72);
  const blockW = colPx.reduce((a, b) => a + b, 0), blockH = rowPx.reduce((a, b) => a + b, 0);
  const lh = Math.min(blockH - 8, (blockW - 8) / LOGO_RATIO), lw = lh * LOGO_RATIO;
  const at = (sizes, off) => { let i = 0; while (i < sizes.length - 1 && off >= sizes[i]) { off -= sizes[i]; i++; } return i + off / sizes[i]; };
  ws.addImage(logoId, { tl: { col: at(colPx, (blockW - lw) / 2), row: at(rowPx, (blockH - lh) / 2) }, ext: { width: lw, height: lh } });
  merge(1, c1 + 1, 1, c3 - 1); put(1, c1 + 1, 'SISTEMA OBLIGATORIO DE GARANTÍA DE CALIDAD EN SALUD', { font: { bold: true, size: 8 }, alignment: { horizontal: 'center' } });
  merge(2, c1 + 1, 3, c3 - 1); put(2, c1 + 1, f.title.toUpperCase(), { font: { bold: true, size: 12 }, alignment: { horizontal: 'center' } });
  merge(1, c3, 1, G); put(1, c3, 'Código: ' + f.id, { font: { size: 9 } });
  merge(2, c3, 2, G); put(2, c3, 'Versión: ' + VERSION, { font: { size: 9 } });
  merge(3, c3, 3, G); put(3, c3, 'Fecha: ' + today(), { font: { size: 9 } });
  box(1, 1, 3, G); ws.getRow(1).height = 20; ws.getRow(2).height = 22; ws.getRow(3).height = 22;
  r = 5;
  merge(r, 1, r, G); put(r, 1, 'Objetivo: ' + f.objetivo, { font: { size: 9 } }); ws.getRow(r).height = 30; r += 2;

  for (const s of f.sections) {
    if (s.type === 'info') {
      const per = s.cols || 2; const sp = spans(per);
      for (let i = 0; i < s.fields.length; i += per) {
        for (let j = 0; j < per; j++) {
          const fld = s.fields[i + j]; if (!fld) continue;
          const [a, b] = sp[j]; const mid = a + Math.max(0, Math.floor((b - a + 1) * 0.45) - 1);
          merge(r, a, r, mid); put(r, a, fld, { font: { bold: true, size: 9 }, fill: LABEL_FILL });
          if (b > mid) merge(r, mid + 1, r, b);
          box(r, a, r, b);
        }
        ws.getRow(r).height = 22; r++;
      }
      r++;
    } else if (s.type === 'table') {
      if (s.title) section(s.title);
      const sp = spansMatching(s.columns);
      s.columns.forEach((col, k) => { const [a, b] = sp[k]; merge(r, a, r, b); put(r, a, col.h, { font: { bold: true, color: { argb: 'FFFFFFFF' }, size: 9 }, fill: HEAD_FILL, alignment: { horizontal: 'center' } }); });
      box(r, 1, r, G); ws.getRow(r).height = 32; r++;
      const n = Math.max(s.rows || 0, s.prefill?.length || 0);
      const first = r; const last = r + n - 1;
      for (let i = 0; i < n; i++) {
        s.columns.forEach((col, k) => {
          const [a, b] = sp[k]; merge(r, a, r, b);
          const cell = ws.getCell(r, a);
          const pre = s.prefill?.[i]?.[k];
          const fx = s.formula?.[k];
          if (fx) { cell.value = { formula: fx(r, first, last) }; cell.fill = CALC_FILL; }
          else if (pre !== undefined && pre !== '') cell.value = pre;
          const list = col.list || s.lists?.[k];
          if (list && !fx) for (let j = a; j <= b; j++) ws.getCell(r, j).dataValidation = { type: 'list', allowBlank: true, formulae: ['"' + list.join(',') + '"'] };
          cell.alignment = { wrapText: true, vertical: 'middle', horizontal: k === 0 && pre ? 'left' : 'center' };
          cell.font = { size: 9 };
        });
        box(r, 1, r, G); ws.getRow(r).height = 20; r++;
      }
      if (s.totals) {
        s.columns.forEach((col, k) => {
          const [a, b] = sp[k]; merge(r, a, r, b);
          const cell = ws.getCell(r, a);
          if (k === 0) cell.value = 'Total';
          else if (!/firma/i.test(col.h)) cell.value = { formula: `SUM(${colL(a)}${first}:${colL(a)}${last})` };
          cell.font = { bold: true, size: 9 }; cell.fill = LABEL_FILL; cell.alignment = { horizontal: 'center' };
        });
        box(r, 1, r, G); r++;
      }
      r++;
    } else if (s.type === 'check') {
      section(s.title);
      const mark = isMarkOnly(s);
      const cols = mark ? ['Criterio', s.extra] : ['Criterio', 'Resultado', s.extra];
      const crit = mark ? Math.max(2, G - 2) : Math.max(2, G - 4);
      const sp = mark ? [[1, crit], [crit + 1, G]] : [[1, crit], [crit + 1, crit + 1], [crit + 2, G]];
      cols.forEach((h, k) => { const [a, b] = sp[k]; merge(r, a, r, b); put(r, a, h, { font: { bold: true, color: { argb: 'FFFFFFFF' }, size: 9 }, fill: HEAD_FILL, alignment: { horizontal: 'center' } }); });
      box(r, 1, r, G); r++;
      const first = r;
      for (const it of s.items) {
        sp.forEach(([a, b]) => merge(r, a, r, b));
        put(r, 1, it, { font: { size: 9 } });
        if (!mark) { const cell = ws.getCell(r, sp[1][0]); cell.dataValidation = { type: 'list', allowBlank: true, formulae: ['"Cumple,No cumple,N/A"'] }; cell.alignment = { horizontal: 'center', vertical: 'middle' }; }
        box(r, 1, r, G); ws.getRow(r).height = Math.max(20, Math.ceil(it.length / ((crit * totalChars) / G / 1.1)) * 14); r++;
      }
      if (!mark) {
        const L = colL(sp[1][0]); const range = `${L}${first}:${L}${r - 1}`;
        merge(r, 1, r, crit); put(r, 1, '% de cumplimiento (Cumple / (Cumple + No cumple))', { font: { bold: true, size: 9 }, fill: LABEL_FILL, alignment: { horizontal: 'right' } });
        const cell = ws.getCell(r, sp[1][0]);
        cell.value = { formula: `IF(COUNTIF(${range},"Cumple")+COUNTIF(${range},"No cumple")=0,"",ROUND(COUNTIF(${range},"Cumple")/(COUNTIF(${range},"Cumple")+COUNTIF(${range},"No cumple"))*100,0)&"%")` };
        cell.fill = CALC_FILL; cell.font = { bold: true }; cell.alignment = { horizontal: 'center' };
        merge(r, sp[2][0], r, G); box(r, 1, r, G); r++;
      }
      r++;
    } else if (s.type === 'text') {
      merge(r, 1, r, G); put(r, 1, s.label, { font: { bold: true, color: { argb: 'FFFFFFFF' }, size: 9 }, fill: HEAD_FILL }); box(r, 1, r, G); r++;
      merge(r, 1, r, G); ws.getRow(r).height = 16 * (s.lines || 3); box(r, 1, r, G); ws.getCell(r, 1).alignment = { wrapText: true, vertical: 'top' }; r += 2;
    } else if (s.type === 'para') {
      merge(r, 1, r, G); put(r, 1, s.body, { font: { italic: true, size: 9, color: { argb: 'FF3C4A50' } }, fill: NOTE_FILL });
      ws.getRow(r).height = Math.max(20, Math.ceil(s.body.length / (totalChars * 1.0)) * 15); r += 2;
    } else if (s.type === 'sign') {
      const sp = spans(Math.min(s.roles.length, 4));
      for (let i = 0; i < s.roles.length; i += sp.length) {
        const roles = s.roles.slice(i, i + sp.length);
        ws.getRow(r).height = 34;
        roles.forEach((role, k) => {
          const [a, b] = sp[k];
          merge(r, a, r, b); ws.getCell(r, a).border = { bottom: { style: 'thin' } };
          for (let j = a; j <= b; j++) ws.getCell(r, j).border = { bottom: { style: 'thin' } };
          merge(r + 1, a, r + 1, b); put(r + 1, a, role, { font: { bold: true, size: 9 }, alignment: { horizontal: 'center' } });
          merge(r + 2, a, r + 2, b); put(r + 2, a, 'Nombre:', { font: { size: 9 } });
          merge(r + 3, a, r + 3, b); put(r + 3, a, 'Fecha:', { font: { size: 9 } });
        });
        r += 5;
      }
    }
  }
  for (const t of [`Norma: ${f.norma}`, `Fuente: ${f.fuente}`, 'Requisitos PAMEC que soporta: ' + f.reqs.join(', '), 'Las celdas amarillas se calculan solas. Formato sugerido: ajústelo y apruébelo según el control de documentos de la IPS.']) {
    merge(r, 1, r, G); put(r, 1, t, { font: { size: 8, color: { argb: 'FF5F6B70' } } }); ws.getRow(r).height = Math.max(14, Math.ceil(t.length / totalChars) * 13); r++;
  }
  ws.pageSetup.printArea = `A1:${colL(G)}${r}`;
  if (own) {
    const buf = await wb.xlsx.writeBuffer();
    return new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  }
  return null;
}

// Paquete completo: un ZIP con todos los PDF y un libro Excel por formato
export async function buildAllZip(ips, onProgress = () => {}) {
  const { default: JSZip } = await import('jszip');
  const zip = new JSZip();
  let i = 0;
  for (const f of FORMATS) {
    const folder = zip.folder(slug(f.group));
    folder.file(fileBase(f) + '.pdf', await buildPDF(f, ips));
    folder.file(fileBase(f) + '.xlsx', await buildXLSX(f, ips));
    onProgress(++i / FORMATS.length);
  }
  return zip.generateAsync({ type: 'blob' });
}
