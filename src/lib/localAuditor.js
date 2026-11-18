// =====================================================================
//  AUDITOR PROPIO (sin IA externa)
//  Cruza el texto de un documento/imagen con lo que pide un requisito del
//  checklist y con los formatos de la app. Es un motor de reglas: busca
//  términos clave, códigos de formato, fechas, vigencia, firmas y si el
//  formato fue diligenciado. No "entiende" redacción libre: sus conceptos
//  son verificaciones objetivas y deben ser confirmados por una persona.
//  Funciones puras (sin red ni DOM) para poder probarlas en Node.
// =====================================================================
import { FORMATS } from '../data/formatos';
import { REQUIREMENTS as CATALOG } from '../data/pamecCatalog';

// ---------------------------- texto ----------------------------
export const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

const STOP = new Set(('para con por una uno unos unas del los las que como esta este estos estas sus son sin sobre entre desde hasta ' +
  'mas pero todo toda todos todas cada ser fue han hay debe deben segun cuando donde tipo nivel anual vigente vigencia documento documentos ' +
  'evidencia evidencias formato formatos registro registros copia soporte soportes institucional ips plan programa decreto resolucion ley ' +
  'articulo articulos arts art circular norma normas').split(' '));

const stem = (w) => { w = w.replace(/(es|s)$/, ''); return w.length >= 6 ? w.slice(0, 5) : w; };

// Devuelve Map<raíz, palabra original> de los términos significativos
function terms(...texts) {
  const m = new Map();
  for (const t of texts) {
    for (const w of norm(t).split(/[^a-z0-9ñ]+/)) {
      if (w.length < 4 || STOP.has(w) || /^\d+$/.test(w)) continue;
      const k = stem(w);
      if (!m.has(k)) m.set(k, w);
    }
  }
  return m;
}

const docTokens = (text) => {
  const set = new Set(); let count = 0;
  for (const w of norm(text).split(/[^a-z0-9ñ]+/)) { if (w.length >= 3) { count++; set.add(stem(w)); } }
  return { set, count };
};

// ---------------------------- formatos ----------------------------
export const formatsForReq = (code) => FORMATS.filter((f) => f.reqs?.includes(code));

function formatStrings(f) {
  const out = [f.id, f.title, f.objetivo, f.norma, f.fuente, 'sistema obligatorio de garantia de calidad en salud codigo version fecha pagina formato sugerido generado con la app urueta pamec ajustelo y apruebelo segun el control de documentos de la ips norma fuente requisitos pamec que soporta nombre firma cumple no cumple observaciones evidencia total'];
  for (const s of f.sections || []) {
    out.push(s.title, s.label, s.body, s.extra);
    (s.fields || []).forEach((x) => out.push(x));
    (s.columns || []).forEach((c) => out.push(c.h));
    (s.items || []).forEach((x) => out.push(x));
    (s.roles || []).forEach((x) => out.push(x));
    (s.prefill || []).forEach((row) => row.forEach((x) => out.push(x)));
  }
  return out.filter(Boolean).join(' ');
}
const FMT_CACHE = new Map();
function formatTokenSet(f) {
  if (!FMT_CACHE.has(f.id)) FMT_CACHE.set(f.id, docTokens(formatStrings(f)).set);
  return FMT_CACHE.get(f.id);
}

// ---------------------------- fechas ----------------------------
const MESES = { enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6, julio: 7, agosto: 8, septiembre: 9, setiembre: 9, octubre: 10, noviembre: 11, diciembre: 12 };
const D_NUM = String.raw`(?<![\d./-])(\d{1,2})\s*[/-]\s*(\d{1,2})\s*[/-]\s*(\d{4}|\d{2})(?![\d/-])`;
const D_ISO = String.raw`(\d{4})-(\d{2})-(\d{2})`;
const D_TXT = String.raw`(\d{1,2})\s+de\s+(${Object.keys(MESES).join('|')})\s+(?:de(?:l)?\s+)?(\d{4})`;
const mkDate = (y, m, d) => { if (y < 100) y += 2000; const dt = new Date(Date.UTC(y, m - 1, d)); return y >= 1990 && y <= 2100 && m >= 1 && m <= 12 && d >= 1 && d <= 31 && dt.getUTCMonth() === m - 1 ? dt : null; };

