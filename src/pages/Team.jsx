import { useEffect, useState } from 'react';
import { UserPlus, Save, Trash2, Mail, ShieldCheck, Layers } from 'lucide-react';
import { useData } from '../lib/data';
import { useAuth } from '../lib/auth';
import { supabase, signupClient, logAction } from '../lib/supabase';
import { PageHead } from '../components/Layout';
import { Modal, Field, Badge, Avatar, Progress, useToast } from '../components/ui';
import { CATEGORIES } from '../data/pamecCatalog';
import { pct, fmtDate } from '../lib/utils';

export default function Team() {
  const { profiles, requirements, reload } = useData();
  const { profile: me } = useAuth();
  const toast = useToast();
  const [invites, setInvites] = useState([]);
  const [creating, setCreating] = useState(false);
  const [edit, setEdit] = useState(null);
  const [bulk, setBulk] = useState(false);

  const loadInv = async () => { const { data } = await supabase.from('invitations').select('*').order('created_at'); setInvites(data || []); };
  useEffect(() => { loadInv(); }, []);

  return (
    <>
      <PageHead title="Equipo PAMEC" sub="Crea perfiles, asigna funciones y responsables">
        <button className="btn ghost" onClick={() => setBulk(true)}><Layers size={16} /> Asignar por categoría</button>
        <button className="btn" onClick={() => setCreating(true)}><UserPlus size={16} /> Nuevo perfil</button>
      </PageHead>

      <div className="grid g-auto">
        {profiles.map((p) => {
          const reqs = requirements.filter((r) => r.assigned_to === p.id && r.status !== 'no_aplica');
          return (
            <div key={p.id} className="item" style={{ flexDirection: 'column', gap: 10 }} onClick={() => setEdit(p)}>
              <div className="row" style={{ flexWrap: 'nowrap', width: '100%' }}>
                <Avatar name={p.full_name} size={46} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <b>{p.full_name}</b>
                  <div className="small muted" style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.email}</div>
                </div>
              </div>
              <div className="row" style={{ gap: 6 }}>
                <Badge tone={p.role === 'admin' ? 'primary' : 'blue'} icon={p.role === 'admin' ? ShieldCheck : undefined}>{p.role === 'admin' ? 'Administrador' : 'Ejecutor'}</Badge>
                <Badge tone={p.active ? 'green' : 'red'}>{p.active ? 'Activo' : 'Inactivo'}</Badge>
                {p.cargo && <Badge>{p.cargo}</Badge>}
              </div>
              <div style={{ width: '100%' }}>
                <div className="row between small"><span className="muted">{reqs.length} requisitos asignados</span><b>{pct(reqs.filter((r) => r.status === 'cumplido').length, reqs.length)}%</b></div>
                <Progress value={pct(reqs.filter((r) => r.status === 'cumplido').length, reqs.length)} sm />
              </div>
            </div>
          );
        })}
      </div>

      {invites.length > 0 && (
        <div className="card" style={{ marginTop: 18 }}>
          <h3 style={{ marginBottom: 10 }}>Invitaciones pendientes</h3>
          <p className="small muted" style={{ marginBottom: 10 }}>Estas personas quedarán activas automáticamente al crear su cuenta con el mismo correo (botón «Crear cuenta» en el inicio de sesión).</p>
          {invites.map((i) => (
            <div key={i.email} className="row between" style={{ padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
              <span className="row small"><Mail size={15} /> <b>{i.full_name}</b> {i.email} · {i.role} · {fmtDate(i.created_at)}</span>
              <button className="btn danger sm" onClick={async () => { await supabase.from('invitations').delete().eq('email', i.email); loadInv(); }}><Trash2 size={14} /></button>
            </div>
          ))}
        </div>
      )}

      {creating && <CreateModal onClose={() => setCreating(false)} onDone={() => { loadInv(); reload(); }} toast={toast} />}
      {edit && <EditModal p={edit} me={me} onClose={() => setEdit(null)} reload={reload} toast={toast} />}
      {bulk && <BulkModal onClose={() => setBulk(false)} profiles={profiles} reload={reload} toast={toast} />}
    </>
  );
}

function CreateModal({ onClose, onDone, toast }) {
  const [f, setF] = useState({ email: '', full_name: '', cargo: '', phone: '', role: 'ejecutor', funciones: '', password: '' });
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  async function submit() {
    setBusy(true);
    const email = f.email.trim().toLowerCase();
    const { error } = await supabase.from('invitations').upsert({ email, full_name: f.full_name, cargo: f.cargo, phone: f.phone, role: f.role, funciones: f.funciones });
    if (error) { setBusy(false); return toast(error.message); }
    let msg = 'Invitación creada. La persona debe registrarse con ' + email;
    if (f.password) {
      const { data, error: e2 } = await signupClient.auth.signUp({ email, password: f.password, options: { data: { full_name: f.full_name } } });
      if (e2) msg = 'Invitación creada, pero no se pudo crear la cuenta: ' + e2.message;
      else msg = data.session ? 'Perfil creado y activo ✔. Comparte la contraseña temporal.' : 'Perfil creado. Debe confirmar su correo antes de entrar.';
      await signupClient.auth.signOut();
    }
    logAction('Creó perfil', 'profile', null, email);
    setBusy(false); toast(msg); onDone(); onClose();
  }

  return (
    <Modal open onClose={onClose} title="Nuevo perfil de ejecutor">
      <div className="stack">
        <div className="grid g-2">
          <Field label="Nombre completo"><input className="input" value={f.full_name} onChange={set('full_name')} /></Field>
          <Field label="Correo"><input type="email" className="input" value={f.email} onChange={set('email')} /></Field>
          <Field label="Cargo"><input className="input" value={f.cargo} onChange={set('cargo')} placeholder="Auxiliar de enfermería, Líder de calidad…" /></Field>
          <Field label="Teléfono"><input className="input" value={f.phone} onChange={set('phone')} /></Field>
          <Field label="Rol"><select className="input" value={f.role} onChange={set('role')}><option value="ejecutor">Ejecutor PAMEC</option><option value="admin">Administrador</option></select></Field>
          <Field label="Contraseña temporal (opcional)"><input type="text" className="input" value={f.password} onChange={set('password')} placeholder="Mín. 6 caracteres" /></Field>
        </div>
        <Field label="Funciones individuales asignadas"><textarea className="input" value={f.funciones} onChange={set('funciones')} placeholder="Ej.: Responsable de PGIRASA y de la ruta de residuos; tecnovigilancia; capacitaciones de bioseguridad…" /></Field>
        <p className="small muted">Si defines una contraseña temporal, la cuenta se crea de inmediato (si en Supabase está desactivada la confirmación de correo). Si no, la persona se registra sola con este correo y queda activa automáticamente.</p>
        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <button className="btn" onClick={submit} disabled={busy || !f.email || !f.full_name || (f.password && f.password.length < 6)}>{busy ? <span className="spinner" /> : <UserPlus size={16} />} Crear perfil</button>
        </div>
      </div>
    </Modal>
  );
}

function EditModal({ p, me, onClose, reload, toast }) {
  const [f, setF] = useState(p);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });
  const self = p.id === me.id;

  async function save() {
    const { error } = await supabase.from('profiles').update({ full_name: f.full_name, cargo: f.cargo, phone: f.phone, funciones: f.funciones, role: self ? p.role : f.role, active: self ? true : f.active }).eq('id', p.id);
    if (error) return toast(error.message);
    logAction('Editó perfil', 'profile', p.id, f.full_name); toast('Guardado ✔'); reload(); onClose();
  }
  async function remove() {
    if (!window.confirm('¿Eliminar el perfil de ' + p.full_name + '? (La cuenta de acceso permanece en Supabase Auth pero quedará sin permisos.)')) return;
    const { error } = await supabase.from('profiles').update({ active: false, role: 'ejecutor' }).eq('id', p.id);
    if (error) return toast(error.message);
    reload(); onClose();
  }

  return (
    <Modal open onClose={onClose} title={p.full_name}>
      <div className="stack">
        <div className="grid g-2">
          <Field label="Nombre"><input className="input" value={f.full_name || ''} onChange={set('full_name')} /></Field>
          <Field label="Cargo"><input className="input" value={f.cargo || ''} onChange={set('cargo')} /></Field>
          <Field label="Teléfono"><input className="input" value={f.phone || ''} onChange={set('phone')} /></Field>
          <Field label="Rol"><select className="input" value={f.role} onChange={set('role')} disabled={self}><option value="ejecutor">Ejecutor PAMEC</option><option value="admin">Administrador</option></select></Field>
        </div>
        <Field label="Funciones individuales"><textarea className="input" value={f.funciones || ''} onChange={set('funciones')} /></Field>
        <label className="row small" style={{ fontWeight: 600 }}><input type="checkbox" checked={!!f.active} onChange={set('active')} disabled={self} style={{ width: 18, height: 18, accentColor: 'var(--primary)' }} /> Perfil activo (puede ingresar y trabajar)</label>
        <div className="row between">
          {!self ? <button className="btn danger" onClick={remove}><Trash2 size={16} /> Desactivar</button> : <span />}
          <button className="btn" onClick={save}><Save size={16} /> Guardar</button>
        </div>
      </div>
    </Modal>
  );
}

