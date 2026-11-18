import { useEffect, useState } from 'react';
import { Save, Download, LogOut, History, Building2, UserCircle, Smartphone, KeyRound, Bot, Eye, EyeOff } from 'lucide-react';
import { useData } from '../lib/data';
import { useAuth } from '../lib/auth';
import { supabase, logAction } from '../lib/supabase';
import { PageHead } from '../components/Layout';
import { Field, useToast } from '../components/ui';
import { askGemini } from '../lib/gemini';
import { fmtDate, todayISO, displayUser } from '../lib/utils';

export default function Settings() {
  const { settings, requirements, activities, trainings, documents, profiles, reload } = useData();
  const { isAdmin, profile, signOut, refreshProfile } = useAuth();
  const toast = useToast();
  const [f, setF] = useState(settings || {});
  const [me, setMe] = useState({ full_name: profile.full_name, phone: profile.phone || '', cargo: profile.cargo || '' });
  const [log, setLog] = useState([]);
  const [installEvt, setInstallEvt] = useState(null);
  const [aiCfg, setAiCfg] = useState({ gemini_enabled: false, gemini_api_key: '' });
  const [aiLoaded, setAiLoaded] = useState(false);
  const [aiMsg, setAiMsg] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => { setF(settings || {}); }, [settings]);
  useEffect(() => {
    if (!isAdmin) return;
    supabase.from('ai_config').select('gemini_enabled,gemini_api_key').eq('id', 1).maybeSingle().then(({ data, error }) => {
      if (error) setAiMsg('Falta ejecutar el SQL «ai_config.sql» en Supabase (ver README). ' + error.message);
      else if (data) setAiCfg({ gemini_enabled: !!data.gemini_enabled, gemini_api_key: data.gemini_api_key || '' });
      setAiLoaded(true);
    });
  }, [isAdmin]);
  useEffect(() => {
    supabase.from('audit_log').select('*').order('created_at', { ascending: false }).limit(40).then(({ data }) => setLog(data || []));
    const h = (e) => { e.preventDefault(); setInstallEvt(e); };
    window.addEventListener('beforeinstallprompt', h);
    return () => window.removeEventListener('beforeinstallprompt', h);
  }, []);

  const set = (k) => (e) => setF({ ...f, [k]: e.target.value === '' ? null : e.target.value });
  const [pw, setPw] = useState({ cur: '', a: '', b: '' });
  async function changePw() {
    const { error } = await supabase.rpc('change_my_password', { p_current: pw.cur, p_new: pw.a });
    if (error) return toast(error.message);
    setPw({ cur: '', a: '', b: '' }); logAction('Cambió su contraseña', 'profile', profile.id); toast('Contraseña actualizada ✔');
  }

  async function saveIPS() {
    const { id, updated_at, ...rest } = f;
    const { error } = await supabase.from('ips_settings').upsert({ id: 1, ...rest });
    if (error) return toast(error.message);
    logAction('Actualizó datos de la IPS', 'settings'); toast('Datos de la IPS guardados ✔'); reload();
  }
  async function saveAi(next = aiCfg) {
    const key = (next.gemini_api_key || '').trim();
    if (next.gemini_enabled && !key) return toast('Pegue primero la llave API de Gemini');
    const { error } = await supabase.from('ai_config').upsert({ id: 1, gemini_enabled: next.gemini_enabled, gemini_api_key: key || null });
    if (error) { toast(error.message); return false; }
    setAiCfg({ ...next, gemini_api_key: key });
    logAction(next.gemini_enabled ? 'Activó el agente IA (Gemini)' : 'Desactivó el agente IA (Gemini)', 'settings');
    toast(next.gemini_enabled ? 'Agente IA activado ✔' : 'Agente IA desactivado: se usa el auditor por reglas ✔');
    reload(); return true;
  }
  async function testAi() {
    setTesting(true);
    try {
      const out = await askGemini({ apiKey: aiCfg.gemini_api_key.trim(), contents: [{ role: 'user', parts: [{ text: 'Responde solo con la palabra: listo' }] }] });
      toast('Gemini respondió: ' + out.slice(0, 40) + ' ✔');
    } catch (e) { toast(e.message); } finally { setTesting(false); }
  }
  async function saveMe() {
    const { error } = await supabase.from('profiles').update(me).eq('id', profile.id);
    if (error) return toast(error.message);
    toast('Perfil actualizado ✔'); refreshProfile(); reload();
  }

  // Datos para el archivo ST002 (CE 012/2016 Supersalud)
  function st002() {
    const year = Number(f.vigencia) || new Date().getFullYear();
    const ruta = activities.filter((a) => a.phase);
    const starts = ruta.map((a) => a.start_date).filter(Boolean).sort();
    const ends = ruta.map((a) => a.end_date).filter(Boolean).sort();
    const accProg = activities.filter((a) => a.phase === 6 || a.phase === 7).length;
    const accEjec = activities.filter((a) => (a.phase === 6 || a.phase === 7) && a.status === 'completada').length;
    const audProg = activities.filter((a) => /auditor/i.test(a.title)).length;
    const audEjec = activities.filter((a) => /auditor/i.test(a.title) && a.status === 'completada').length;
    const aprendizaje = documents.filter((d) => requirements.find((r) => r.id === d.requirement_id)?.phase === 9).length;
    const estandar = requirements.filter((r) => r.status === 'cumplido' && ['Procesos prioritarios', 'Seguridad del paciente'].includes(r.category)).map((r) => r.title).join(';').slice(0, 4000);
    const fields = [f.codigo_dane || '88001', starts[0] || `${year}-01-01`, ends[ends.length - 1] || `${year}-12-31`, accProg, accEjec, audProg, audEjec, aprendizaje, estandar, f.lider_calidad || '', f.email_calidad || '', f.telefono || '', f.responsable_plan || '', '', '', ''];
    const blob = new Blob([fields.join('|')], { type: 'text/plain' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `BORRADOR_ST002_${(f.nit || 'NIT').replace(/\D/g, '')}_${year}.txt`; a.click();
    toast('Borrador generado: valide los campos con la estructura vigente de Supersalud antes de cargar.');
  }

  function backup() {
    const blob = new Blob([JSON.stringify({ exportado: new Date().toISOString(), settings, requirements, activities, trainings, documents, profiles }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `respaldo_pamec_${todayISO()}.json`; a.click();
  }

  const name = (id) => profiles.find((p) => p.id === id)?.full_name || '—';

  return (
    <>
      <PageHead title="Ajustes" sub="Datos de la IPS, perfil, reportes y bitácora">
        <button className="btn ghost" onClick={signOut}><LogOut size={16} /> Cerrar sesión</button>
      </PageHead>

      <div className="grid g-2">
        <div className="card stack">
          <h2 className="row"><Building2 size={20} /> Datos de la IPS</h2>
          <div className="grid g-2">
            <Field label="Nombre"><input className="input" value={f.nombre || ''} onChange={set('nombre')} disabled={!isAdmin} /></Field>
            <Field label="NIT"><input className="input" value={f.nit || ''} onChange={set('nit')} disabled={!isAdmin} /></Field>
            <Field label="Código de habilitación (REPS)"><input className="input" value={f.codigo_habilitacion || ''} onChange={set('codigo_habilitacion')} disabled={!isAdmin} /></Field>
            <Field label="Código DANE"><input className="input" value={f.codigo_dane || ''} onChange={set('codigo_dane')} disabled={!isAdmin} /></Field>
            <Field label="Dirección"><input className="input" value={f.direccion || ''} onChange={set('direccion')} disabled={!isAdmin} /></Field>
            <Field label="Representante legal"><input className="input" value={f.representante_legal || ''} onChange={set('representante_legal')} disabled={!isAdmin} /></Field>
            <Field label="Líder de calidad"><input className="input" value={f.lider_calidad || ''} onChange={set('lider_calidad')} disabled={!isAdmin} /></Field>
            <Field label="Correo líder de calidad"><input className="input" value={f.email_calidad || ''} onChange={set('email_calidad')} disabled={!isAdmin} /></Field>
            <Field label="Teléfono"><input className="input" value={f.telefono || ''} onChange={set('telefono')} disabled={!isAdmin} /></Field>
            <Field label="Responsable plan de mejoramiento"><input className="input" value={f.responsable_plan || ''} onChange={set('responsable_plan')} disabled={!isAdmin} /></Field>
            <Field label="Fecha meta auditoría Secretaría"><input type="date" className="input" value={f.fecha_meta_auditoria || ''} onChange={set('fecha_meta_auditoria')} disabled={!isAdmin} /></Field>
            <Field label="Vigencia PAMEC (año)"><input type="number" className="input" value={f.vigencia || ''} onChange={set('vigencia')} disabled={!isAdmin} /></Field>
          </div>
          <Field label="Servicios habilitados"><textarea className="input" value={f.servicios || ''} onChange={set('servicios')} disabled={!isAdmin} /></Field>
          {isAdmin && <div className="row" style={{ justifyContent: 'flex-end' }}><button className="btn" onClick={saveIPS}><Save size={16} /> Guardar</button></div>}
        </div>

        <div className="stack">
          <div className="card stack">
            <h2 className="row"><UserCircle size={20} /> Mi perfil</h2>
            <div className="grid g-2">
              <Field label="Nombre"><input className="input" value={me.full_name || ''} onChange={(e) => setMe({ ...me, full_name: e.target.value })} /></Field>
              <Field label="Cargo"><input className="input" value={me.cargo} onChange={(e) => setMe({ ...me, cargo: e.target.value })} /></Field>
              <Field label="Teléfono"><input className="input" value={me.phone} onChange={(e) => setMe({ ...me, phone: e.target.value })} /></Field>
              <Field label="Usuario / correo"><input className="input" value={displayUser(profile.email) || ''} disabled /></Field>
            </div>
            {profile.funciones && <div className="ai-box small"><b>Mis funciones:</b> {profile.funciones}</div>}
            <div className="row" style={{ justifyContent: 'flex-end' }}><button className="btn soft" onClick={saveMe}><Save size={16} /> Actualizar</button></div>
            <div className="divider" />
            <h3 className="row"><KeyRound size={18} /> Cambiar contraseña</h3>
            <Field label="Contraseña actual"><input type="password" className="input" value={pw.cur} onChange={(e) => setPw({ ...pw, cur: e.target.value })} autoComplete="current-password" /></Field>
            <div className="grid g-2">
              <Field label="Nueva contraseña"><input type="password" className="input" value={pw.a} onChange={(e) => setPw({ ...pw, a: e.target.value })} autoComplete="new-password" /></Field>
              <Field label="Repetir contraseña"><input type="password" className="input" value={pw.b} onChange={(e) => setPw({ ...pw, b: e.target.value })} autoComplete="new-password" /></Field>
            </div>
            <div className="row" style={{ justifyContent: 'flex-end' }}>
              <button className="btn" disabled={!pw.cur || pw.a.length < 6 || pw.a !== pw.b} onClick={changePw}><KeyRound size={16} /> Guardar contraseña</button>
            </div>
            {pw.a && (pw.a.length < 6 ? <p className="small" style={{ color: 'var(--red)' }}>Mínimo 6 caracteres.</p> : pw.a !== pw.b ? <p className="small" style={{ color: 'var(--red)' }}>No coinciden.</p> : null)}
          </div>

          {isAdmin && (
            <div className="card stack">
              <h2 className="row"><Bot size={20} /> Agente IA (Gemini)</h2>
              <label className="row" style={{ gap: 10, cursor: 'pointer', flexWrap: 'nowrap' }}>
                <input type="checkbox" style={{ width: 22, height: 22 }} checked={aiCfg.gemini_enabled} disabled={!aiLoaded || !!aiMsg}
                  onChange={(e) => saveAi({ ...aiCfg, gemini_enabled: e.target.checked })} />
                <span><b>{aiCfg.gemini_enabled ? 'Activado' : 'Desactivado'}</b> · {aiCfg.gemini_enabled ? 'Gemini audita y revisa los documentos y responde en la página Auditor.' : 'Se usa el auditor propio por reglas y OCR (sin enviar nada a una IA).'}</span>
              </label>
              <Field label="Llave API de Gemini">
                <div className="row" style={{ flexWrap: 'nowrap' }}>
                  <input className="input" type={showKey ? 'text' : 'password'} value={aiCfg.gemini_api_key} placeholder="AIza…" autoComplete="off"
                    onChange={(e) => setAiCfg({ ...aiCfg, gemini_api_key: e.target.value })} />
                  <button type="button" className="btn ghost icon" title={showKey ? 'Ocultar' : 'Mostrar'} onClick={() => setShowKey(!showKey)}>{showKey ? <EyeOff size={16} /> : <Eye size={16} />}</button>
                </div>
              </Field>
              <div className="row" style={{ justifyContent: 'flex-end' }}>
                <button className="btn ghost" disabled={!aiCfg.gemini_api_key.trim() || testing} onClick={testAi}>{testing ? 'Probando…' : 'Probar llave'}</button>
                <button className="btn" disabled={!aiLoaded || !!aiMsg} onClick={() => saveAi()}><Save size={16} /> Guardar llave</button>
              </div>
              {aiMsg && <p className="small" style={{ color: 'var(--red)' }}>{aiMsg}</p>}
              <p className="small muted">Si Gemini falla (sin internet, llave inválida o cuota agotada), la app usa automáticamente el auditor por reglas. Con la IA activada, los documentos se envían a Google para su análisis. La llave la pueden leer los usuarios activos de la app mientras esté activada.</p>
            </div>
          )}

          <div className="card stack">
            <h2 className="row"><Download size={20} /> Reportes y app</h2>
            <button className="btn ghost block" onClick={st002}><Download size={16} /> Borrador archivo ST002 (Supersalud)</button>
            {isAdmin && <button className="btn ghost block" onClick={backup}><Download size={16} /> Respaldo completo (JSON)</button>}
            {installEvt
              ? <button className="btn block" onClick={() => { installEvt.prompt(); setInstallEvt(null); }}><Smartphone size={16} /> Instalar app en este dispositivo</button>
              : <p className="small muted"><Smartphone size={14} /> Para instalar: en Android/Chrome usa «Instalar app»; en iPhone/Safari usa Compartir → «Agregar a pantalla de inicio».</p>}
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h2 className="row" style={{ marginBottom: 10 }}><History size={20} /> Bitácora reciente (trazabilidad)</h2>
        <div className="scroll-x">
          <table className="table">
            <thead><tr><th>Fecha</th><th>Usuario</th><th>Acción</th><th>Detalle</th></tr></thead>
            <tbody>
              {log.map((l) => <tr key={l.id}><td className="small">{fmtDate(l.created_at)} {new Date(l.created_at).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}</td><td>{name(l.user_id)}</td><td>{l.action}</td><td className="small muted">{l.detail}</td></tr>)}
              {!log.length && <tr><td colSpan={4} className="muted small">Sin registros.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