function findDates(text) {
  const t = norm(text); const out = [];
  const add = (idx, dt, len) => dt && out.push({ idx, end: idx + len, date: dt });
  for (const m of t.matchAll(new RegExp(D_ISO, 'g'))) add(m.index, mkDate(+m[1], +m[2], +m[3]), m[0].length);
  for (const m of t.matchAll(new RegExp(D_TXT, 'g'))) add(m.index, mkDate(+m[3], MESES[m[2]], +m[1]), m[0].length);
  for (const m of t.matchAll(new RegExp(D_NUM, 'g'))) add(m.index, mkDate(+m[3], +m[2], +m[1]), m[0].length); // dd/mm/aaaa (formato colombiano)
  return { t, list: out.sort((a, b) => a.idx - b.idx) };
}
const iso = (d) => d.toISOString().slice(0, 10);
const fmt = (d) => d.toLocaleDateString('es-CO', { timeZone: 'UTC' });

// ---------------------------- núcleo ----------------------------
// Peso de cada término: los que aparecen en casi todos los requisitos (pamec, calidad, auditoría…) valen poco
let DF = null;
function weight(k) {
  if (!DF) {
    DF = new Map();
    for (const r of CATALOG) for (const key of terms(r.title, r.description, r.evidence).keys()) DF.set(key, (DF.get(key) || 0) + 1);
  }
  return Math.max(0.1, Math.log(CATALOG.length / (DF.get(k) || 0.5)) / Math.log(CATALOG.length));
}
const cover = (map, set) => {
  if (!map.size) return { ratio: 1, found: [], missing: [] };
  const found = [], missing = []; let wf = 0, wt = 0;
  for (const [k, w] of map) { const x = weight(k); wt += x; if (set.has(k)) { found.push(w); wf += x; } else missing.push(w); }
  return { ratio: wt ? wf / wt : 1, found, missing };
};

function reqTerms(req) {
  const title = terms(req.title);
  const evid = terms(req.evidence, req.description);
  for (const k of title.keys()) evid.delete(k);
  return { title, evid };
}

// Pertinencia 0..1 del documento frente a un requisito (+ formatos asociados)
function relevance(dt, rawNorm, req) {
  const { title, evid } = reqTerms(req);
  const fmts = formatsForReq(req.code);
  const cTitle = cover(title, dt.set), cEvid = cover(evid, dt.set);
  const cFmt = fmts.length ? Math.max(...fmts.map((f) => cover(terms(f.title, ...(f.sections || []).flatMap((s) => [s.title, s.label, ...(s.fields || []), ...(s.columns || []).map((c) => c.h)])), dt.set).ratio)) : null;
  let score = cFmt == null ? 0.5 * cTitle.ratio + 0.5 * cEvid.ratio : 0.4 * cTitle.ratio + 0.3 * cEvid.ratio + 0.3 * cFmt;
  const fmtById = fmts.find((f) => rawNorm.includes(norm(f.id)));
  const codeHit = req.code && rawNorm.includes(norm(req.code));
  if (fmtById || codeHit) score = Math.max(score, 0.9);
  return { score, cTitle, cEvid, cFmt, fmtById, codeHit, fmts };
}

/** Requisitos que mejor coinciden con un texto (para saber "a qué requisito corresponde") */
export function bestRequirements(text, requirements, n = 3) {
  const dt = docTokens(text); const rawNorm = norm(text);
  return requirements.map((r) => ({ req: r, score: relevance(dt, rawNorm, r).score })).sort((a, b) => b.score - a.score).slice(0, n);
}

function detectFormat(rawNorm, dt) {
  const byId = FORMATS.find((f) => rawNorm.includes(norm(f.id)));
  if (byId) return { f: byId, how: 'código' };
  let best = null;
  for (const f of FORMATS) { const c = cover(terms(f.title), dt.set).ratio; if (c >= 0.75 && (!best || c > best.c)) best = { f, c, how: 'título' }; }
  return best;
}

