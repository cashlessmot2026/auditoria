import { useState } from 'react';
import { ShieldCheck, Mail, Lock } from 'lucide-react';
import { useAuth } from '../lib/auth';

export default function Login() {
  const { signIn } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const [forgot, setForgot] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault(); setBusy(true); setMsg(null);
    try { await signIn(form.email, form.password); }
    catch (err) { setMsg({ ok: false, t: err.message }); }
    finally { setBusy(false); }
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
          <h2>Iniciar sesión</h2>
          <div className="search"><Mail size={17} /><input className="input" type="text" placeholder="Usuario o correo electrónico" value={form.email} onChange={set('email')} required autoComplete="username" autoCapitalize="none" /></div>
          <div className="search"><Lock size={17} /><input className="input" type="password" placeholder="Contraseña" value={form.password} onChange={set('password')} required autoComplete="current-password" /></div>
          {msg && <div className={'badge tone-' + (msg.ok ? 'green' : 'red')} style={{ whiteSpace: 'normal', padding: '10px 14px', borderRadius: 14 }}>{msg.t}</div>}
          <button className="btn lg block" disabled={busy}>
            {busy ? <span className="spinner" /> : <ShieldCheck size={18} />}
            Entrar
          </button>
          <div className="row small" style={{ justifyContent: 'flex-end' }}>
            <a href="#" onClick={(e) => { e.preventDefault(); setForgot(!forgot); }}>¿Olvidaste la contraseña?</a>
          </div>
          {forgot && <p className="small muted">Pide al administrador que te asigne una contraseña nueva desde el módulo <b>Equipo</b>. Luego podrás cambiarla en <b>Ajustes</b>.</p>}
          <p className="small muted">Las cuentas las crea el administrador. Si aún no tienes una, solicítala.</p>
        </form>
      </div>
    </div>
  );
}
