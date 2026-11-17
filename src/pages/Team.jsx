import { useState } from 'react';
import { UserPlus, Save, Trash2, ShieldCheck, Layers, KeyRound, Pencil } from 'lucide-react';
import { useData } from '../lib/data';
import { useAuth } from '../lib/auth';
import { supabase, logAction } from '../lib/supabase';
import { PageHead } from '../components/Layout';
import { Modal, Field, Badge, Avatar, Progress, useToast } from '../components/ui';
import { CATEGORIES } from '../data/pamecCatalog';
import { pct, toEmail, displayUser } from '../lib/utils';

export default function Team() {
  const { profiles, requirements, reload } = useData();
  const { profile: me } = useAuth();
  const toast = useToast();
  const [creating, setCreating] = useState(false);
  const [edit, setEdit] = useState(null);
  const [bulk, setBulk] = useState(false);
  const isAdmin = me?.role === 'admin';

  async function removeProfile(p) {
    if (p.id === me.id) return toast('No puedes eliminar tu propio perfil.');
    if (!window.confirm('¿ELIMINAR definitivamente a ' + p.full_name + '?' + String.fromCharCode(10, 10) + 'Se borra su usuario y su conversación con el Auditor IA. Los requisitos que tenía asignados quedan sin responsable y sus evidencias se conservan. No se puede deshacer.' + String.fromCharCode(10, 10) + 'Si solo quieres que no ingrese, abre Editar y desmarca «Perfil activo».')) return;
    const { data, error } = await supabase.from('profiles').delete().eq('id', p.id).select('id');
    if (error) return toast(error.message);
    if (!data?.length) return toast('No se pudo eliminar (sin permiso).');
    logAction('Eliminó perfil', 'profile', p.id, p.full_name);
    toast('Perfil eliminado ✔'); reload();
  }

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
                  <div className="small muted" style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{displayUser(p.email)}</div>
                </div>
              </div>
              <div className="row" style={{ gap: 6 }}>
                <Badge tone={p.role === 'admin' ? 'primary' : 'blue'} icon={p.role === 'admin' ? ShieldCheck : undefined}>{p.role === 'admin' ? 'Administrador' : 'Ejecutor'}</Badge>
                <Badge tone={p.active ? 'green' : 'red'}>{p.active ? 'Activo' : 'Inactivo'}</Badge>
                {p.cargo && <Badge>{p.cargo}</Badge>}
              </div>
              {isAdmin && (
                <div className="row" style={{ gap: 8 }} onClick={(e) => e.stopPropagation()}>
                  <button className="btn soft" onClick={() => setEdit(p)}><Pencil size={15} /> Editar</button>
                  {p.id !== me.id && <button className="btn danger" onClick={() => removeProfile(p)}><Trash2 size={15} /> Eliminar</button>}
                </div>
              )}
              <div style={{ width: '100%' }}>
                <div className="row between small"><span className="muted">{reqs.length} requisitos asignados</span><b>{pct(reqs.filter((r) => r.status === 'cumplido').length, reqs.length)}%</b></div>
                <Progress value={pct(reqs.filter((r) => r.status === 'cumplido').length, reqs.length)} sm />
              </div>
            </div>
          );
        })}
      </div>

      {creating && <CreateModal onClose={() => setCreating(false)} onDone={reload} toast={toast} />}
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
    const email = toEmail(f.email);
    const { error } = await supabase.rpc('admin_create_profile', {
      p_email: email, p_password: f.password, p_full_name: f.full_name,
      p_cargo: f.cargo || null, p_phone: f.phone || null, p_role: f.role, p_funciones: f.funciones || null
    });
    setBusy(false);
    if (error) return toast(error.message);
    logAction('Creó perfil', 'profile', null, email);
    toast('Perfil creado ✔. Comparte el usuario «' + displayUser(email) + '» y la contraseña asignada.'); onDone(); onClose();
  }

  return (
    <Modal open onClose={onClose} title="Nuevo perfil de ejecutor">
      <div className="stack">
        <div className="grid g-2">
          <Field label="Nombre completo"><input className="input" value={f.full_name} onChange={set('full_name')} /></Field>
          <Field label="Usuario o correo"><input className="input" value={f.email} onChange={set('email')} placeholder="ej. maria o maria@correo.com" autoCapitalize="none" /></Field>
          <Field label="Cargo"><input className="input" value={f.cargo} onChange={set('cargo')} placeholder="Auxiliar de enfermería, Líder de calidad…" /></Field>
          <Field label="Teléfono"><input className="input" value={f.phone} onChange={set('phone')} /></Field>
          <Field label="Rol"><select className="input" value={f.role} onChange={set('role')}><option value="ejecutor">Ejecutor PAMEC</option><option value="admin">Administrador</option></select></Field>
          <Field label="Contraseña asignada"><input type="text" className="input" value={f.password} onChange={set('password')} placeholder="Mín. 6 caracteres" autoComplete="off" /></Field>
        </div>
        <Field label="Funciones individuales asignadas"><textarea className="input" value={f.funciones} onChange={set('funciones')} placeholder="Ej.: Responsable de PGIRASA y de la ruta de residuos; tecnovigilancia; capacitaciones de bioseguridad…" /></Field>
        <p className="small muted">La persona entra con este usuario y la contraseña asignada, y puede cambiarla luego en Ajustes → Cambiar contraseña.</p>
        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <button className="btn" onClick={submit} disabled={busy || !f.email || !f.full_name || f.password.length < 6}>{busy ? <span className="spinner" /> : <UserPlus size={16} />} Crear perfil</button>
        </div>
      </div>
    </Modal>
  );
}

