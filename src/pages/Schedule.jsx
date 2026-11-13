import { useMemo, useState } from 'react';
import { Plus, Save, Trash2, CalendarRange, List, GanttChart } from 'lucide-react';
import { useData, useProfileName } from '../lib/data';
import { useAuth } from '../lib/auth';
import { supabase, logAction } from '../lib/supabase';
import { PageHead } from '../components/Layout';
import { Modal, Field, StatusBadge, Progress, Badge, Empty, useToast } from '../components/ui';
import Evidence from '../components/Evidence';
import { PAMEC_PHASES } from '../data/pamecCatalog';
import { ACT_STATUS, fmtDate, todayISO } from '../lib/utils';

const BAR = { pendiente: '#94a3b8', en_proceso: '#f59e0b', completada: '#16a34a', retrasada: '#ef4444', cancelada: '#cbd5e1' };

export default function Schedule() {
  const { activities, requirements, profiles, reload } = useData();
  const { isAdmin, profile } = useAuth();
  const name = useProfileName();
  const toast = useToast();
  const [view, setView] = useState('gantt');
  const [edit, setEdit] = useState(null);

  const today = todayISO();
  const list = useMemo(() => activities.map((a) => ({
    ...a, status: a.end_date && a.end_date < today && ['pendiente', 'en_proceso'].includes(a.status) ? 'retrasada' : a.status
  })), [activities, today]);

  const range = useMemo(() => {
    const dates = list.flatMap((a) => [a.start_date, a.end_date]).filter(Boolean).sort();
    if (!dates.length) return null;
    const min = new Date(dates[0] + 'T00:00:00'); const max = new Date(dates[dates.length - 1] + 'T00:00:00');
    const span = Math.max(1, (max - min) / 86400000);
    const months = [];
    const c = new Date(min.getFullYear(), min.getMonth(), 1);
    while (c <= max) { months.push(new Date(c)); c.setMonth(c.getMonth() + 1); }
    return { min, span, months };
  }, [list]);
  const pos = (d) => range ? ((new Date(d + 'T00:00:00') - range.min) / 86400000 / range.span) * 100 : 0;

  return (
    <>
      <PageHead title="Cronograma de actividades" sub="Ruta crítica del PAMEC con fechas de ejecución editables">
        <div className="chip-group">
          <button className={'chip' + (view === 'gantt' ? ' active' : '')} onClick={() => setView('gantt')}><GanttChart size={13} /> Gantt</button>
          <button className={'chip' + (view === 'list' ? ' active' : '')} onClick={() => setView('list')}><List size={13} /> Lista</button>
        </div>
        {isAdmin && <button className="btn" onClick={() => setEdit({})}><Plus size={16} /> Actividad</button>}
      </PageHead>

      {!list.length && <div className="card"><Empty icon={CalendarRange} title="Sin actividades">Carga la plantilla desde el Dashboard o crea una actividad.</Empty></div>}

      {view === 'gantt' && range && (
        <div className="card gantt">
          <div className="gantt-row" style={{ borderBottom: '1px solid var(--border)' }}>
            <b className="small">Actividad</b>
            <div style={{ position: 'relative', height: 20, minWidth: 380 }}>
              {range.months.map((m) => <span key={m.toISOString()} className="small muted" style={{ position: 'absolute', left: Math.max(0, pos(m.toISOString().slice(0, 10))) + '%', whiteSpace: 'nowrap' }}>{m.toLocaleDateString('es-CO', { month: 'short' })}</span>)}
            </div>
          </div>
          {list.map((a) => (
            <div key={a.id} className="gantt-row" style={{ cursor: 'pointer' }} onClick={() => setEdit(a)}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: '.85rem' }}>{a.phase && <Badge tone="blue">P{a.phase}</Badge>} {a.title}</div>
                <div className="small muted">{fmtDate(a.start_date)} → {fmtDate(a.end_date)} · {name(a.responsible)}</div>
              </div>
              <div className="gantt-track">
                {a.start_date && a.end_date && (
                  <div className="gantt-bar" title={`${a.progress}%`} style={{ left: pos(a.start_date) + '%', width: Math.max(1.2, pos(a.end_date) - pos(a.start_date)) + '%', background: BAR[a.status], opacity: .9 }}>
                    <div style={{ height: '100%', width: a.progress + '%', background: 'rgba(255,255,255,.35)', borderRadius: 999 }} />
                  </div>
                )}
                {today >= range.min.toISOString().slice(0, 10) && pos(today) <= 100 && <div className="gantt-today" style={{ left: pos(today) + '%' }} title="Hoy" />}
              </div>
            </div>
          ))}
          <div className="row small muted" style={{ marginTop: 12 }}>
            {Object.entries(ACT_STATUS).map(([k, v]) => <span key={k} className="row" style={{ gap: 5 }}><i style={{ width: 10, height: 10, borderRadius: 4, background: BAR[k], display: 'inline-block' }} />{v.label}</span>)}
            <span className="row" style={{ gap: 5 }}><i style={{ width: 2, height: 12, background: 'var(--red)', display: 'inline-block' }} />Hoy</span>
          </div>
        </div>
      )}

      {view === 'list' && (
        <div className="grid g-auto">
          {list.map((a) => (
            <div key={a.id} className="item" onClick={() => setEdit(a)} style={{ flexDirection: 'column', gap: 8 }}>
              <div className="row between" style={{ width: '100%' }}>
                <StatusBadge map={ACT_STATUS} value={a.status} />
                {a.phase && <Badge tone="blue">Paso {a.phase}</Badge>}
              </div>
              <b>{a.title}</b>
              <div className="small muted">{fmtDate(a.start_date)} → {fmtDate(a.end_date)}</div>
              <div style={{ width: '100%' }}><Progress value={a.progress} sm /></div>
              <div className="small muted">👤 {name(a.responsible)} · {a.progress}%</div>
            </div>
          ))}
        </div>
      )}

      {edit && <ActivityModal act={edit.id ? edit : null} onClose={() => setEdit(null)} {...{ requirements, profiles, isAdmin, profile, reload, toast }} />}
    </>
  );
}

