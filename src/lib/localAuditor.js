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
const SIGN_FOUND = /firmad|firma electronic|firma digital|signature|elaboro|reviso|aprobo|representante legal|gerente|director/;
const EXPIRY_NEEDED = /vigen|vencim|poliza|licencia|certificad|habilitaci|rut|camara de comercio|contrato|calibraci|mantenimiento|registro sanitario|vacun/;
const EXPIRY_KEYS = /(vence|vencimiento|vigencia hasta|valid[oa] hasta|vigente hasta|hasta el|expira|finaliza|fecha de vencimiento)/;

/**
 * Analiza el texto extraído de un documento frente a un requisito.
 * Devuelve el mismo formato que usa la interfaz: veredicto, puntaje, hallazgos, faltantes…
 */
export function analyze({ text, req, ocrConfidence = null, today = new Date() }) {
  text = String(text || '').replace(/sistema obligatorio de garant[ií]a de calidad en salud/gi, ' ').replace(/formato sugerido generado con la app urueta pamec[^.]*\./gi, ' ');
  const hallazgos = [], faltantes = [], recomendaciones = [];
  const rawNorm = norm(text); const dt = docTokens(text);
  const rel = relevance(dt, rawNorm, req);
  const detected = detectFormat(rawNorm, dt);
  const detectedName = detected ? `${detected.f.title} (${detected.f.id})` : null;

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
  }

  // ---------- pertinencia ----------
  const corresponde = rel.score >= 0.45 && (rel.cTitle.ratio >= 0.3 || !!(rel.fmtById || rel.codeHit));
  const pertPts = Math.round(Math.min(1, rel.score / 0.8) * 50);
  if (rel.fmtById) hallazgos.push(`Corresponde al formato ${rel.fmtById.id} «${rel.fmtById.title}», que soporta este requisito.`);
  else if (rel.codeHit) hallazgos.push(`El documento cita el código del requisito (${req.code}).`);
  else if (detected && !rel.fmts.some((f) => f.id === detected.f.id)) hallazgos.push(`Parece ser el formato ${detected.f.id} «${detected.f.title}», que no está asociado a este requisito.`);
  hallazgos.push(`Términos del título encontrados: ${rel.cTitle.found.length} de ${rel.cTitle.found.length + rel.cTitle.missing.length}${rel.cTitle.found.length ? ' (' + rel.cTitle.found.slice(0, 6).join(', ') + ')' : ''}.`);
  if (rel.cEvid.found.length + rel.cEvid.missing.length) hallazgos.push(`Elementos de la evidencia esperada encontrados: ${rel.cEvid.found.length} de ${rel.cEvid.found.length + rel.cEvid.missing.length}.`);
  if (rel.cTitle.missing.length) faltantes.push('No se encontraron los términos del requisito: ' + rel.cTitle.missing.slice(0, 8).join(', ') + '.');
  if (rel.cEvid.ratio < 0.5 && rel.cEvid.missing.length) faltantes.push('Parte de la evidencia esperada no aparece: ' + rel.cEvid.missing.slice(0, 8).join(', ') + '.');
  if (!corresponde) faltantes.unshift('El contenido no coincide con lo que pide este requisito.');
  if (!rel.fmtById && rel.fmts.length) recomendaciones.push(`Use el formato ${rel.fmts.map((f) => f.id).join(' o ')} de la pestaña Formatos.`);

  // ---------- completitud ----------
  let compPts;
  const own = rel.fmtById || (detected?.how === 'código' ? detected.f : null);
  if (own) {
    const tpl = formatTokenSet(own);
    let extra = 0; for (const w of norm(text).split(/[^a-z0-9ñ]+/)) if (w.length >= 3 && !tpl.has(stem(w))) extra++;
    compPts = Math.round(Math.min(1, extra / 60) * 20);
    if (extra < 12) { faltantes.push('El formato parece estar en blanco o casi sin diligenciar.'); recomendaciones.push('Diligencie los campos del formato antes de subirlo como evidencia.'); }
    else hallazgos.push(`El formato contiene información diligenciada (${extra} palabras propias).`);
  } else {
    compPts = Math.round(Math.min(1, dt.count / 150) * 20);
    if (dt.count < 60) faltantes.push('El documento tiene muy poco contenido.');
  }

  // ---------- fechas y vigencia ----------
  const { t: dtext, list: dates } = findDates(text);
  const todayUTC = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
  let datePts = 0, vigPts = 10, expiry = null;
  if (dates.length) {
    datePts = 10;
    hallazgos.push('Fechas detectadas: ' + [...new Set(dates.map((d) => fmt(d.date)))].slice(0, 5).join(', ') + '.');
  } else faltantes.push('No se detectó ninguna fecha en el documento.');

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
    vigPts = 3; faltantes.push('No se detectó fecha de vencimiento o vigencia.');
  } else if (dates.length && /anual|semestral|trimestral|mensual/i.test(req.periodicity || '')) {
    const newest = dates[dates.length - 1].date; const age = Math.round((todayUTC - newest) / 86400000);
    if (age > 400 && /anual/i.test(req.periodicity)) { vigPts = 4; faltantes.push(`La fecha más reciente (${fmt(newest)}) tiene más de un año; el requisito es anual.`); }
  }

  // ---------- firmas ----------
  let signPts = 10;
  if (SIGN_NEEDED.test(norm(req.title + ' ' + req.evidence))) {
    if (SIGN_FOUND.test(rawNorm)) hallazgos.push('Contiene campos o menciones de firma/responsable (confirme visualmente que estén firmados).');
    else { signPts = 3; faltantes.push('No se detecta firma ni responsable (el requisito pide soporte firmado).'); }
  }
  if (ocrConfidence != null || own) recomendaciones.push('Este auditor no puede verificar firmas manuscritas: confírmelas a simple vista.');

  return finish();

  function finish() {
    const puntaje = Math.max(0, Math.min(100, pertPts + compPts + datePts + signPts + vigPts));
    let veredicto = 'observaciones';
    if (!corresponde || vencido || puntaje < 35) veredicto = 'rechazado';
    else if (puntaje >= 75 && !faltantes.length) veredicto = 'aprobado';
    else if (puntaje >= 85 && faltantes.every((f) => /firma|BAJA|manuscrit/i.test(f))) veredicto = 'aprobado';

    const resumen = veredicto === 'aprobado'
      ? 'El documento corresponde al requisito y cumple las verificaciones objetivas (contenido, fechas, vigencia).'
      : veredicto === 'rechazado'
        ? (!corresponde ? 'El documento no parece corresponder a lo que pide este requisito.' : vencido ? 'El documento corresponde al requisito pero está vencido.' : 'El documento tiene demasiadas fallas para aceptarse como evidencia.')
        : 'El documento parece corresponder al requisito, pero tiene puntos por completar o confirmar.';
    return {
      motor: 'local', veredicto, puntaje, tipo_documento_detectado: detectedName || 'Documento sin clasificar',
      corresponde_al_requisito: corresponde, resumen, hallazgos, faltantes,
      recomendaciones: [...new Set(recomendaciones)], fecha_vigencia_detectada: expiry ? iso(expiry) : null
    };
  }
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