const SIGN_NEEDED = /firm|acta|listado|asistencia|aprob|adopci|designaci|compromiso|consentimiento|declaraci/;
const EXPIRY_NEEDED = /vigen|vencim|poliza|licencia|certificad|habilitaci|rut|camara de comercio|contrato|calibraci|mantenimiento|registro sanitario|vacun/;
const EXPIRY_KEYS = /(vence|vencimiento|vigencia hasta|valid[oa] hasta|vigente hasta|hasta el|expira|finaliza|fecha de vencimiento)/;
const LABELS_STOP = /(nombre|fecha|cargo|firma|cedula|documento|c\.c)\s*:/;

// ---------------------------- firmas ----------------------------
// Valor escrito después de una etiqueta ("Nombre: Juan Pérez") hasta la siguiente etiqueta o el fin de línea
function valueAfter(t, endIdx) {
  const rest = t.slice(endIdx).split('\n')[0];
  const stop = rest.search(LABELS_STOP);
  const v = (stop >= 0 ? rest.slice(0, stop) : rest).replace(/[_.\-–—|]+/g, ' ').trim();
  return (v.match(/[a-zñ]/g) || []).length >= 3 ? v : '';
}

/** Espacios de firma que trae el propio documento y si tienen nombre escrito (texto) */
function textSignatures(rawNorm) {
  const blocks = [], firmas = [];
  for (const m of rawNorm.matchAll(/(?<![a-z])nombre\s*:/g)) {
    if (!/fecha\s*:/.test(rawNorm.slice(m.index, m.index + 160))) continue; // bloque de firma: Nombre / Fecha
    blocks.push(valueAfter(rawNorm, m.index + m[0].length));
  }
  for (const m of rawNorm.matchAll(/(?<![a-z])firma(?:s)?(?:\s+(?:del?|de la|y sello|responsable)\s+[a-z]+)?\s*:/g)) firmas.push(valueAfter(rawNorm, m.index + m[0].length));
  const hasColumn = /(^|\n|\s)firma(s)?(\s|$)/.test(rawNorm.replace(/firma(s)?\s*:/g, ''));
  return { blocks, firmas, hasColumn };
}

// ---------------------------- campos del formato ----------------------------
function fieldFill(text, fmt) {
  const t = norm(text);
  const labels = [...new Set((fmt.sections || []).filter((x) => x.type === 'info').flatMap((x) => x.fields || []))];
  const found = []; let from = 0;
  for (const lab of labels) {
    const l = norm(lab); const i = t.indexOf(l, from);
    if (i < 0) continue;
    found.push({ lab, i, end: i + l.length }); from = i + l.length;
  }
  if (labels.length < 2 || found.length < Math.ceil(labels.length * 0.6)) return null; // lectura insuficiente: no se juzga
  const empty = [];
  found.forEach((f, k) => {
    const nextStart = k + 1 < found.length ? found[k + 1].i : t.length;
    const lineEnd = t.indexOf('\n', f.end); const stop = Math.min(nextStart, lineEnd < 0 ? t.length : lineEnd);
    const v = t.slice(f.end, stop).replace(/[_.\-–—|:\s]+/g, ' ').trim();
    if (!/[a-z0-9ñ]/.test(v)) empty.push(f.lab);
  });
  return { total: found.length, empty };
}

// ---------------------------- evidencia esperada ----------------------------
// Cada elemento de la "evidencia esperada" del requisito (separados por ;) debe aparecer en el documento
function evidenceItems(req, dt) {
  const segs = String(req.evidence || '').split(/;|\n/).map((x) => x.trim().replace(/\.$/, '')).filter((x) => x.length > 6);
  return segs.map((seg) => {
    const alts = seg.split(/\s+o\s+|\s+y\/o\s+/).filter((x) => terms(x).size);
    const ratio = Math.max(0, ...alts.map((a) => cover(terms(a), dt.set).ratio));
    return { seg, ratio };
  });
}

