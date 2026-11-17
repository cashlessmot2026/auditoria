import { useRef, useState } from 'react';
import { Upload, Camera, FileText, Trash2, Eye, Sparkles, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { supabase, BUCKET, logAction, signedUrl } from '../lib/supabase';
import { extractText, releaseOcr, canAnalyze, LOCAL_ACCEPT } from '../lib/extractText';
import { analyze, bestRequirements } from '../lib/localAuditor';
import { fmtDate, prettySize, safeName, AI_STATUS } from '../lib/utils';
import { useAuth } from '../lib/auth';
import { useData, useProfileName } from '../lib/data';
import { StatusBadge, useToast } from './ui';

// Reduce fotos de cámara para subir rápido
async function compressImage(file, maxSide = 2000, quality = 0.85) {
  if (!file.type.startsWith('image/') || file.type === 'image/heic' || file.size < 900_000) return file;
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bmp.width * scale); canvas.height = Math.round(bmp.height * scale);
    canvas.getContext('2d').drawImage(bmp, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise((r) => canvas.toBlob(r, 'image/jpeg', quality));
    return new File([blob], file.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' });
  } catch { return file; }
}

/**
 * target: { code, title, category, description, norma, evidence } -> lo que el auditor debe verificar
 * link:   { requirement_id } | { activity_id } | { training_id }
 * onReviewed(result, doc) opcional
 */
export default function Evidence({ target, link, onReviewed }) {
  const { profile, isAdmin } = useAuth();
  const { documents, requirements, reload } = useData();
  const name = useProfileName();
  const toast = useToast();
  const fileRef = useRef(); const camRef = useRef();
  const [busy, setBusy] = useState(null);
  const [result, setResult] = useState(null);

  const [key, id] = Object.entries(link)[0];
  const docs = documents.filter((d) => d[key] === id);

  async function handleFiles(fileList) {
    const files = [...(fileList || [])];
    if (!files.length) return;
    for (const raw of files) {
      const file = await compressImage(raw);
      if (file.size > 20 * 1024 * 1024) { toast('El archivo supera 20 MB'); continue; }
      setBusy('Subiendo ' + file.name + '…');
      const path = `${key.replace('_id', '')}/${id}/${Date.now()}_${safeName(file.name)}`;
      const up = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type || 'application/octet-stream' });
      if (up.error) { toast('Error al subir: ' + up.error.message); setBusy(null); continue; }
      const { data: doc, error } = await supabase.from('documents').insert({
        [key]: id, file_path: path, file_name: file.name, mime_type: file.type, size_bytes: file.size,
        uploaded_by: profile.id, version: docs.length + 1
      }).select().single();
      if (error) { toast('Error: ' + error.message); setBusy(null); continue; }
      await logAction('Subió evidencia', key.replace('_id', ''), id, file.name);
      if (key === 'requirement_id') await supabase.from('requirements').update({ status: 'en_proceso' }).eq('id', id).eq('status', 'pendiente');
      await reload();
      if (canAnalyze(file.name, file.type)) await review(doc, file);
    }
    setBusy(null);
  }

  async function review(doc, file) {
    try {
      setBusy('El auditor está revisando el documento…'); setResult(null);
      let blob = file;
      if (!blob) {
        const { data, error } = await supabase.storage.from(BUCKET).download(doc.file_path);
        if (error) throw error; blob = data;
      }
      const mime = doc.mime_type || blob.type;
      if (!canAnalyze(doc.file_name, mime)) throw new Error('Se revisan PDF, imágenes, Word (.docx), Excel (.xlsx) y texto. Convierta el documento a PDF.');
      const { text, method, confidence } = await extractText(blob, doc.file_name, mime, setBusy);
      const res = analyze({ text, req: target, ocrConfidence: method === 'ocr' ? confidence : null });
      res.lectura = { pdf: 'texto del PDF', ocr: 'reconocimiento de imagen (OCR)', texto: 'texto', word: 'Word', excel: 'Excel' }[method];
      if (!res.corresponde_al_requisito && key === 'requirement_id') {
        const alt = bestRequirements(text, requirements.filter((r) => r.id !== id), 2).filter((x) => x.score >= 0.5);
        if (alt.length) res.recomendaciones = [...res.recomendaciones, 'Este documento se parece más a: ' + alt.map((x) => `${x.req.code} ${x.req.title}`).join('; ') + '.'];
      }
      const verdict = res.veredicto;
      await supabase.from('documents').update({
        ai_verdict: verdict, ai_score: res.puntaje, ai_feedback: res, reviewed_at: new Date().toISOString(),
        ...(res.fecha_vigencia_detectada ? { expires_on: res.fecha_vigencia_detectada } : {})
      }).eq('id', doc.id);
      if (key === 'requirement_id') {
        await supabase.from('requirements').update({ ai_status: verdict, ai_feedback: res.resumen }).eq('id', id);
      }
      await logAction('Revisión del auditor: ' + verdict, 'document', doc.id, doc.file_name);
      setResult(res);
      onReviewed?.(res, doc);
      await reload();
    } catch (e) { toast(e.message); } finally { setBusy(null); releaseOcr(); }
  }

  async function open(doc) {
    try { window.open(await signedUrl(doc.file_path), '_blank', 'noopener'); } catch (e) { toast(e.message); }
  }

  async function remove(doc) {
    if (!window.confirm('¿Eliminar "' + doc.file_name + '"?')) return;
    const full = await supabase.from('documents').select('file_path').eq('id', doc.id).single();
    await supabase.storage.from(BUCKET).remove([full.data?.file_path].filter(Boolean));
    await supabase.from('documents').delete().eq('id', doc.id);
    await logAction('Eliminó evidencia', 'document', doc.id, doc.file_name);
    reload();
  }

  async function openFeedback(doc) {
    const { data } = await supabase.from('documents').select('ai_feedback,ai_verdict').eq('id', doc.id).single();
    if (data?.ai_feedback) setResult({ ...data.ai_feedback, veredicto: data.ai_verdict });
  }

  return (
    <div className="stack">
      <div className="drop">
        <p className="small muted" style={{ marginBottom: 10 }}>Suba PDF, imágenes, Word o Excel. El auditor verificará si corresponde a lo solicitado (se lee en su equipo; el documento no se envía a ninguna IA).</p>
        <div className="row" style={{ justifyContent: 'center' }}>
          <button type="button" className="btn" onClick={() => fileRef.current.click()} disabled={!!busy}><Upload size={16} /> Subir archivo</button>
          <button type="button" className="btn soft" onClick={() => camRef.current.click()} disabled={!!busy}><Camera size={16} /> Tomar foto</button>
        </div>
        <input ref={fileRef} type="file" hidden multiple accept={LOCAL_ACCEPT + ',.doc,.xls'}
          onChange={(e) => { handleFiles(e.target.files); e.target.value = ''; }} />
        <input ref={camRef} type="file" hidden accept="image/*" capture="environment"
          onChange={(e) => { handleFiles(e.target.files); e.target.value = ''; }} />
        {busy && <div className="row small" style={{ justifyContent: 'center', marginTop: 12, color: 'var(--primary)' }}><span className="spinner" /> {busy}</div>}
      </div>

      {result && <AiResult res={result} />}

      {docs.length > 0 && (
        <div className="stack" style={{ gap: 8 }}>
          {docs.map((d) => (
            <div key={d.id} className="row" style={{ padding: 10, border: '1px solid var(--border)', borderRadius: 16, flexWrap: 'nowrap' }}>
              <div className="ico tone-primary" style={{ width: 38, height: 38, borderRadius: 12, display: 'grid', placeItems: 'center', flexShrink: 0 }}><FileText size={18} /></div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: '.86rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.file_name}</div>
                <div className="small muted">{fmtDate(d.created_at)} · {name(d.uploaded_by)}{d.expires_on ? ' · vence ' + fmtDate(d.expires_on) : ''}</div>
                <div className="row" style={{ gap: 6, marginTop: 4 }}>
                  <StatusBadge map={AI_STATUS} value={d.ai_verdict} />
                  {d.ai_score != null && <span className="small muted">{d.ai_score}/100</span>}
                </div>
              </div>
              <div className="row" style={{ gap: 4, flexWrap: 'nowrap' }}>
                {d.ai_verdict !== 'sin_revisar' && <button className="btn ghost icon" title="Ver concepto del auditor" onClick={() => openFeedback(d)}><Sparkles size={15} /></button>}
                <button className="btn soft sm" title="Revisar documento" onClick={() => review(d)} disabled={!!busy}><Sparkles size={14} /> Revisar</button>
                <button className="btn ghost icon" title="Ver" onClick={() => open(d)}><Eye size={15} /></button>
                {(isAdmin || d.uploaded_by === profile.id) && <button className="btn danger icon" title="Eliminar" onClick={() => remove(d)}><Trash2 size={15} /></button>}
              </div>
            </div>
          ))}
        </div>
      )}
      <p className="small muted">Tamaño máximo 20 MB por archivo. El concepto es automático (reglas): una persona debe confirmarlo.</p>
    </div>
  );
}

