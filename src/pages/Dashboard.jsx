import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { CheckCircle2, Clock, AlertTriangle, FileCheck2, GraduationCap, CalendarClock, Sparkles, Database, Target, ChevronRight } from 'lucide-react';
import { useData, useProfileName } from '../lib/data';
import { useAuth } from '../lib/auth';
import { PageHead } from '../components/Layout';
import { Stat, Ring, Progress, Badge, Empty, Avatar, useToast } from '../components/ui';
import { PAMEC_PHASES, CATEGORIES } from '../data/pamecCatalog';
import { pct, daysUntil, fmtDate, todayISO } from '../lib/utils';

const COLORS = { cumplido: '#16a34a', en_proceso: '#f59e0b', pendiente: '#ef4444', no_aplica: '#94a3b8' };

export default function Dashboard() {
  const { requirements, activities, trainings, goals, documents, profiles, settings, loaded, error, seedTemplate } = useData();
  const { isAdmin, profile } = useAuth();
  const name = useProfileName();
  const toast = useToast();
  const [seeding, setSeeding] = useState(false);
  const [mine, setMine] = useState(false);

  const reqs = useMemo(() => mine ? requirements.filter((r) => r.assigned_to === profile.id) : requirements, [mine, requirements, profile.id]);

  const k = useMemo(() => {
    const appl = reqs.filter((r) => r.status !== 'no_aplica');
    const done = appl.filter((r) => r.status === 'cumplido').length;
    const prog = appl.filter((r) => r.status === 'en_proceso').length;
    const pend = appl.filter((r) => r.status === 'pendiente').length;
    const aiOk = appl.filter((r) => r.ai_status === 'aprobado').length;
    const highPend = appl.filter((r) => r.priority === 'alta' && r.status !== 'cumplido').length;
    const today = todayISO();
    const overdueReq = appl.filter((r) => r.due_date && r.due_date < today && r.status !== 'cumplido');
    const actDone = activities.filter((a) => a.status === 'completada').length;
    const actOver = activities.filter((a) => a.end_date && a.end_date < today && !['completada', 'cancelada'].includes(a.status));
    const trDone = trainings.filter((t) => t.status === 'realizada').length;
    const trValid = trainings.filter((t) => t.status !== 'cancelada').length;
    const compliance = pct(done, appl.length);
    // Índice de preparación para la visita: 60% requisitos, 15% revisión IA, 15% cronograma, 10% capacitaciones
    const readiness = Math.round(compliance * 0.6 + pct(aiOk, appl.length) * 0.15 + pct(actDone, activities.length) * 0.15 + pct(trDone, trValid) * 0.10);
    const expiring = documents.filter((d) => d.expires_on && daysUntil(d.expires_on) <= 45);
    return { appl, done, prog, pend, aiOk, highPend, overdueReq, actDone, actOver, trDone, trValid, compliance, readiness, expiring };
  }, [reqs, activities, trainings, documents]);

  const byCat = useMemo(() => CATEGORIES.map((c) => {
    const items = reqs.filter((r) => r.category === c && r.status !== 'no_aplica');
    return { name: c.replace(/ \(.*\)/, ''), full: c, total: items.length, Cumplido: items.filter((r) => r.status === 'cumplido').length, 'En proceso': items.filter((r) => r.status === 'en_proceso').length, Pendiente: items.filter((r) => r.status === 'pendiente').length };
  }).filter((x) => x.total), [reqs]);

  const statusData = [
    { name: 'Cumplido', key: 'cumplido', value: k.done },
    { name: 'En proceso', key: 'en_proceso', value: k.prog },
    { name: 'Pendiente', key: 'pendiente', value: k.pend }
  ].filter((x) => x.value);

  const phases = PAMEC_PHASES.map((p) => {
    const items = requirements.filter((r) => r.phase === p.n && r.status !== 'no_aplica');
    const acts = activities.filter((a) => a.phase === p.n);
    const total = items.length + acts.length;
    const done = items.filter((r) => r.status === 'cumplido').length + acts.filter((a) => a.status === 'completada').length;
    const any = items.some((r) => r.status !== 'pendiente') || acts.some((a) => a.status !== 'pendiente');
    return { ...p, v: pct(done, total), state: total && done === total ? 'done' : any ? 'prog' : '' };
  });

  const people = profiles.filter((p) => p.active).map((p) => {
    const mineR = requirements.filter((r) => r.assigned_to === p.id && r.status !== 'no_aplica');
    return { ...p, total: mineR.length, done: mineR.filter((r) => r.status === 'cumplido').length };
  }).filter((p) => p.total);

  const upcoming = [
    ...activities.filter((a) => !['completada', 'cancelada'].includes(a.status) && a.end_date).map((a) => ({ id: 'a' + a.id, t: a.title, d: a.end_date, kind: 'Actividad', to: '/cronograma' })),
    ...trainings.filter((t) => t.status === 'programada' && t.scheduled_date).map((t) => ({ id: 't' + t.id, t: t.topic, d: t.scheduled_date, kind: 'Capacitación', to: '/capacitaciones' })),
    ...k.appl.filter((r) => r.status !== 'cumplido' && r.due_date).map((r) => ({ id: 'r' + r.id, t: `[${r.code}] ${r.title}`, d: r.due_date, kind: 'Requisito', to: '/requisitos?id=' + r.id }))
  ].sort((a, b) => a.d.localeCompare(b.d)).slice(0, 8);

  const metaDays = daysUntil(settings?.fecha_meta_auditoria);

  if (!loaded) return <div className="empty"><span className="spinner" /></div>;

  if (!requirements.length) {
    return (
      <>
        <PageHead title="Bienvenido 👋" sub="Configuremos el PAMEC de Urueta Dermatología" />
        {error && <div className="card" style={{ borderColor: 'var(--red)', marginBottom: 16 }}><b>Error de base de datos:</b> {error}. ¿Ejecutaste <span className="mono">supabase/schema.sql</span>?</div>}
        <div className="card">
          <Empty icon={Database} title="Aún no hay requisitos cargados">
            {isAdmin ? 'Carga la plantilla normativa base: requisitos del PAMEC (Decreto 780/2016), habilitación (Res. 3100/2019), reporte ST002, seguridad del paciente, residuos, SST, documentos legales de San Andrés, cronograma de la ruta crítica y plan de capacitaciones. Todo queda editable.' : 'El administrador debe cargar la plantilla inicial.'}
          </Empty>
          {isAdmin && <div className="row" style={{ justifyContent: 'center' }}>
            <button className="btn lg" disabled={seeding} onClick={async () => { setSeeding(true); try { await seedTemplate(); toast('Plantilla cargada ✔'); } catch (e) { toast(e.message); } setSeeding(false); }}>
              {seeding ? <span className="spinner" /> : <Sparkles size={18} />} Cargar plantilla normativa
            </button></div>}
        </div>
      </>
    );
  }

  return (
    <>
      <PageHead title="Dashboard PAMEC" sub={`Hola ${profile.full_name?.split(' ')[0] || ''} · avance hacia la auditoría de la Secretaría de Salud de San Andrés`}>
        <div className="chip-group">
          <button className={'chip' + (!mine ? ' active' : '')} onClick={() => setMine(false)}>Toda la IPS</button>
          <button className={'chip' + (mine ? ' active' : '')} onClick={() => setMine(true)}>Mis asignaciones</button>
        </div>
      </PageHead>

      <div className="grid g-3" style={{ marginBottom: 16 }}>
        <div className="card hero span-2">
          <div className="row" style={{ gap: 26, flexWrap: 'wrap', position: 'relative', zIndex: 1 }}>
            <Ring value={k.readiness} label="preparación" />
            <div className="stack" style={{ flex: 1, minWidth: 220, gap: 10 }}>
              <h2 style={{ fontSize: '1.3rem' }}>Índice de preparación para auditoría</h2>
              <p className="muted small">Combina requisitos cumplidos (60%), documentos aprobados por el Auditor IA (15%), cronograma ejecutado (15%) y capacitaciones realizadas (10%).</p>
              <div className="row" style={{ gap: 18 }}>
                <div><div style={{ fontSize: '1.4rem', fontWeight: 800 }}>{k.compliance}%</div><div className="small muted">Cumplimiento</div></div>
                <div><div style={{ fontSize: '1.4rem', fontWeight: 800 }}>{k.aiOk}</div><div className="small muted">Aprobados IA</div></div>
                <div><div style={{ fontSize: '1.4rem', fontWeight: 800 }}>{metaDays == null ? '—' : metaDays}</div><div className="small muted">{metaDays == null ? 'Defina fecha meta' : 'días a la auditoría'}</div></div>
              </div>
            </div>
          </div>
        </div>
        <div className="card stack">
          <h3>Estado de requisitos</h3>
          <div style={{ height: 170 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie data={statusData} dataKey="value" innerRadius={50} outerRadius={78} paddingAngle={3} cornerRadius={8} stroke="none">
                  {statusData.map((s) => <Cell key={s.key} fill={COLORS[s.key]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="row" style={{ justifyContent: 'center' }}>
            {statusData.map((s) => <span key={s.key} className="small row" style={{ gap: 5 }}><i style={{ width: 10, height: 10, borderRadius: 4, background: COLORS[s.key], display: 'inline-block' }} />{s.name} {s.value}</span>)}
          </div>
        </div>
      </div>

      <div className="grid g-4" style={{ marginBottom: 16 }}>
        <Stat icon={CheckCircle2} tone="green" value={`${k.done}/${k.appl.length}`} label="Requisitos cumplidos" />
        <Stat icon={AlertTriangle} tone="red" value={k.highPend} label="Prioridad alta pendientes" sub={k.overdueReq.length ? `${k.overdueReq.length} vencidos` : 'Sin vencidos'} />
        <Stat icon={CalendarClock} tone="amber" value={`${k.actDone}/${activities.length}`} label="Actividades completadas" sub={k.actOver.length ? `${k.actOver.length} atrasadas` : 'Al día'} />
        <Stat icon={GraduationCap} tone="blue" value={`${k.trDone}/${k.trValid}`} label="Capacitaciones realizadas" />
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-head"><h3>Ruta crítica del PAMEC</h3><Link to="/cronograma" className="btn ghost sm">Cronograma <ChevronRight size={14} /></Link></div>
        <div className="steps">
          {phases.map((p) => (
            <div key={p.n} className={'step ' + p.state} title={p.desc}>
              <div className="n">{p.n}</div>
              <div className="t">{p.name}</div>
              <div style={{ marginTop: 6 }}><Progress value={p.v} sm /></div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid g-3" style={{ marginBottom: 16 }}>
        <div className="card span-2">
          <div className="card-head"><h3>Avance por categoría</h3><Link to="/requisitos" className="btn ghost sm">Checklist <ChevronRight size={14} /></Link></div>
          <div style={{ height: Math.max(260, byCat.length * 34) }}>
            <ResponsiveContainer>
              <BarChart data={byCat} layout="vertical" margin={{ left: 10, right: 10 }}>
                <CartesianGrid horizontal={false} strokeOpacity={0.15} />
                <XAxis type="number" allowDecimals={false} fontSize={11} />
                <YAxis type="category" dataKey="name" width={150} fontSize={11} tickLine={false} />
                <Tooltip cursor={{ fill: 'rgba(20,184,166,.08)' }} />
                <Bar dataKey="Cumplido" stackId="a" fill={COLORS.cumplido} radius={[6, 0, 0, 6]} />
                <Bar dataKey="En proceso" stackId="a" fill={COLORS.en_proceso} />
                <Bar dataKey="Pendiente" stackId="a" fill={COLORS.pendiente} radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="card stack">
          <h3>Próximos vencimientos</h3>
          {upcoming.length ? upcoming.map((u) => {
            const d = daysUntil(u.d);
            return (
              <Link key={u.id} to={u.to} className="row" style={{ flexWrap: 'nowrap', color: 'inherit' }}>
                <div className={'ico tone-' + (d < 0 ? 'red' : d <= 7 ? 'amber' : 'gray')} style={{ width: 46, height: 46, borderRadius: 14, display: 'grid', placeItems: 'center', flexShrink: 0, fontWeight: 800, fontSize: '.8rem', textAlign: 'center', lineHeight: 1.05 }}>
                  {d < 0 ? <>{-d}d<br />tarde</> : <>{d}<br />días</>}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: '.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.t}</div>
                  <div className="small muted">{u.kind} · {fmtDate(u.d)}</div>
                </div>
              </Link>
            );
          }) : <p className="small muted">Sin vencimientos próximos.</p>}
        </div>
      </div>

      <div className="grid g-3">
        <div className="card stack">
          <div className="card-head" style={{ margin: 0 }}><h3>Avance por responsable</h3>{isAdmin && <Link to="/equipo" className="btn ghost sm">Equipo</Link>}</div>
          {people.length ? people.map((p) => (
            <div key={p.id} className="row" style={{ flexWrap: 'nowrap' }}>
              <Avatar name={p.full_name} size={34} />
              <div style={{ flex: 1 }}>
                <div className="row between small"><b>{p.full_name}</b><span className="muted">{p.done}/{p.total}</span></div>
                <Progress value={pct(p.done, p.total)} sm />
              </div>
            </div>
          )) : <p className="small muted">Asigna requisitos a tu equipo desde el checklist.</p>}
        </div>
        <div className="card stack">
          <div className="card-head" style={{ margin: 0 }}><h3>Metas</h3><Link to="/metas" className="btn ghost sm">Ver</Link></div>
          {goals.filter((g) => g.status === 'activa').slice(0, 5).map((g) => (
            <div key={g.id}>
              <div className="row between small"><b style={{ maxWidth: '70%' }}>{g.title}</b><span className="muted">{pct(g.current_value, g.target_value)}%</span></div>
              <Progress value={pct(g.current_value, g.target_value)} sm />
              <div className="small muted">{name(g.assigned_to)}</div>
            </div>
          ))}
          {!goals.length && <div className="row small muted"><Target size={16} /> Sin metas definidas.</div>}
        </div>
        <div className="card stack">
          <h3>Alertas</h3>
          {k.overdueReq.slice(0, 4).map((r) => <div key={r.id} className="row small" style={{ flexWrap: 'nowrap' }}><Badge tone="red">Vencido</Badge><span>{r.code} · {r.title}</span></div>)}
          {k.expiring.slice(0, 4).map((d) => <div key={d.id} className="row small" style={{ flexWrap: 'nowrap' }}><Badge tone="amber">Vence {fmtDate(d.expires_on)}</Badge><span>{d.file_name}</span></div>)}
          {requirements.filter((r) => r.ai_status === 'rechazado').slice(0, 3).map((r) => <div key={r.id} className="row small" style={{ flexWrap: 'nowrap' }}><Badge tone="red">IA rechazó</Badge><span>{r.code} · {r.title}</span></div>)}
          {!k.overdueReq.length && !k.expiring.length && <div className="row small muted"><FileCheck2 size={16} /> Sin alertas críticas.</div>}
          <Link to="/auditor" className="btn soft block" style={{ marginTop: 'auto' }}><Sparkles size={16} /> Iniciar pre-auditoría con IA</Link>
        </div>
      </div>
      {!settings?.fecha_meta_auditoria && isAdmin && (
        <div className="card flat row between" style={{ marginTop: 16 }}>
          <span className="row small"><Clock size={16} /> Define la fecha meta de la auditoría de la Secretaría de Salud para ver la cuenta regresiva.</span>
          <Link to="/ajustes" className="btn sm">Configurar</Link>
        </div>
      )}
    </>
  );
}