function BulkModal({ onClose, profiles, reload, toast }) {
  const [cat, setCat] = useState(CATEGORIES[0]);
  const [who, setWho] = useState('');
  const [onlyEmpty, setOnlyEmpty] = useState(true);
  async function apply() {
    let q = supabase.from('requirements').update({ assigned_to: who || null }).eq('category', cat);
    if (onlyEmpty) q = q.is('assigned_to', null);
    const { error } = await q;
    if (error) return toast(error.message);
    logAction('Asignación por categoría', 'requirements', null, cat);
    toast('Asignación aplicada ✔'); reload(); onClose();
  }
  return (
    <Modal open onClose={onClose} title="Asignar requisitos por categoría">
      <div className="stack">
        <Field label="Categoría"><select className="input" value={cat} onChange={(e) => setCat(e.target.value)}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></Field>
        <Field label="Responsable"><select className="input" value={who} onChange={(e) => setWho(e.target.value)}><option value="">Sin asignar</option>{profiles.filter((p) => p.active).map((p) => <option key={p.id} value={p.id}>{p.full_name}{p.role === 'admin' ? ' (admin · gestión documental)' : ''}</option>)}</select></Field>
        <label className="row small"><input type="checkbox" checked={onlyEmpty} onChange={(e) => setOnlyEmpty(e.target.checked)} style={{ accentColor: 'var(--primary)' }} /> Solo requisitos sin responsable</label>
        <div className="row" style={{ justifyContent: 'flex-end' }}><button className="btn" onClick={apply}><Layers size={16} /> Aplicar</button></div>
      </div>
    </Modal>
  );
}