export function AiResult({ res }) {
  const v = res.veredicto;
  const Icon = v === 'aprobado' ? CheckCircle2 : v === 'rechazado' ? XCircle : AlertTriangle;
  const tone = v === 'aprobado' ? 'green' : v === 'rechazado' ? 'red' : 'amber';
  const List = ({ t, items }) => items?.length ? <div style={{ marginTop: 8 }}><b className="small">{t}</b><ul className="small">{items.map((x, i) => <li key={i}>{x}</li>)}</ul></div> : null;
  return (
    <div className="ai-box">
      <div className="row between">
        <div className="row"><span className={'badge tone-' + tone} style={{ fontSize: '.8rem' }}><Icon size={14} /> {AI_STATUS[v]?.label}</span>
          {res.puntaje != null && <b>{res.puntaje}/100</b>}</div>
        {res.tipo_documento_detectado && <span className="small muted">Detectado: {res.tipo_documento_detectado}</span>}
      </div>
      {res.corresponde_al_requisito === false && <p className="small" style={{ color: 'var(--red)', marginTop: 8, fontWeight: 600 }}>El documento NO corresponde al requisito solicitado.</p>}
      {res.resumen && <p className="small" style={{ marginTop: 8 }}>{res.resumen}</p>}
      <List t="Hallazgos" items={res.hallazgos} />
      <List t="Faltantes" items={res.faltantes} />
      <List t="Recomendaciones" items={res.recomendaciones} />
      <p className="small muted" style={{ marginTop: 10 }}>Concepto automático por reglas{res.lectura ? ' (lectura: ' + res.lectura + ')' : ''}. Confirme con criterio profesional; no verifica firmas manuscritas ni la veracidad del contenido.</p>
    </div>
  );
}
