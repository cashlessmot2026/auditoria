import { useState } from 'react';
import { Plus, Save, Trash2, Target } from 'lucide-react';
import { useData, useProfileName } from '../lib/data';
import { useAuth } from '../lib/auth';
import { supabase, logAction } from '../lib/supabase';
import { PageHead } from '../components/Layout';
import { Modal, Field, Progress, Badge, Empty, Avatar, useToast } from '../components/ui';
import { CATEGORIES } from '../data/pamecCatalog';
import { fmtDate, pct, todayISO, daysUntil } from '../lib/utils';

export default function Goals() {
  const { goals, profiles, requirements, reload } = useData();
  const { isAdmin, profile } = useAuth();
  const name = useProfileName();
  const toast = useToast();
  const [edit, setEdit] = useState(null);

  const people = profiles.filter((p) => p.active && (isAdmin || p.id === profile.id));

  return (
    <>
      <PageHead title="Metas y funciones" sub="Funciones individuales, metas y temas por cumplir de cada ejecutor del PAMEC">
        {isAdmin && <button className="btn" onClick={() => setEdit({})}><Plus size={16} /> Meta</button>}
      </PageHead>

      {!people.length && <div className="card"><Empty icon={Target} title="Sin integrantes" /></div>}
      <div className="stack" style={{ gap: 18 }}>
        {people.map((p) => {
          const mine = goals.filter((g) => g.assigned_to === p.id);
          const reqs = requirements.filter((r) => r.assigned_to === p.id && r.status !== 'no_aplica');
          return (
            <div key={p.id} className="card">
              <div className="row" style={{ flexWrap: 'nowrap', marginBottom: 12 }}>
                <Avatar name={p.full_name} size={46} />
                <div style={{ flex: 1 }}>
                  <h3>{p.full_name}</h3>
                  <div className="small muted">{p.role === 'admin' ? 'Administrador · gestión documental' : p.cargo || 'Ejecutor PAMEC'}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 800, fontSize: '1.2rem' }}>{pct(reqs.filter((r) => r.status === 'cumplido').length, reqs.length)}%</div>
                  <div className="small muted">{reqs.length} requisitos</div>
                </div>
              </div>
              {p.funciones && <div className="ai-box small" style={{ marginBottom: 12, whiteSpace: 'pre-wrap' }}><b>Funciones asignadas:</b> {p.funciones}</div>}
              <div className="grid g-auto">
                {mine.map((g) => {
                  const v = pct(g.current_value, g.target_value); const d = daysUntil(g.due_date);
                  return (
                    <div key={g.id} className="item" style={{ flexDirection: 'column', gap: 6 }} onClick={() => setEdit(g)}>
                      <div className="row between" style={{ width: '100%' }}>
                        <Badge tone={g.status === 'cumplida' || v >= 100 ? 'green' : d != null && d < 0 ? 'red' : 'blue'}>{g.status === 'cumplida' || v >= 100 ? 'Cumplida' : d != null && d < 0 ? 'Vencida' : 'Activa'}</Badge>
                        <span className="small muted">{fmtDate(g.due_date)}</span>
                      </div>
                      <b>{g.title}</b>
                      {g.category && <span className="small muted">{g.category}</span>}
                      <div style={{ width: '100%' }}><Progress value={v} /></div>
                      <div className="small">{g.current_value} / {g.target_value} {g.unit} · <b>{v}%</b></div>
                    </div>
                  );
                })}
                {!mine.length && <p className="small muted">Sin metas asignadas.</p>}
              </div>
            </div>
          );
        })}
      </div>

      {edit && <GoalModal goal={edit.id ? edit : null} onClose={() => setEdit(null)} {...{ profiles, isAdmin, profile, reload, toast, name }} />}
    </>
  );
}

function GoalModal({ goal, onClose, profiles, isAdmin, profile, reload, toast }) {
  const [f, setF] = useState(goal || { title: '', description: '', assigned_to: null, category: '', target_value: 100, current_value: 0, unit: '%', due_date: todayISO(), status: 'activa' });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value === '' ? null : e.target.value });
  const canEdit = isAdmin || goal?.assigned_to === profile.id;
  const ro = !isAdmin;

  async function save() {
    const cur = Number(f.current_value) || 0; const tgt = Number(f.target_value) || 0;
    const status = tgt && cur >= tgt ? 'cumplida' : f.status;
    const payload = isAdmin ? { title: f.title, description: f.description, assigned_to: f.assigned_to, category: f.category, target_value: tgt, current_value: cur, unit: f.unit, due_date: f.due_date, status } : { current_value: cur, status };
    const res = goal ? await supabase.from('goals').update(payload).eq('id', goal.id) : await supabase.from('goals').insert(payload);
    if (res.error) return toast(res.error.message);
    logAction(goal ? 'Actualizó meta' : 'Creó meta', 'goal', goal?.id, f.title);
    toast('Guardado ✔'); reload(); onClose();
  }
  async function remove() {
    if (!window.confirm('¿Eliminar meta?')) return;
    await supabase.from('goals').delete().eq('id', goal.id); reload(); onClose();
  }

  return (
    <Modal open onClose={onClose} title={goal ? goal.title : 'Nueva meta'}>
      <div className="stack">
        <Field label="Meta / tema por cumplir"><input className="input" value={f.title} onChange={set('title')} disabled={ro} /></Field>
        <Field label="Descripción"><textarea className="input" value={f.description || ''} onChange={set('description')} disabled={ro} /></Field>
        <div className="grid g-2">
          <Field label="Responsable"><select className="input" value={f.assigned_to || ''} onChange={set('assigned_to')} disabled={ro}><option value="">—</option>{profiles.filter((p) => p.active).map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}</select></Field>
          <Field label="Categoría"><select className="input" value={f.category || ''} onChange={set('category')} disabled={ro}><option value="">—</option>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></Field>
          <Field label="Valor meta"><input type="number" className="input" value={f.target_value ?? ''} onChange={set('target_value')} disabled={ro} /></Field>
          <Field label="Unidad"><input className="input" value={f.unit || ''} onChange={set('unit')} disabled={ro} placeholder="%, documentos, personas…" /></Field>
          <Field label="Valor actual"><input type="number" className="input" value={f.current_value ?? ''} onChange={set('current_value')} disabled={!canEdit} /></Field>
          <Field label="Fecha límite"><input type="date" className="input" value={f.due_date || ''} onChange={set('due_date')} disabled={ro} /></Field>
        </div>
        <div className="row between">
          {isAdmin && goal ? <button className="btn danger" onClick={remove}><Trash2 size={16} /> Eliminar</button> : <span />}
          {canEdit && <button className="btn" onClick={save} disabled={!f.title}><Save size={16} /> Guardar</button>}
        </div>
      </div>
    </Modal>
  );
}
