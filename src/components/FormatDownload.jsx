import { useState } from 'react';
import { FileText, FileSpreadsheet } from 'lucide-react';
import { useData } from '../lib/data';
import { useToast } from './ui';
import { logAction } from '../lib/supabase';

// Botones de descarga PDF / Excel de un formato (generación en el navegador)
export function FormatButtons({ f, size = 'sm' }) {
  const { settings } = useData();
  const toast = useToast();
  const [busy, setBusy] = useState('');

  async function get(kind) {
    setBusy(kind);
    try {
      const gen = await import('../lib/formatGen');
      const blob = kind === 'pdf' ? await gen.buildPDF(f, settings) : await gen.buildXLSX(f, settings);
      gen.downloadBlob(blob, gen.fileBase(f) + (kind === 'pdf' ? '.pdf' : '.xlsx'));
      logAction('Descargó formato ' + kind.toUpperCase(), 'formato', f.id, f.title);
    } catch (e) { toast('No se pudo generar el formato: ' + e.message); }
    setBusy('');
  }

  return (
    <div className="row" style={{ gap: 6, flexWrap: 'nowrap' }}>
      <button className={'btn soft ' + size} onClick={(e) => { e.stopPropagation(); get('pdf'); }} disabled={!!busy} title="Descargar PDF para imprimir">
        {busy === 'pdf' ? <span className="spinner" /> : <FileText size={15} />} PDF
      </button>
      <button className={'btn ghost ' + size} onClick={(e) => { e.stopPropagation(); get('xlsx'); }} disabled={!!busy} title="Descargar Excel editable">
        {busy === 'xlsx' ? <span className="spinner" /> : <FileSpreadsheet size={15} />} Excel
      </button>
    </div>
  );
}
