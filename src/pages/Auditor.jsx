import { useEffect, useRef, useState } from 'react';
import { Send, Paperclip, Camera, Bot, Trash2, X, Sparkles, ClipboardCheck } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { askGemini, SUPPORTED_AI_MIME } from '../lib/gemini';
import { AUDITOR_KNOWLEDGE, buildContextSummary } from '../lib/auditorPrompt';
import { useData } from '../lib/data';
import { useAuth } from '../lib/auth';
import { PageHead } from '../components/Layout';
import { useToast } from '../components/ui';
import { fileToBase64 } from '../lib/utils';

const QUICK = [
  'Inicia una pre-auditoría del PAMEC: pídeme los documentos uno por uno.',
  '¿Qué me falta para la visita de verificación de la Secretaría de Salud de San Andrés?',
  'Explícame cómo diligenciar el archivo ST002 para la Supersalud.',
  'Ayúdame a construir la matriz de priorización (paso 3 de la ruta crítica).',
  'Propón 5 indicadores de calidad para consulta de dermatología con ficha técnica.',
  'Revisa mi plan de capacitaciones y dime qué falta.'
];

// Formato mínimo: **negrita** y listas
const render = (t) => t.split('\n').map((line, i) => {
  const parts = line.split(/(\*\*[^*]+\*\*)/g).map((p, j) => p.startsWith('**') ? <b key={j}>{p.slice(2, -2)}</b> : p);
  return <div key={i} style={{ minHeight: line ? 0 : 8 }}>{parts}</div>;
});

export default function Auditor() {
  const data = useData();
  const { profile } = useAuth();
  const toast = useToast();
  const [msgs, setMsgs] = useState([]);
  const [text, setText] = useState('');
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const logRef = useRef(); const fileRef = useRef(); const camRef = useRef();

  useEffect(() => {
    supabase.from('ai_messages').select('*').eq('user_id', profile.id).order('created_at').limit(200)
      .then(({ data: rows }) => setMsgs(rows || []));
  }, [profile.id]);
  useEffect(() => { logRef.current?.scrollTo({ top: 1e9, behavior: 'smooth' }); }, [msgs, busy]);

  async function send(content = text) {
    if ((!content.trim() && !file) || busy) return;
    if (file && !SUPPORTED_AI_MIME.includes(file.type)) return toast('Adjunta PDF o imagen');
    const userText = content.trim() || 'Revisa este documento.';
    const userMsg = { role: 'user', content: userText, attachment: file?.name || null, created_at: new Date().toISOString() };
    setMsgs((m) => [...m, userMsg]); setText(''); setBusy(true);
    const attached = file; setFile(null);
    try {
      await supabase.from('ai_messages').insert({ role: 'user', content: userText, attachment: userMsg.attachment });
      const history = [...msgs.slice(-20)].map((m) => ({ role: m.role, parts: [{ text: m.content + (m.attachment ? `\n[Adjuntó: ${m.attachment}]` : '') }] }));
      const parts = [{ text: userText }];
      if (attached) parts.push({ inlineData: { mimeType: attached.type, data: await fileToBase64(attached) } });
      const system = AUDITOR_KNOWLEDGE + '\n' + buildContextSummary(data) + `\nUsuario actual: ${profile.full_name} (${profile.role}).`;
      const answer = await askGemini({ system, contents: [...history, { role: 'user', parts }] });
      await supabase.from('ai_messages').insert({ role: 'model', content: answer || '(sin respuesta)' });
      setMsgs((m) => [...m, { role: 'model', content: answer, created_at: new Date().toISOString() }]);
    } catch (e) {
      setMsgs((m) => [...m, { role: 'model', content: '⚠️ ' + e.message, created_at: new Date().toISOString() }]);
    } finally { setBusy(false); }
  }

  async function clear() {
    if (!window.confirm('¿Borrar la conversación?')) return;
    await supabase.from('ai_messages').delete().eq('user_id', profile.id);
    setMsgs([]);
  }

  return (
    <>
      <PageHead title="Auditor IA" sub="Agente Gemini entrenado en PAMEC, SOGCS, habilitación y normativa de San Andrés">
        {msgs.length > 0 && <button className="btn ghost" onClick={clear}><Trash2 size={16} /> Limpiar</button>}
      </PageHead>
      <div className="chat">
        <div className="chat-log" ref={logRef}>
          {!msgs.length && (
            <div className="card hero stack" style={{ maxWidth: 720 }}>
              <div className="row"><Bot size={28} /><h2>Hola, soy tu Auditora PAMEC</h2></div>
              <p className="muted">Te haré preguntas como lo haría la Secretaría de Salud o la Supersalud, te pediré los documentos y verificaré si lo que subes corresponde a lo exigido. Puedes adjuntar PDF o tomar foto con la cámara.</p>
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
          {busy && <div className="msg model row"><span className="spinner" style={{ color: 'var(--primary)' }} /> Auditando…</div>}
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
          <textarea rows={1} value={text} placeholder="Escribe al auditor…" onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }} />
          {msgs.length > 0 && <button className="btn soft icon" title="Continuar pre-auditoría" onClick={() => send('Continúa la pre-auditoría con el siguiente requisito pendiente de mayor riesgo.')}><ClipboardCheck size={17} /></button>}
          <button className="btn icon" onClick={() => send()} disabled={busy || (!text.trim() && !file)} aria-label="Enviar"><Send size={17} /></button>
        </div>
        <input ref={fileRef} hidden type="file" accept="application/pdf,image/*,.txt,.csv" onChange={(e) => { setFile(e.target.files[0] || null); e.target.value = ''; }} />
        <input ref={camRef} hidden type="file" accept="image/*" capture="environment" onChange={(e) => { setFile(e.target.files[0] || null); e.target.value = ''; }} />
      </div>
    </>
  );
}