// Citas normativas del requisito ("Res. 3100/2019", "Decreto 780") y cuáles aparecen en el documento
function normCites(req, rawNorm) {
  const cites = [];
  for (const m of norm(req.norma).matchAll(/(decreto|resolucion|res\.?|ley|circular(?: externa)?|cir\.?)\s*(?:no\.?\s*)?(\d{1,4})(?:\s*(?:de|\/)\s*(\d{4}))?/g)) cites.push({ label: `${m[1].replace(/\.$/, '')} ${m[2]}${m[3] ? '/' + m[3] : ''}`, num: m[2] });
  const all = [...new Map(cites.map((c) => [c.num, c])).values()];
  const cited = all.filter((c) => new RegExp(`(?<!\\d)${c.num}(?!\\d)`).test(rawNorm));
  return { all, cited };
}

/**
 * Analiza el texto extraído de un documento frente a un requisito.
 * signatures: espacios de firma medidos visualmente [{ kind, ink: true|false|null }] (si se pudo).
 */
export function analyze({ text, req, ocrConfidence = null, signatures = null, today = new Date() }) {
  text = String(text || '').replace(/sistema obligatorio de garant[ií]a de calidad en salud/gi, ' ').replace(/formato sugerido generado con la app urueta pamec[^.]*\./gi, ' ');
  const hallazgos = [], faltantes = [], recomendaciones = [];
  const rawNorm = norm(text); const dt = docTokens(text);
  const rel = relevance(dt, rawNorm, req);
  const detected = detectFormat(rawNorm, dt);
  const detectedName = detected ? `${detected.f.title} (${detected.f.id})` : null;
  const blockers = []; // fallas que impiden aprobar

  // ---------- legibilidad ----------
  if (dt.count < 25) {
    return {
      motor: 'local', veredicto: 'rechazado', puntaje: 5, tipo_documento_detectado: detectedName || 'No identificado', corresponde_al_requisito: false,
      resumen: 'No se pudo leer texto suficiente en el archivo. Puede estar en blanco, ser una imagen borrosa o un escaneo de baja calidad.',
      hallazgos: [`Solo se reconocieron ${dt.count} palabras.`], faltantes: ['Documento legible'],
      recomendaciones: ['Vuelva a tomar la foto con buena luz, de frente y sin sombras, o suba el PDF original.'], fecha_vigencia_detectada: null
    };
  }
  if (ocrConfidence != null && ocrConfidence < 60) {
    faltantes.push(`Baja legibilidad de la imagen (reconocimiento ${Math.round(ocrConfidence)}%). El análisis puede fallar.`);
    recomendaciones.push('Tome la foto de nuevo con más luz y encuadre completo, o suba el PDF.');
    blockers.push('legibilidad');
  }

  // ---------- pertinencia (35) ----------
  const corresponde = rel.score >= 0.45 && (rel.cTitle.ratio >= 0.3 || !!(rel.fmtById || rel.codeHit));
  const pertPts = Math.round(Math.min(1, rel.score / 0.8) * 35);
  if (rel.fmtById) hallazgos.push(`Corresponde al formato ${rel.fmtById.id} «${rel.fmtById.title}», que soporta este requisito.`);
  else if (rel.codeHit) hallazgos.push(`El documento cita el código del requisito (${req.code}).`);
  else if (detected && !rel.fmts.some((f) => f.id === detected.f.id)) hallazgos.push(`Parece ser el formato ${detected.f.id} «${detected.f.title}», que no está asociado a este requisito.`);
  hallazgos.push(`Términos del título encontrados: ${rel.cTitle.found.length} de ${rel.cTitle.found.length + rel.cTitle.missing.length}${rel.cTitle.found.length ? ' (' + rel.cTitle.found.slice(0, 6).join(', ') + ')' : ''}.`);
  if (rel.cTitle.missing.length) faltantes.push('No se encontraron los términos del requisito: ' + rel.cTitle.missing.slice(0, 8).join(', ') + '.');
  if (!corresponde) { faltantes.unshift('El contenido no coincide con lo que pide este requisito.'); blockers.push('pertinencia'); }
  if (!rel.fmtById && rel.fmts.length) recomendaciones.push(`Use el formato ${rel.fmts.map((f) => f.id).join(' o ')} de la pestaña Formatos.`);

  // ---------- contenido frente a la evidencia que pide el requisito y la norma (25) ----------
  const own = rel.fmtById || (detected?.how === 'código' ? detected.f : null);
  const parts = [];
  const items = evidenceItems(req, dt);
  if (items.length) {
    const okItems = items.filter((x) => x.ratio >= 0.5);
    parts.push(okItems.length / items.length);
    hallazgos.push(`Elementos de la evidencia que pide el requisito: ${okItems.length} de ${items.length}.`);
    items.filter((x) => x.ratio < 0.5).forEach((x) => faltantes.push(`No se evidencia: «${x.seg}».`));
    if (okItems.length < items.length) blockers.push('evidencia');
  } else if (rel.cEvid.found.length + rel.cEvid.missing.length) {
    parts.push(rel.cEvid.ratio);
    hallazgos.push(`Elementos de la evidencia esperada encontrados: ${rel.cEvid.found.length} de ${rel.cEvid.found.length + rel.cEvid.missing.length}.`);
    if (rel.cEvid.ratio < 0.5) { faltantes.push('Parte de la evidencia esperada no aparece: ' + rel.cEvid.missing.slice(0, 8).join(', ') + '.'); blockers.push('evidencia'); }
  }
  if (own) {
    const ff = fieldFill(text, own);
    if (ff) {
      parts.push((ff.total - ff.empty.length) / ff.total);
      if (ff.empty.length) {
        faltantes.push(`Campos del formato sin diligenciar (${ff.empty.length} de ${ff.total}): ${ff.empty.slice(0, 8).join(', ')}${ff.empty.length > 8 ? '…' : ''}.`);
        recomendaciones.push('Diligencie todos los campos del formato antes de subirlo como evidencia.');
        blockers.push('campos');
      } else hallazgos.push(`Todos los campos del formato están diligenciados (${ff.total}).`);
      if (ff.empty.length > ff.total / 2) blockers.push('en blanco');
    } else {
      const tpl = formatTokenSet(own);
      let extra = 0; for (const w of rawNorm.split(/[^a-z0-9ñ]+/)) if (w.length >= 3 && !tpl.has(stem(w))) extra++;
      parts.push(Math.min(1, extra / 60));
      if (extra < 12) { faltantes.push('El formato parece estar en blanco o casi sin diligenciar.'); recomendaciones.push('Diligencie los campos del formato antes de subirlo como evidencia.'); blockers.push('en blanco'); }
      else hallazgos.push(`El formato contiene información diligenciada (${extra} palabras propias).`);
    }
  } else {
    parts.push(Math.min(1, dt.count / 150));
    if (dt.count < 60) { faltantes.push('El documento tiene muy poco contenido.'); blockers.push('contenido'); }
  }
  const cites = normCites(req, rawNorm);
  if (cites.all.length) {
    if (cites.cited.length) hallazgos.push('Cita la norma que sustenta el requisito: ' + cites.cited.map((c) => c.label).join(', ') + '.');
    else if (!own) recomendaciones.push('El documento no cita la norma en que se basa (' + cites.all.map((c) => c.label).join(', ') + '). Conviene referenciarla.');
  }
  const contPts = Math.round((parts.reduce((a, b) => a + b, 0) / Math.max(1, parts.length)) * 25);

  // ---------- fechas (10) y vigencia (10) ----------
  const { t: dtext, list: dates } = findDates(text);
  const todayUTC = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
  let datePts = 0, vigPts = 10, expiry = null;
  if (dates.length) {
    datePts = 10;
    hallazgos.push('Fechas detectadas: ' + [...new Set(dates.map((d) => fmt(d.date)))].slice(0, 5).join(', ') + '.');
  } else { faltantes.push('No se detectó ninguna fecha diligenciada en el documento.'); blockers.push('fecha'); }

  const expKey = [...dtext.matchAll(new RegExp(EXPIRY_KEYS, 'g'))];
  for (const k of expKey) { const hit = dates.find((d) => d.idx >= k.index && d.idx - (k.index + k[0].length) <= 40); if (hit) { expiry = hit.date; break; } }
  const needsExpiry = EXPIRY_NEEDED.test(norm(req.title + ' ' + req.evidence));
  let vencido = false;
  if (expiry) {
    const days = Math.round((expiry - todayUTC) / 86400000);
    if (days < 0) { vencido = true; vigPts = 0; faltantes.push(`El documento está VENCIDO (venció el ${fmt(expiry)}).`); recomendaciones.push('Renueve el documento y suba la versión vigente.'); }
    else if (days <= 60) { vigPts = 6; hallazgos.push(`Vigente hasta el ${fmt(expiry)}.`); recomendaciones.push(`Vence en ${days} días: programe la renovación.`); }
    else { hallazgos.push(`Vigente hasta el ${fmt(expiry)}.`); }
  } else if (needsExpiry) {
    vigPts = 3; faltantes.push('No se detectó fecha de vencimiento o vigencia.'); blockers.push('vigencia');
  } else if (dates.length && /anual|semestral|trimestral|mensual/i.test(req.periodicity || '')) {
    const newest = dates[dates.length - 1].date; const age = Math.round((todayUTC - newest) / 86400000);
    if (age > 400 && /anual/i.test(req.periodicity)) { vigPts = 4; faltantes.push(`La fecha más reciente (${fmt(newest)}) tiene más de un año; el requisito es anual.`); blockers.push('vigencia'); }
  }

  // ---------- firmas (20) ----------
  // Se toman los espacios de firma que trae el propio documento; si el requisito exige soporte firmado, también debe haberlos.
  const ts = textSignatures(rawNorm);
  const typedSlots = [...ts.blocks, ...ts.firmas];
  const typedNames = typedSlots.filter(Boolean).length;
  const visual = (signatures || []).filter((x) => x.ink !== null);
  const visualInk = visual.filter((x) => x.ink).length;
  const required = SIGN_NEEDED.test(norm(req.title + ' ' + req.evidence)) || /firmad|firma del|firma de /.test(norm(req.evidence));
  const nSlots = Math.max(typedSlots.length, visual.length, ts.hasColumn ? 1 : 0);
  let signPts = 20;
  if (nSlots > 0) {
    if (visual.length) {
      if (visualInk === 0 && typedNames === 0) { signPts = 0; faltantes.push(`El documento tiene ${nSlots} espacio(s) de firma y NINGUNO está firmado (no se detecta trazo ni nombre).`); blockers.push('sin firmas'); }
      else if (visualInk === 0) { signPts = 6; faltantes.push('Hay nombres escritos pero no se detecta trazo de firma en los espacios de firma.'); recomendaciones.push('Firme el documento (firma manuscrita o electrónica) y vuelva a subirlo.'); blockers.push('sin firmas'); }
      else if (visualInk < visual.length) { signPts = Math.round(20 * visualInk / visual.length); faltantes.push(`Firmas detectadas en ${visualInk} de ${visual.length} espacios de firma; faltan ${visual.length - visualInk}.`); blockers.push('firmas incompletas'); }
      else hallazgos.push(`Se detectó trazo de firma en ${visualInk} de ${visual.length} espacio(s) de firma.`);
    } else if (typedSlots.length) {
      if (typedNames === 0) { signPts = 0; faltantes.push(`El documento tiene ${typedSlots.length} espacio(s) de firma y NINGUNO está diligenciado (sin nombre ni firma).`); blockers.push('sin firmas'); }
      else if (typedNames < typedSlots.length) { signPts = Math.round(20 * typedNames / typedSlots.length); faltantes.push(`Firmas/nombres en ${typedNames} de ${typedSlots.length} espacios de firma.`); blockers.push('firmas incompletas'); }
      else hallazgos.push(`Los ${typedSlots.length} espacio(s) de firma tienen nombre o firma escrita.`);
      if (ocrConfidence != null || own) { recomendaciones.push('Este auditor no pudo medir el trazo de la firma en este archivo: confírmela a simple vista.'); blockers.push('firma por confirmar'); }
    } else {
      signPts = 8; faltantes.push('Se ve una columna o campo «Firma» pero no se pudo verificar que esté firmado.'); recomendaciones.push('Confirme a simple vista que las firmas estén puestas.'); blockers.push('firma por confirmar');
    }
  } else if (required) {
    signPts = 0; faltantes.push('El requisito pide un soporte firmado y el documento no muestra espacios ni constancia de firma (firma, nombre o responsable que aprueba).');
    recomendaciones.push('Suba el documento firmado por el responsable o el representante legal.'); blockers.push('sin firmas');
  } else if (/firm|elaboro|aprobo|reviso/.test(rawNorm)) {
    hallazgos.push('El documento menciona responsables de elaboración/aprobación.');
  }
  recomendaciones.push('El auditor mide si los espacios de firma están vacíos o con trazo, pero no puede validar que la firma sea auténtica ni de quién es.');

  const puntaje = Math.max(0, Math.min(100, pertPts + contPts + datePts + signPts + vigPts));
  let veredicto = 'observaciones';
  const hard = !corresponde || vencido || puntaje < 40 || blockers.includes('sin firmas') || blockers.includes('en blanco');
  if (hard) veredicto = 'rechazado';
  else if (!blockers.length && !faltantes.length && puntaje >= 80) veredicto = 'aprobado';
  const puntajeFinal = veredicto === 'aprobado' ? puntaje : Math.min(puntaje, veredicto === 'rechazado' ? 45 : 79);

  const resumen = veredicto === 'aprobado'
    ? 'El documento corresponde al requisito, está diligenciado, firmado y vigente según las verificaciones objetivas.'
    : veredicto === 'rechazado'
      ? (!corresponde ? 'El documento no parece corresponder a lo que pide este requisito.'
        : vencido ? 'El documento corresponde al requisito pero está vencido.'
          : blockers.includes('sin firmas') ? 'El documento no está firmado: no sirve como evidencia hasta que se firme.'
            : blockers.includes('en blanco') ? 'El formato está en blanco o casi sin diligenciar.'
              : 'El documento tiene demasiadas fallas para aceptarse como evidencia.')
      : 'El documento parece corresponder al requisito, pero tiene puntos por completar o confirmar antes de darlo por cumplido.';
  return {
    motor: 'local', veredicto, puntaje: puntajeFinal, tipo_documento_detectado: detectedName || 'Documento sin clasificar',
    corresponde_al_requisito: corresponde, resumen, hallazgos, faltantes,
    recomendaciones: [...new Set(recomendaciones)], fecha_vigencia_detectada: expiry ? iso(expiry) : null
  };
}