function EditModal({ p, me, onClose, reload, toast }) {
  const [f, setF] = useState(p);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });
  const self = p.id === me.id;
  const [newPw, setNewPw] = useState('');
  const [userTxt, setUserTxt] = useState(displayUser(p.email));
  async function resetPw() {
    const { error } = await supabase.rpc('admin_set_password', { p_profile_id: p.id, p_password: newPw });
    if (error) return toast(error.message);
    logAction('Asignó nueva contraseña', 'profile', p.id, p.full_name);
    setNewPw(''); toast('Contraseña asignada ✔' + '. Se cerraron sus sesiones abiertas.');
  }

  async function save() {
    const email = toEmail(userTxt);
    if (!userTxt.trim()) return toast('El usuario o correo no puede estar vacío.');
    if (!f.full_name?.trim()) return toast('El nombre no puede estar vacío.');
    const { error } = await supabase.from('profiles').update({ email, full_name: f.full_name, cargo: f.cargo, phone: f.phone, funciones: f.funciones, role: self ? p.role : f.role, active: self ? true : f.active }).eq('id', p.id);
    if (error) return toast(/duplicate|unique/i.test(error.message) ? 'Ya existe otro perfil con ese usuario o correo.' : error.message);
    logAction('Editó perfil', 'profile', p.id, f.full_name); toast(email !== p.email ? 'Guardado ✔. El nuevo usuario para ingresar es «' + displayUser(email) + '».' : 'Guardado ✔'); reload(); onClose();
  }
  async function remove() {
    if (!window.confirm('¿ELIMINAR definitivamente a ' + p.full_name + '? Se borra su usuario y su conversación con el Auditor IA; sus requisitos quedan sin responsable. No se puede deshacer.')) return;
    const { data, error } = await supabase.from('profiles').delete().eq('id', p.id).select('id');
    if (error) return toast(error.message);
    if (!data?.length) return toast('No se pudo eliminar (sin permiso).');
    logAction('Eliminó perfil', 'profile', p.id, p.full_name);
    toast('Perfil eliminado ✔'); reload(); onClose();
  }

  return (
    <Modal open onClose={onClose} title={p.full_name}>
      <div className="stack">
        <div className="grid g-2">
          <Field label="Nombre"><input className="input" value={f.full_name || ''} onChange={set('full_name')} /></Field>
          <Field label="Usuario o correo (para ingresar)"><input className="input" value={userTxt} onChange={(e) => setUserTxt(e.target.value)} autoCapitalize="none" autoComplete="off" /></Field>
          <Field label="Cargo"><input className="input" value={f.cargo || ''} onChange={set('cargo')} /></Field>
          <Field label="Teléfono"><input className="input" value={f.phone || ''} onChange={set('phone')} /></Field>
          <Field label="Rol"><select className="input" value={f.role} onChange={set('role')} disabled={self}><option value="ejecutor">Ejecutor PAMEC</option><option value="admin">Administrador</option></select></Field>
        </div>
        <Field label="Funciones individuales"><textarea className="input" value={f.funciones || ''} onChange={set('funciones')} /></Field>
        {!self && (
          <div className="row" style={{ alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}><Field label="Asignar nueva contraseña"><input type="text" className="input" value={newPw} onChange={(e) => setNewPw(e.target.value)} placeholder="Mín. 6 caracteres" autoComplete="off" /></Field></div>
            <button className="btn soft" onClick={resetPw} disabled={newPw.length < 6}><KeyRound size={16} /> Asignar</button>
          </div>
        )}
        <label className="row small" style={{ fontWeight: 600 }}><input type="checkbox" checked={!!f.active} onChange={set('active')} disabled={self} style={{ width: 18, height: 18, accentColor: 'var(--primary)' }} /> Perfil activo (puede ingresar y trabajar)</label>
        <div className="row between">
          {!self ? <button className="btn danger" onClick={remove}><Trash2 size={16} /> Eliminar perfil</button> : <span />}
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
