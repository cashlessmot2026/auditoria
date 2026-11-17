import { useEffect, useRef, useState } from 'react';
import { Send, Paperclip, Camera, Bot, Trash2, X, Sparkles, ClipboardCheck } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { extractText, releaseOcr, canAnalyze, LOCAL_ACCEPT } from '../lib/extractText';
import { analyze, answerQuery, bestRequirements, pendingList, reqDetail } from '../lib/localAuditor';
import { useData } from '../lib/data';
import { useAuth } from '../lib/auth';
import { PageHead } from '../components/Layout';
import { useToast } from '../components/ui';

const QUICK = [
  'Iniciar pre-auditoría: ¿qué me falta?',
  '¿Qué pide el requisito GOB-01?',
  'Formatos de capacitación',
  'Requisitos de residuos hospitalarios',
  'Requisitos de historia clínica',
  'Requisitos de talento humano'
];
const VERD = { aprobado: '✅ CUMPLE', observaciones: '⚠️ CUMPLE PARCIALMENTE', rechazado: '❌ NO CUMPLE' };
const LECTURA = { pdf: 'texto del PDF', ocr: 'OCR de imagen', texto: 'texto', word: 'Word', excel: 'Excel' };

// Formato mínimo: **negrita** y listas
const render = (t) => t.split('\n').map((line, i) => {
  const parts = line.split(/(\*\*[^*]+\*\*)/g).map((p, j) => p.startsWith('**') ? <b key={j}>{p.slice(2, -2)}</b> : p);
  return <div key={i} style={{ minHeight: line ? 0 : 8 }}>{parts}</div>;
});

const list = (t, items) => (items?.length ? `\n**${t}**\n` + items.map((x) => '- ' + x).join('\n') : '');

function reportText(res, req, auto, top) {
  const head = auto
    ? `Tu documento se parece más al requisito **${req.code} · ${req.title}**.` + (top?.length > 1 ? ' Otras opciones: ' + top.slice(1).map((x) => x.req.code).join(', ') + '.' : '') + '\nLo reviso contra ese requisito:'
    : `Revisión contra **${req.code} · ${req.title}**:`;
  return [
    head,
    `\n${VERD[res.veredicto]} · **${res.puntaje}/100**`,
    `Documento detectado: ${res.tipo_documento_detectado}`,
    res.corresponde_al_requisito === false ? '**El documento NO corresponde al requisito.**' : '',
    '\n' + res.resumen,
    list('Hallazgos', res.hallazgos), list('Faltantes', res.faltantes), list('Recomendaciones', res.recomendaciones),
    `\nConcepto automático por reglas (lectura: ${res.lectura}). Confirma con criterio profesional; no verifico firmas manuscritas ni la veracidad del contenido.`
  ].filter((x) => x !== '').join('\n');
}