// ---------------------------- asistente de consulta ----------------------------
const ST = { pendiente: 'pendiente', en_proceso: 'en proceso', cumplido: 'cumplido', no_aplica: 'no aplica' };
export const reqLine = (r) => `**${r.code}** · ${r.title} (${ST[r.status] || r.status || 'pendiente'})`;

export function reqDetail(r) {
  const fmts = formatsForReq(r.code);
  return [`**${r.code} · ${r.title}**`, `Categoría: ${r.category} · Prioridad: ${r.priority} · Estado: ${ST[r.status] || r.status || 'pendiente'}`,
    r.description && `Qué exige: ${r.description}`, r.norma && `Norma: ${r.norma}`, r.evidence && `Evidencia que debe subir: ${r.evidence}`,
    fmts.length ? `Formatos de la app que lo soportan: ${fmts.map((f) => `${f.id} «${f.title}»`).join('; ')}` : 'No tiene un formato asociado en la pestaña Formatos.'].filter(Boolean).join('\n');
}

export function searchRequirements(query, requirements, n = 5) {
  const q = terms(query); if (!q.size) return [];
  return requirements.map((r) => {
    const t = docTokens([r.code, r.title, r.description, r.evidence, r.norma, r.category].join(' ')).set;
    const tt = docTokens(r.title).set;
    let s = 0; for (const k of q.keys()) { if (tt.has(k)) s += 2; else if (t.has(k)) s += 1; }
    return { r, s };
  }).filter((x) => x.s > 0).sort((a, b) => b.s - a.s).slice(0, n).map((x) => x.r);
}

