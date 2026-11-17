import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Plus, Check, Paperclip, Sparkles, Trash2, Save, ListChecks, Download } from 'lucide-react';
import { useData, useProfileName } from '../lib/data';
import { useAuth } from '../lib/auth';
import { supabase, logAction } from '../lib/supabase';
import { PageHead } from '../components/Layout';
import { Modal, Badge, StatusBadge, Field, Progress, Empty, useToast } from '../components/ui';
import Evidence from '../components/Evidence';
import { FormatButtons } from '../components/FormatDownload';
import { formatsForRequirement } from '../data/formatos';
import { CATEGORIES, PAMEC_PHASES } from '../data/pamecCatalog';
import { REQ_STATUS, AI_STATUS, fmtDate, pct, daysUntil, todayISO } from '../lib/utils';

export default function Requirements() {
  const { requirements, documents, profiles, reload } = useData();
  const { isAdmin, profile } = useAuth();
  const name = useProfileName();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const [cat, setCat] = useState('Todas');
  const [status, setStatus] = useState('todos');
  const [q, setQ] = useState('');
  const [mine, setMine] = useState(!isAdmin);
  const [openId, setOpenId] = useState(params.get('id'));
  const [creating, setCreating] = useState(false);

  useEffect(() => { const id = params.get('id'); if (id) setOpenId(id); }, [params]);

  const filtered = useMemo(() => requirements.filter((r) =>
    (cat === 'Todas' || r.category === cat) &&
    (status === 'todos' || r.status === status || (status === 'vencidos' && r.due_date && r.due_date < todayISO() && r.status !== 'cumplido')) &&
    (!mine || r.assigned_to === profile.id) &&
    (!q || (r.code + r.title + r.description + r.norma).toLowerCase().includes(q.toLowerCase()))
  ), [requirements, cat, status, q, mine, profile.id]);

  const grouped = useMemo(() => {
    const m = new Map();
    filtered.forEach((r) => { if (!m.has(r.category)) m.set(r.category, []); m.get(r.category).push(r); });
    return [...m.entries()];
  }, [filtered]);

  const canEdit = (r) => isAdmin || r.assigned_to === profile.id;

  async function toggle(r, e) {
    e.stopPropagation();
    if (!canEdit(r)) return toast('Solo el responsable o el admin pueden cambiar este requisito');
    const next = r.status === 'cumplido' ? 'en_proceso' : 'cumplido';
    const { error } = await supabase.from('requirements').update({ status: next }).eq('id', r.id);
    if (error) return toast(error.message);
    logAction(next === 'cumplido' ? 'Marcó cumplido' : 'Reabrió requisito', 'requirement', r.id, r.code);
    reload();
  }

  function exportCSV() {
    const rows = [['Código', 'Categoría', 'Requisito', 'Norma', 'Evidencia', 'Estado', 'Revisión del auditor', 'Responsable', 'Fecha límite', 'Documentos']];
    filtered.forEach((r) => rows.push([r.code, r.category, r.title, r.norma, r.evidence, REQ_STATUS[r.status]?.label, AI_STATUS[r.ai_status]?.label, name(r.assigned_to), r.due_date || '', documents.filter((d) => d.requirement_id === r.id).length]));
    const csv = rows.map((row) => row.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(';')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
    a.download = `checklist_pamec_${todayISO()}.csv`; a.click();
  }

  const close = () => { setOpenId(null); setCreating(false); if (params.get('id')) setParams({}); };
  const current = requirements.find((r) => r.id === openId);

  return (
    <>
      <PageHead title="Checklist PAMEC" sub={`${requirements.filter((r) => r.status === 'cumplido').length} de ${requirements.filter((r) => r.status !== 'no_aplica').length} requisitos aplicables cumplidos`}>
        <button className="btn ghost" onClick={exportCSV}><Download size={16} /> Exportar</button>
        {isAdmin && <button className="btn" onClick={() => setCreating(true)}><Plus size={16} /> Nuevo requisito</button>}
      </PageHead>

      <div className="stack" style={{ marginBottom: 16 }}>
        <div className="row" style={{ flexWrap: 'nowrap' }}>
          <div className="search" style={{ flex: 1 }}><Search size={17} /><input className="input" placeholder="Buscar requisito, norma o código…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
          <select className="input" style={{ width: 'auto', borderRadius: 999 }} value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="todos">Todos</option>
            {Object.entries(REQ_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            <option value="vencidos">Vencidos</option>
          </select>
        </div>
        <div className="chip-group">
          <button className={'chip' + (mine ? ' active' : '')} onClick={() => setMine(!mine)}>Mis asignaciones</button>
          {['Todas', ...CATEGORIES].map((c) => <button key={c} className={'chip' + (cat === c ? ' active' : '')} onClick={() => setCat(c)}>{c}</button>)}
        </div>
      </div>

      {!grouped.length && <div className="card"><Empty icon={ListChecks} title="Sin resultados">Ajusta los filtros.</Empty></div>}

      <div className="stack" style={{ gap: 22 }}>
        {grouped.map(([category, items]) => {
          const appl = items.filter((r) => r.status !== 'no_aplica');
          const v = pct(appl.filter((r) => r.status === 'cumplido').length, appl.length);
          return (
            <section key={category}>
              <div className="row between" style={{ marginBottom: 10 }}>
                <h2>{category}</h2>
                <div className="row small muted" style={{ minWidth: 160 }}><div style={{ width: 100 }}><Progress value={v} sm /></div>{v}%</div>
              </div>
              <div className="grid g-auto">
                {items.map((r) => {
                  const nDocs = documents.filter((d) => d.requirement_id === r.id).length;
                  const dd = daysUntil(r.due_date);
                  return (
                    <div key={r.id} className="item" onClick={() => setOpenId(r.id)}>
                      <button className={'check' + (r.status === 'cumplido' ? ' on' : r.status === 'en_proceso' ? ' half' : '')} onClick={(e) => toggle(r, e)} aria-label="Marcar cumplido">
                        {r.status === 'cumplido' ? <Check size={16} strokeWidth={3} /> : r.status === 'en_proceso' ? '•' : null}
                      </button>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="row" style={{ gap: 6, marginBottom: 4 }}>
                          <span className="small mono muted">{r.code}</span>
                          {r.priority === 'alta' && <Badge tone="red">Alta</Badge>}
                          {r.phase && <Badge tone="blue">Paso {r.phase}</Badge>}
                        </div>
                        <div style={{ fontWeight: 700, fontSize: '.92rem', textDecoration: r.status === 'no_aplica' ? 'line-through' : 'none' }}>{r.title}</div>
                        <div className="small muted" style={{ marginTop: 2 }}>{r.norma}</div>
                        <div className="row" style={{ gap: 6, marginTop: 8 }}>
                          <StatusBadge map={REQ_STATUS} value={r.status} />
                          {r.ai_status !== 'sin_revisar' && <StatusBadge map={AI_STATUS} value={r.ai_status} />}
                          {nDocs > 0 && <Badge tone="primary" icon={Paperclip}>{nDocs}</Badge>}
                          {r.due_date && r.status !== 'cumplido' && <Badge tone={dd < 0 ? 'red' : dd <= 15 ? 'amber' : 'gray'}>{dd < 0 ? 'Vencido' : fmtDate(r.due_date)}</Badge>}
                        </div>
                        <div className="small muted" style={{ marginTop: 6 }}>👤 {name(r.assigned_to)}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

      {(current || creating) && (
        <RequirementModal req={creating ? null : current} onClose={close} profiles={profiles} canEdit={creating || canEdit(current)} isAdmin={isAdmin} reload={reload} toast={toast} />
      )}
    </>
  );
}

function RequirementModal({ req, onClose, profiles, canEdit, isAdmin, reload, toast }) {
  const [tab, setTab] = useState(req ? 'evidencias' : 'detalle');
  const [f, setF] = useState(req || { code: '', category: CATEGORIES[0], title: '', description: '', norma: '', evidence: '', priority: 'media', status: 'pendiente', periodicity: 'Anual', phase: null, assigned_to: null, due_date: null, notes: '' });
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value === '' ? null : e.target.value });

  useEffect(() => { if (req) setF((prev) => ({ ...prev, status: req.status, ai_status: req.ai_status, ai_feedback: req.ai_feedback })); }, [req]);

  async function save() {
    setSaving(true);
    const payload = isAdmin
      ? { code: f.code, category: f.category, title: f.title, description: f.description, norma: f.norma, evidence: f.evidence, priority: f.priority, status: f.status, periodicity: f.periodicity, phase: f.phase ? Number(f.phase) : null, assigned_to: f.assigned_to, due_date: f.due_date, notes: f.notes }
      : { status: f.status, notes: f.notes };
    const res = req ? await supabase.from('requirements').update(payload).eq('id', req.id) : await supabase.from('requirements').insert(payload);
    setSaving(false);
    if (res.error) return toast(res.error.message);
    logAction(req ? 'Editó requisito' : 'Creó requisito', 'requirement', req?.id, f.code);
    toast('Guardado ✔'); reload(); if (!req) onClose();
  }

  async function remove() {
    if (!window.confirm('¿Eliminar este requisito y sus evidencias?')) return;
    const { error } = await supabase.from('requirements').delete().eq('id', req.id);
    if (error) return toast(error.message);
    logAction('Eliminó requisito', 'requirement', req.id, req.code); reload(); onClose();
  }

  const markDone = async () => { await supabase.from('requirements').update({ status: 'cumplido' }).eq('id', req.id); toast('Marcado como cumplido ✔'); reload(); };
  const ro = !isAdmin;

  return (
    <Modal open onClose={onClose} wide title={req ? `${req.code} · ${req.title}` : 'Nuevo requisito'}>
      {req && (
        <div className="chip-group" style={{ marginBottom: 16 }}>
          <button className={'chip' + (tab === 'evidencias' ? ' active' : '')} onClick={() => setTab('evidencias')}><Paperclip size={13} /> Evidencias y revisión</button>
          <button className={'chip' + (tab === 'detalle' ? ' active' : '')} onClick={() => setTab('detalle')}>Detalle y asignación</button>
        </div>
      )}

      {tab === 'evidencias' && req && (
        <div className="grid g-2">
          <div className="stack">
            <div className="ai-box stack" style={{ gap: 8 }}>
              <div><b className="small">Qué se exige</b><p className="small">{req.description}</p></div>
              <div><b className="small">Evidencia requerida</b><p className="small">{req.evidence}</p></div>
              <div><b className="small">Fundamento normativo</b><p className="small">{req.norma}</p></div>
              <div className="row small muted"><span>Periodicidad: {req.periodicity || '—'}</span><span>Límite: {fmtDate(req.due_date)}</span></div>
            </div>
            {req.ai_feedback && <div className="ai-box"><b className="small row" style={{ gap: 6 }}><Sparkles size={14} /> Último concepto del auditor</b><p className="small" style={{ marginTop: 4 }}>{req.ai_feedback}</p></div>}
            <div className="row">
              <StatusBadge map={REQ_STATUS} value={req.status} />
              <StatusBadge map={AI_STATUS} value={req.ai_status} />
              {canEdit && req.status !== 'cumplido' && <button className="btn sm" onClick={markDone}><Check size={14} /> Marcar cumplido</button>}
            </div>
          </div>
          {formatsForRequirement(req.code).length > 0 && (
            <div className="stack" style={{ gap: 8 }}>
              <b className="small">Formatos para este requisito</b>
              {formatsForRequirement(req.code).map((f) => (
                <div key={f.id} className="row between" style={{ gap: 8, padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 14 }}>
                  <span className="small" style={{ minWidth: 0, flex: 1 }}><span className="mono muted">{f.id}</span> {f.title}</span>
                  <FormatButtons f={f} />
                </div>
              ))}
            </div>
          )}
          <Evidence target={req} link={{ requirement_id: req.id }} />
        </div>
      )}

      {tab === 'detalle' && (
        <div className="stack">
          <div className="grid g-3">
            <Field label="Código"><input className="input" value={f.code || ''} onChange={set('code')} disabled={ro} /></Field>
            <Field label="Categoría"><select className="input" value={f.category} onChange={set('category')} disabled={ro}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></Field>
            <Field label="Paso ruta crítica"><select className="input" value={f.phase || ''} onChange={set('phase')} disabled={ro}><option value="">—</option>{PAMEC_PHASES.map((p) => <option key={p.n} value={p.n}>{p.n}. {p.name}</option>)}</select></Field>
          </div>
          <Field label="Requisito"><input className="input" value={f.title || ''} onChange={set('title')} disabled={ro} /></Field>
          <Field label="Descripción"><textarea className="input" value={f.description || ''} onChange={set('description')} disabled={ro} /></Field>
          <div className="grid g-2">
            <Field label="Norma"><input className="input" value={f.norma || ''} onChange={set('norma')} disabled={ro} /></Field>
            <Field label="Evidencia / documentos exigidos"><input className="input" value={f.evidence || ''} onChange={set('evidence')} disabled={ro} /></Field>
          </div>
          <div className="grid g-3">
            <Field label="Responsable">
              <select className="input" value={f.assigned_to || ''} onChange={set('assigned_to')} disabled={ro}>
                <option value="">Sin asignar</option>
                {profiles.filter((p) => p.active).map((p) => <option key={p.id} value={p.id}>{p.full_name}{p.role === 'admin' ? ' (admin · gestión documental)' : ''}</option>)}
              </select>
            </Field>
            <Field label="Fecha límite"><input type="date" className="input" value={f.due_date || ''} onChange={set('due_date')} disabled={ro} /></Field>
            <Field label="Prioridad"><select className="input" value={f.priority} onChange={set('priority')} disabled={ro}><option value="alta">Alta</option><option value="media">Media</option><option value="baja">Baja</option></select></Field>
          </div>
          <div className="grid g-2">
            <Field label="Estado"><select className="input" value={f.status} onChange={set('status')} disabled={!canEdit}>{Object.entries(REQ_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></Field>
            <Field label="Periodicidad"><input className="input" value={f.periodicity || ''} onChange={set('periodicity')} disabled={ro} /></Field>
          </div>
          <Field label="Notas / observaciones"><textarea className="input" value={f.notes || ''} onChange={set('notes')} disabled={!canEdit} /></Field>
          <div className="row between">
            {isAdmin && req ? <button className="btn danger" onClick={remove}><Trash2 size={16} /> Eliminar</button> : <span />}
            {canEdit && <button className="btn" onClick={save} disabled={saving || !f.title}>{saving ? <span className="spinner" /> : <Save size={16} />} Guardar</button>}
          </div>
        </div>
      )}
    </Modal>
  );
}