export default function Auditor() {
  const { requirements } = useData();
  const { profile } = useAuth();
  const toast = useToast();
  const [msgs, setMsgs] = useState([]);
  const [text, setText] = useState('');
  const [file, setFile] = useState(null);
  const [reqId, setReqId] = useState('');
  const [busy, setBusy] = useState(null);
  const logRef = useRef(); const fileRef = useRef(); const camRef = useRef();

  useEffect(() => {
    supabase.from('ai_messages').select('*').eq('user_id', profile.id).order('created_at').limit(200)
      .then(({ data: rows }) => setMsgs(rows || []));
  }, [profile.id]);
  useEffect(() => { logRef.current?.scrollTo({ top: 1e9, behavior: 'smooth' }); }, [msgs, busy]);

  async function answerFile(attached, userText) {
    if (!canAnalyze(attached.name, attached.type)) throw new Error('Adjunta PDF, imagen, Word (.docx), Excel (.xlsx) o texto.');
    const { text: doc, method, confidence } = await extractText(attached, attached.name, attached.type, setBusy);
    setBusy('Comparando con los requisitos…');
    const code = (userText.match(/\b[A-Za-z]{2,4}-\d{2}\b/) || [])[0]?.toUpperCase();
    let req = requirements.find((r) => r.id === reqId) || (code && requirements.find((r) => r.code === code));
    let top = null; const auto = !req;
    if (auto) { top = bestRequirements(doc, requirements, 3); req = top[0]?.req; }
    if (!req) throw new Error('Primero carga la plantilla normativa desde el Dashboard.');
    const res = analyze({ text: doc, req, ocrConfidence: method === 'ocr' ? confidence : null });
    res.lectura = LECTURA[method];
    if (auto && !res.corresponde_al_requisito) {
      return 'No pude relacionar el documento con ningún requisito con suficiente seguridad.\n' + list('Lo más cercano', top.map((x) => `${x.req.code} · ${x.req.title}`)) + '\n\nElige el requisito en la lista de abajo o escribe su código junto con el archivo.';
    }
    return reportText(res, req, auto, top);
  }

  async function send(content = text) {
    if ((!content.trim() && !file) || busy) return;
    const userText = content.trim() || 'Revisa este documento.';
    const userMsg = { role: 'user', content: userText, attachment: file?.name || null, created_at: new Date().toISOString() };
    setMsgs((m) => [...m, userMsg]); setText(''); setBusy('Analizando…');
    const attached = file; setFile(null);
    try {
      await supabase.from('ai_messages').insert({ role: 'user', content: userText, attachment: userMsg.attachment });
      const answer = attached ? await answerFile(attached, userText) : answerQuery(userText, requirements);
      await supabase.from('ai_messages').insert({ role: 'model', content: answer });
      setMsgs((m) => [...m, { role: 'model', content: answer, created_at: new Date().toISOString() }]);
    } catch (e) {
      setMsgs((m) => [...m, { role: 'model', content: '⚠️ ' + e.message, created_at: new Date().toISOString() }]);
    } finally { setBusy(null); releaseOcr(); }
  }

  function nextRequirement() {
    const next = pendingList(requirements, 1)[0];
    if (!next) return toast('No hay requisitos pendientes');
    const q = `Siguiente requisito a auditar:\n\n${reqDetail(next)}\n\nAdjunta el documento (PDF o foto) y lo reviso.`;
    const now = new Date().toISOString();
    setMsgs((m) => [...m, { role: 'user', content: 'Continuar pre-auditoría', created_at: now }, { role: 'model', content: q, created_at: now }]);
    setReqId(next.id);
    supabase.from('ai_messages').insert([{ role: 'user', content: 'Continuar pre-auditoría' }, { role: 'model', content: q }]);
  }

  async function clear() {
    if (!window.confirm('¿Borrar la conversación?')) return;
    await supabase.from('ai_messages').delete().eq('user_id', profile.id);
    setMsgs([]);
  }

  return (
    <>
      <PageHead title="Auditor" sub="Compara tus documentos y fotos con lo que exige cada requisito (motor propio, sin IA externa)">
        {msgs.length > 0 && <button className="btn ghost" onClick={clear}><Trash2 size={16} /> Limpiar</button>}
      </PageHead>
      <div className="chat">
        <div className="chat-log" ref={logRef}>
          {!msgs.length && (
            <div className="card hero stack" style={{ maxWidth: 720 }}>
              <div className="row"><Bot size={28} /><h2>Hola, soy tu Auditor PAMEC</h2></div>
              <p className="muted">Adjunta un PDF, Word, Excel o una foto y comparo su contenido con lo que pide el requisito: formato correcto, términos exigidos, fechas, vigencia y si está diligenciado. También puedo decirte qué te falta, qué evidencia pide un requisito o qué formato usar. Todo se lee en tu equipo; ningún documento se envía a una IA.</p>
            </div>
          )}
          {!msgs.length && (
            <div className="grid g-2" style={{ maxWidth: 720 }}>
              {QUICK.map((q) => <button key={q} className="item" style={{ textAlign: 'left', font: 'inherit', color: 'inherit' }} onClick={() => send(q)}><Sparkles size={16} color="var(--primary)" /><span className="small">{q}</span></button>)}
            </div>
          )}
          {msgs.map((m, i) => (
            <div key={i} className={'msg ' + m.role}>
              {m.attachment && <div className="small" style={{ opacity: .85, marginBottom: 4 }}>📎 {m.attachment}</div>}
              {m.role === 'model' ? render(m.content) : m.content}
            </div>
          ))}
          {busy && <div className="msg model row"><span className="spinner" style={{ color: 'var(--primary)' }} /> {busy}</div>}
        </div>

        <div className="row small" style={{ marginBottom: 8, flexWrap: 'nowrap' }}>
          <span className="muted" style={{ whiteSpace: 'nowrap' }}>Verificar contra:</span>
          <select className="input" style={{ padding: '6px 10px' }} value={reqId} onChange={(e) => setReqId(e.target.value)}>
            <option value="">Detectar el requisito automáticamente</option>
            {requirements.map((r) => <option key={r.id} value={r.id}>{r.code} · {r.title}</option>)}
          </select>
        </div>
        {file && (
          <div className="row small" style={{ marginBottom: 8 }}>
            <span className="badge tone-primary">📎 {file.name}</span>
            <button className="btn ghost icon" style={{ width: 28, height: 28, padding: 4 }} onClick={() => setFile(null)}><X size={14} /></button>
          </div>
        )}
        <div className="chat-input">
          <button className="btn ghost icon" title="Adjuntar documento" onClick={() => fileRef.current.click()}><Paperclip size={17} /></button>
          <button className="btn ghost icon" title="Tomar foto" onClick={() => camRef.current.click()}><Camera size={17} /></button>
          <textarea rows={1} value={text} placeholder="Escribe un código (GOB-01), un tema o «qué me falta»…" onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }} />
          <button className="btn soft icon" title="Siguiente requisito pendiente" onClick={nextRequirement}><ClipboardCheck size={17} /></button>
          <button className="btn icon" onClick={() => send()} disabled={!!busy || (!text.trim() && !file)} aria-label="Enviar"><Send size={17} /></button>
        </div>
        <input ref={fileRef} hidden type="file" accept={LOCAL_ACCEPT} onChange={(e) => { setFile(e.target.files[0] || null); e.target.value = ''; }} />
        <input ref={camRef} hidden type="file" accept="image/*" capture="environment" onChange={(e) => { setFile(e.target.files[0] || null); e.target.value = ''; }} />
      </div>
    </>
  );
}