const RANK = { alta: 0, media: 1, baja: 2 };
export function pendingList(requirements, n = 8) {
  return requirements.filter((r) => r.status === 'pendiente' || r.status === 'en_proceso')
    .sort((a, b) => (RANK[a.priority] ?? 1) - (RANK[b.priority] ?? 1) || (a.status === 'en_proceso' ? 1 : 0) - (b.status === 'en_proceso' ? 1 : 0)).slice(0, n);
}

/** Respuesta del asistente a una consulta de texto (sin adjunto). */
export function answerQuery(msg, requirements) {
  const q = norm(msg);
  const code = (msg.match(/\b[A-Za-z]{2,4}-\d{2}\b/) || [])[0]?.toUpperCase();
  const fmtCode = (msg.match(/\bF-[A-Za-z]{2,4}-\d{2}\b/i) || [])[0]?.toUpperCase();
  if (fmtCode) {
    const f = FORMATS.find((x) => x.id === fmtCode);
    if (f) return `**${f.id} · ${f.title}**\nObjetivo: ${f.objetivo}\nNorma: ${f.norma}\nSoporta los requisitos: ${f.reqs.join(', ')}\nDescárgalo en la pestaña **Formatos** (PDF o Excel).`;
  }
  if (code) {
    const r = requirements.find((x) => x.code === code);
    if (r) return reqDetail(r);
  }
  if (/pendient|falta|faltan|pre.?auditor|siguiente|visita|prioridad/.test(q)) {
    const list = pendingList(requirements);
    const done = requirements.filter((r) => r.status === 'cumplido').length, app = requirements.filter((r) => r.status !== 'no_aplica').length;
    if (!list.length) return 'No hay requisitos pendientes. 🎉';
    return `Llevas **${done} de ${app}** requisitos cumplidos. Lo más urgente (por prioridad):\n` + list.map((r, i) => `${i + 1}. ${reqLine(r)}\n   Evidencia: ${r.evidence || '—'}`).join('\n') + '\n\nEscribe el código (por ejemplo **' + list[0].code + '**) para ver el detalle, o adjunta el documento y te digo si corresponde.';
  }
  if (/formato/.test(q)) {
    const kw = terms(msg.replace(/formatos?/gi, ''));
    const hit = FORMATS.map((f) => ({ f, s: [...kw.keys()].filter((k) => docTokens(f.title + ' ' + f.group).set.has(k)).length })).filter((x) => x.s > 0).sort((a, b) => b.s - a.s).slice(0, 6);
    if (hit.length) return 'Formatos relacionados (pestaña **Formatos**):\n' + hit.map((x) => `- **${x.f.id}** ${x.f.title}`).join('\n');
    return `La app tiene ${FORMATS.length} formatos organizados por grupo en la pestaña **Formatos**. Escribe un tema (por ejemplo «formato de capacitación») o el código del formato.`;
  }
  const found = searchRequirements(msg, requirements);
  if (found.length) return 'Encontré estos requisitos relacionados:\n' + found.map((r) => `- ${reqLine(r)}`).join('\n') + '\n\nEscribe el código para ver qué evidencia pide y qué formato la soporta.';
  return 'No encontré algo relacionado. Puedes:\n- Escribir un **código** (ej. GOB-01) o de formato (ej. F-GOB-01)\n- Preguntar **«qué me falta»** para ver pendientes por prioridad\n- Escribir un tema (ej. «residuos», «historia clínica»)\n- **Adjuntar un PDF o foto** y te digo a qué requisito corresponde y qué le falta';
}
