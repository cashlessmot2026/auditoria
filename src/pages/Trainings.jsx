import { useState } from 'react';
import { Plus, Save, Trash2, GraduationCap, Users, Clock, CalendarDays } from 'lucide-react';
import { useData, useProfileName } from '../lib/data';
import { useAuth } from '../lib/auth';
import { supabase, logAction } from '../lib/supabase';
import { PageHead } from '../components/Layout';
import { Modal, Field, StatusBadge, Stat, Empty, Progress, useToast } from '../components/ui';
import Evidence from '../components/Evidence';
import { TR_STATUS, fmtDate, pct, todayISO, daysUntil } from '../lib/utils';

export default function Trainings() {
  const { trainings, profiles, reload } = useData();
  const { isAdmin, profile } = useAuth();
  const name = useProfileName();
  const toast = useToast();
  const [edit, setEdit] = useState(null);
  const [filter, setFilter] = useState('todas');

  const valid = trainings.filter((t) => t.status !== 'cancelada');
  const done = trainings.filter((t) => t.status === 'realizada');
  const hours = done.reduce((s, t) => s + Number(t.duration_hours || 0), 0);
  const coverage = pct(done.reduce((s, t) => s + (t.attendees || 0), 0), done.reduce((s, t) => s + (t.expected_attendees || 0), 0));
  const list = trainings.filter((t) => filter === 'todas' || t.status === filter);

  return (
    <>
      <PageHead title="Programa de capacitaciones" sub="Plan institucional de capacitación (PIC) del PAMEC">
        {isAdmin && <button className="btn" onClick={() => setEdit({})}><Plus size={16} /> Capacitación</button>}
      </PageHead>

      <div className="grid g-4" style={{ marginBottom: 16 }}>
        <Stat icon={GraduationCap} tone="green" value={`${done.length}/${valid.length}`} label="Realizadas" />
        <Stat icon={Clock} tone="blue" value={hours} label="Horas de formación" />
        <Stat icon={Users} tone="primary" value={coverage + '%'} label="Cobertura de asistencia" />
        <Stat icon={CalendarDays} tone="amber" value={trainings.filter((t) => t.status === 'programada' && t.scheduled_date < todayISO()).length} label="Programadas vencidas" />
      </div>

      <div className="chip-group" style={{ marginBottom: 14 }}>
        {['todas', ...Object.keys(TR_STATUS)].map((k) => <button key={k} className={'chip' + (filter === k ? ' active' : '')} onClick={() => setFilter(k)}>{k === 'todas' ? 'Todas' : TR_STATUS[k].label}</button>)}
      </div>

      {!list.length && <div className="card"><Empty icon={GraduationCap} title="Sin capacitaciones" /></div>}
      <div className="grid g-auto">
        {list.map((t) => {
          const d = daysUntil(t.scheduled_date);
          return (
            <div key={t.id} className="item" style={{ flexDirection: 'column', gap: 8 }} onClick={() => setEdit(t)}>
              <div className="row between" style={{ width: '100%' }}>
                <StatusBadge map={TR_STATUS} value={t.status} />
                <span className="small muted">{fmtDate(t.scheduled_date)}{t.status === 'programada' && d != null ? ` · ${d < 0 ? 'vencida' : 'en ' + d + ' d'}` : ''}</span>
              </div>
              <b>{t.topic}</b>
              <div className="small muted">{t.norma}</div>
              <div className="small">⏱ {t.duration_hours} h · {t.modality} · 👥 {t.attendees || 0}/{t.expected_attendees || 0}</div>
              {t.status === 'realizada' && <div style={{ width: '100%' }}><Progress value={pct(t.attendees, t.expected_attendees)} sm /></div>}
              <div className="small muted">Responsable: {name(t.responsible)}{t.facilitator ? ' · Facilita: ' + t.facilitator : ''}</div>
            </div>
          );
        })}
      </div>

      {edit && <TrainingModal tr={edit.id ? edit : null} onClose={() => setEdit(null)} {...{ profiles, isAdmin, profile, reload, toast }} />}
    </>
  );
}

