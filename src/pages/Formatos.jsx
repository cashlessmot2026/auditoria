import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, FolderDown, FileStack, Info, BookOpen } from 'lucide-react';
import { useData } from '../lib/data';
import { PageHead } from '../components/Layout';
import { Badge, Progress, Empty, useToast } from '../components/ui';
import { FormatButtons } from '../components/FormatDownload';
import { FORMATS, FORMAT_GROUPS } from '../data/formatos';
import { REQ_STATUS, todayISO } from '../lib/utils';
import { logAction } from '../lib/supabase';

export default function Formatos() {
  const { requirements, settings } = useData();
  const navigate = useNavigate();
  const toast = useToast();
  const [group, setGroup] = useState('Todos');
  const [q, setQ] = useState('');
  const [zip, setZip] = useState(null);

  const reqByCode = useMemo(() => Object.fromEntries(requirements.map((r) => [r.code, r])), [requirements]);

  const filtered = useMemo(() => FORMATS.filter((f) =>
    (group === 'Todos' || f.group === group) &&
    (!q || (f.id + f.title + f.objetivo + f.norma + f.reqs.join(' ')).toLowerCase().includes(q.toLowerCase()))
  ), [group, q]);

  const grouped = useMemo(() => {
    const m = new Map();
    filtered.forEach((f) => { if (!m.has(f.group)) m.set(f.group, []); m.get(f.group).push(f); });
    return [...m.entries()];
  }, [filtered]);

  async function downloadAll() {
    setZip(0);
    try {
      const gen = await import('../lib/formatGen');
      const blob = await gen.buildAllZip(settings, setZip);
      gen.downloadBlob(blob, `Formatos_PAMEC_Urueta_${todayISO()}.zip`);
      logAction('Descargó paquete completo de formatos', 'formato', null, FORMATS.length + ' formatos');
    } catch (e) { toast('No se pudo generar el paquete: ' + e.message); }
    setZip(null);
  }

  return (
    <>
      <PageHead title="Formatos" sub={`${FORMATS.length} formatos listos en PDF y Excel, organizados por requisito del PAMEC`}>
        <button className="btn" onClick={downloadAll} disabled={zip !== null}>
          {zip !== null ? <span className="spinner" /> : <FolderDown size={16} />} {zip !== null ? `Generando ${Math.round(zip * 100)}%` : 'Descargar todos (ZIP)'}
        </button>
      </PageHead>

      {zip !== null && <div style={{ marginBottom: 14 }}><Progress value={zip * 100} /></div>}

      <div className="card flat stack" style={{ marginBottom: 16, background: 'var(--primary-soft)' }}>
        <div className="row" style={{ gap: 8, flexWrap: 'nowrap', alignItems: 'flex-start' }}>
          <Info size={18} style={{ flexShrink: 0, marginTop: 2, color: 'var(--primary)' }} />
          <p className="small">
            Cada formato sale con el encabezado de la IPS (nombre y NIT de <b>Ajustes</b>), código y versión. El <b>PDF</b> sirve para imprimir y
            diligenciar a mano; el <b>Excel</b> es editable y trae listas desplegables y cálculos automáticos (celdas amarillas). Los formatos de la
            ruta crítica siguen la estructura de las <i>Guías básicas para la implementación de las Pautas de Auditoría</i> del Ministerio; los demás
            son formatos institucionales sugeridos con su norma de referencia. Antes de usarlos, apruébelos en su control de documentos y súbalos
            diligenciados como evidencia en el requisito correspondiente.
          </p>
        </div>
      </div>

      <div className="stack" style={{ marginBottom: 16 }}>
        <div className="search"><Search size={17} /><input className="input" placeholder="Buscar formato, código, norma o requisito (ej. RC-03, residuos, consentimiento)" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <div className="chip-group">
          {['Todos', ...FORMAT_GROUPS].map((g) => (
            <button key={g} className={'chip' + (group === g ? ' active' : '')} onClick={() => setGroup(g)}>
              {g}{g !== 'Todos' && <span style={{ opacity: .6 }}> · {FORMATS.filter((f) => f.group === g).length}</span>}
            </button>
          ))}
        </div>
      </div>

      {!filtered.length && <Empty icon={FileStack} title="Sin resultados">Prueba con otra palabra o categoría.</Empty>}

      {grouped.map(([g, list]) => (
        <section key={g} style={{ marginBottom: 22 }}>
          <h3 style={{ marginBottom: 10 }}>{g} <span className="muted small">({list.length})</span></h3>
          <div className="grid g-2">
            {list.map((f) => (
              <div key={f.id} className="card stack" style={{ gap: 10 }}>
                <div className="row between" style={{ alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
                  <div style={{ minWidth: 0, flex: '1 1 220px' }}>
                    <span className="mono small muted">{f.id}</span>
                    <h3 style={{ fontSize: '1rem', marginTop: 2 }}>{f.title}</h3>
                  </div>
                  <FormatButtons f={f} />
                </div>
                <p className="small">{f.objetivo}</p>
                <p className="small muted row" style={{ gap: 6, flexWrap: 'nowrap', alignItems: 'flex-start' }}><BookOpen size={14} style={{ flexShrink: 0, marginTop: 2 }} /> {f.norma}</p>
                <div className="row" style={{ gap: 6 }}>
                  <span className="small muted">Requisitos:</span>
                  {f.reqs.map((code) => {
                    const r = reqByCode[code];
                    const st = r ? REQ_STATUS[r.status] : null;
                    return (
                      <button key={code} className="btn ghost sm" style={{ padding: '3px 10px' }} title={r ? `${r.title} · ${st?.label}` : 'Requisito no cargado'}
                        onClick={() => r && navigate('/requisitos?id=' + r.id)}>
                        <Badge tone={st?.tone || 'gray'}>{code}</Badge>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </>
  );
}