function ActivityModal({ act, onClose, requirements, profiles, isAdmin, profile, reload, toast }) {
  const original = act ? { ...act, status: act.status === 'retrasada' && act.progress < 100 ? act.status : act.status } : null;
  const [f, setF] = useState(original || { title: '', description: '', phase: null, start_date: todayISO(), end_date: todayISO(), status: 'pendiente', progress: 0, responsible: profile.id, requirement_id: null });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value === '' ? null : e.target.value });
  const canEdit = isAdmin || act?.responsible === profile.id;
  const ro = !isAdmin;

  async function save() {
    const progress = Number(f.progress) || 0;
    const status = progress >= 100 ? 'completada' : f.status;
    const payload = isAdmin
      ? { title: f.title, description: f.description, phase: f.phase ? Number(f.phase) : null, start_date: f.start_date, end_date: f.end_date, status, progress, responsible: f.responsible, requirement_id: f.requirement_id }
      : { status, progress, description: f.description };
    const res = act ? await supabase.from('activities').update(payload).eq('id', act.id) : await supabase.from('activities').insert(payload);
    if (res.error) return toast(res.error.message);
    logAction(act ? 'Editó actividad' : 'Creó actividad', 'activity', act?.id, f.title);
    toast('Guardado ✔'); reload(); onClose();
  }
  async function remove() {
    if (!window.confirm('¿Eliminar actividad?')) return;
    await supabase.from('activities').delete().eq('id', act.id); reload(); onClose();
  }

  return (
    <Modal open onClose={onClose} wide title={act ? act.title : 'Nueva actividad'}>
      <div className="grid g-2">
        <div className="stack">
          <Field label="Actividad"><input className="input" value={f.title} onChange={set('title')} disabled={ro} /></Field>
          <Field label="Descripción / seguimiento"><textarea className="input" value={f.description || ''} onChange={set('description')} disabled={!canEdit} /></Field>
          <div className="grid g-2">
            <Field label="Inicio"><input type="date" className="input" value={f.start_date || ''} onChange={set('start_date')} disabled={ro} /></Field>
            <Field label="Fin"><input type="date" className="input" value={f.end_date || ''} onChange={set('end_date')} disabled={ro} /></Field>
          </div>
          <div className="grid g-2">
            <Field label="Paso ruta crítica"><select className="input" value={f.phase || ''} onChange={set('phase')} disabled={ro}><option value="">—</option>{PAMEC_PHASES.map((p) => <option key={p.n} value={p.n}>{p.n}. {p.name}</option>)}</select></Field>
            <Field label="Responsable"><select className="input" value={f.responsible || ''} onChange={set('responsible')} disabled={ro}><option value="">Sin asignar</option>{profiles.filter((p) => p.active).map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}</select></Field>
          </div>
          <Field label="Requisito relacionado"><select className="input" value={f.requirement_id || ''} onChange={set('requirement_id')} disabled={ro}><option value="">—</option>{requirements.map((r) => <option key={r.id} value={r.id}>{r.code} · {r.title}</option>)}</select></Field>
          <div className="grid g-2">
            <Field label="Estado"><select className="input" value={f.status} onChange={set('status')} disabled={!canEdit}>{Object.entries(ACT_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></Field>
            <Field label={`Avance: ${f.progress || 0}%`}><input type="range" min="0" max="100" step="5" value={f.progress || 0} onChange={set('progress')} disabled={!canEdit} style={{ accentColor: 'var(--primary)', marginTop: 10 }} /></Field>
          </div>
          <div className="row between">
            {isAdmin && act ? <button className="btn danger" onClick={remove}><Trash2 size={16} /> Eliminar</button> : <span />}
            {canEdit && <button className="btn" onClick={save} disabled={!f.title}><Save size={16} /> Guardar</button>}
          </div>
        </div>
        {act ? (
          <div className="stack">
            <h3>Evidencias de ejecución</h3>
            <Evidence link={{ activity_id: act.id }} target={{ code: 'ACT', category: 'Cronograma PAMEC', title: act.title, description: act.description || 'Evidencia de ejecución de la actividad del cronograma PAMEC', norma: 'Decreto 780/2016; Pautas de Auditoría 2007', evidence: 'Acta, informe, listado de asistencia o soporte que demuestre la ejecución de la actividad, con fecha y firmas.' }} />
          </div>
        ) : <p className="small muted">Guarda la actividad para adjuntar evidencias.</p>}
      </div>
    </Modal>
  );
}