function TrainingModal({ tr, onClose, profiles, isAdmin, profile, reload, toast }) {
  const [f, setF] = useState(tr || { topic: '', description: '', norma: '', audience: 'Todo el personal', facilitator: '', responsible: profile.id, scheduled_date: todayISO(), duration_hours: 1, modality: 'presencial', status: 'programada', expected_attendees: 5, attendees: 0, evaluation_score: null });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value === '' ? null : e.target.value });
  const canEdit = isAdmin || tr?.responsible === profile.id;
  const ro = !isAdmin;

  async function save() {
    const base = { status: f.status, attendees: Number(f.attendees) || 0, evaluation_score: f.evaluation_score, description: f.description, facilitator: f.facilitator };
    const payload = isAdmin ? { ...base, topic: f.topic, norma: f.norma, audience: f.audience, responsible: f.responsible, scheduled_date: f.scheduled_date, duration_hours: f.duration_hours, modality: f.modality, expected_attendees: Number(f.expected_attendees) || 0 } : base;
    const res = tr ? await supabase.from('trainings').update(payload).eq('id', tr.id) : await supabase.from('trainings').insert(payload);
    if (res.error) return toast(res.error.message);
    logAction(tr ? 'Editó capacitación' : 'Creó capacitación', 'training', tr?.id, f.topic);
    toast('Guardado ✔'); reload(); onClose();
  }
  async function remove() {
    if (!window.confirm('¿Eliminar capacitación?')) return;
    await supabase.from('trainings').delete().eq('id', tr.id); reload(); onClose();
  }

  return (
    <Modal open onClose={onClose} wide title={tr ? tr.topic : 'Nueva capacitación'}>
      <div className="grid g-2">
        <div className="stack">
          <Field label="Tema"><input className="input" value={f.topic} onChange={set('topic')} disabled={ro} /></Field>
          <Field label="Contenido / objetivos"><textarea className="input" value={f.description || ''} onChange={set('description')} disabled={!canEdit} /></Field>
          <div className="grid g-2">
            <Field label="Norma relacionada"><input className="input" value={f.norma || ''} onChange={set('norma')} disabled={ro} /></Field>
            <Field label="Dirigido a"><input className="input" value={f.audience || ''} onChange={set('audience')} disabled={ro} /></Field>
            <Field label="Fecha"><input type="date" className="input" value={f.scheduled_date || ''} onChange={set('scheduled_date')} disabled={ro} /></Field>
            <Field label="Duración (h)"><input type="number" step="0.5" className="input" value={f.duration_hours || ''} onChange={set('duration_hours')} disabled={ro} /></Field>
            <Field label="Modalidad"><select className="input" value={f.modality} onChange={set('modality')} disabled={ro}><option>presencial</option><option>virtual</option><option>mixta</option></select></Field>
            <Field label="Facilitador"><input className="input" value={f.facilitator || ''} onChange={set('facilitator')} disabled={!canEdit} /></Field>
            <Field label="Responsable"><select className="input" value={f.responsible || ''} onChange={set('responsible')} disabled={ro}><option value="">—</option>{profiles.filter((p) => p.active).map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}</select></Field>
            <Field label="Estado"><select className="input" value={f.status} onChange={set('status')} disabled={!canEdit}>{Object.entries(TR_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></Field>
            <Field label="Asistentes esperados"><input type="number" className="input" value={f.expected_attendees ?? ''} onChange={set('expected_attendees')} disabled={ro} /></Field>
            <Field label="Asistentes reales"><input type="number" className="input" value={f.attendees ?? ''} onChange={set('attendees')} disabled={!canEdit} /></Field>
            <Field label="Evaluación promedio (0-100)"><input type="number" className="input" value={f.evaluation_score ?? ''} onChange={set('evaluation_score')} disabled={!canEdit} /></Field>
          </div>
          <div className="row between">
            {isAdmin && tr ? <button className="btn danger" onClick={remove}><Trash2 size={16} /> Eliminar</button> : <span />}
            {canEdit && <button className="btn" onClick={save} disabled={!f.topic}><Save size={16} /> Guardar</button>}
          </div>
        </div>
        {tr ? (
          <div className="stack">
            <h3>Listado de asistencia y evaluaciones</h3>
            <Evidence link={{ training_id: tr.id }} target={{ code: 'CAP', category: 'Capacitación', title: 'Evidencia de capacitación: ' + tr.topic, description: tr.description || '', norma: tr.norma, evidence: 'Registro/listado de asistencia con fecha, tema, facilitador, nombres, cargos y firmas de los asistentes; evaluación pre/post o de adherencia; material o presentación.' }} />
          </div>
        ) : <p className="small muted">Guarda la capacitación para adjuntar el listado de asistencia.</p>}
      </div>
    </Modal>
  );
}
