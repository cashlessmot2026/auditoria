import { useState } from 'react';
import { ShieldCheck, Mail, Lock, User } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function Login() {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ email: '', password: '', full_name: '' });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault(); setBusy(true); setMsg(null);
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email: form.email.trim(), password: form.password });
        if (error) throw error;
      } else if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email: form.email.trim(), password: form.password,
          options: { data: { full_name: form.full_name }, emailRedirectTo: window.location.origin + window.location.pathname }
        });
        if (error) throw error;
        if (!data.session) setMsg({ ok: true, t: 'Cuenta creada. Revisa tu correo para confirmar y luego inicia sesión.' });
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(form.email.trim(), { redirectTo: window.location.origin + window.location.pathname });
        if (error) throw error;
        setMsg({ ok: true, t: 'Te enviamos un enlace para restablecer la contraseña.' });
      }
    } catch (err) {
      const t = err.message === 'Invalid login credentials' ? 'Correo o contraseña incorrectos' : err.message;
      setMsg({ ok: false, t });
    } finally { setBusy(false); }
  }

  return (
    <div className="center-screen" style={{ background: 'linear-gradient(160deg, #0f766e 0%, #0e7490 45%, var(--bg) 45%)' }}>
      <div style={{ width: 'min(430px, 100%)' }}>
        <div style={{ textAlign: 'center', color: '#fff', marginBottom: 22 }}>
          <img src={`${import.meta.env.BASE_URL}pwa-192x192.png`} alt="" width="76" height="76" style={{ borderRadius: 24, boxShadow: '0 10px 30px rgba(0,0,0,.2)' }} />
          <h1 style={{ marginTop: 14 }}>Urueta Dermatología</h1>
          <p style={{ opacity: .85 }}>Gestión del PAMEC y habilitación · San Andrés Islas</p>
        </div>
        <form className="card stack" onSubmit={submit} style={{ padding: 26 }}>
          <h2>{mode === 'login' ? 'Iniciar sesión' : mode === 'signup' ? 'Crear cuenta' : 'Recuperar contraseña'}</h2>
          {mode === 'signup' && (
            <div className="search"><User size={17} /><input className="input" placeholder="Nombre completo" value={form.full_name} onChange={set('full_name')} required /></div>
          )}
          <div className="search"><Mail size={17} /><input className="input" type="email" placeholder="Correo electrónico" value={form.email} onChange={set('email')} required autoComplete="email" /></div>
          {mode !== 'reset' && (
            <div className="search"><Lock size={17} /><input className="input" type="password" placeholder="Contraseña" minLength={6} value={form.password} onChange={set('password')} required autoComplete={mode === 'login' ? 'current-password' : 'new-password'} /></div>
          )}
          {msg && <div className={'badge tone-' + (msg.ok ? 'green' : 'red')} style={{ whiteSpace: 'normal', padding: '10px 14px', borderRadius: 14 }}>{msg.t}</div>}
          <button className="btn lg block" disabled={busy}>
            {busy ? <span className="spinner" /> : <ShieldCheck size={18} />}
            {mode === 'login' ? 'Entrar' : mode === 'signup' ? 'Registrarme' : 'Enviar enlace'}
          </button>
          <div className="row between small">
            {mode === 'login'
              ? <><a href="#" onClick={(e) => { e.preventDefault(); setMode('signup'); }}>Crear cuenta</a><a href="#" onClick={(e) => { e.preventDefault(); setMode('reset'); }}>¿Olvidaste la contraseña?</a></>
              : <a href="#" onClick={(e) => { e.preventDefault(); setMode('login'); }}>← Volver a iniciar sesión</a>}
          </div>
          <p className="small muted">El primer usuario registrado será el administrador. Los demás deben ser invitados por el administrador.</p>
        </form>
      </div>
    </div>
  );
}
