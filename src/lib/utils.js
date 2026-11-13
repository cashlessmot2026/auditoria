export const fmtDate = (d) => {
  if (!d) return '—';
  const dt = typeof d === 'string' && d.length === 10 ? new Date(d + 'T12:00:00') : new Date(d);
  return dt.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
};
export const todayISO = () => {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};
export const addDays = (days, from = new Date()) => {
  const d = new Date(from); d.setDate(d.getDate() + days); return d.toISOString().slice(0, 10);
};
export const daysUntil = (d) => {
  if (!d) return null;
  const a = new Date(todayISO() + 'T12:00:00'); const b = new Date(d + 'T12:00:00');
  return Math.round((b - a) / 86400000);
};
export const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);
export const fileToBase64 = (file) => new Promise((resolve, reject) => {
  const r = new FileReader();
  r.onload = () => resolve(String(r.result).split(',')[1]);
  r.onerror = reject;
  r.readAsDataURL(file);
});
export const prettySize = (b) => !b ? '' : b > 1048576 ? (b / 1048576).toFixed(1) + ' MB' : Math.round(b / 1024) + ' KB';
export const safeName = (n) => n.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9._-]/g, '_');

export const REQ_STATUS = {
  pendiente: { label: 'Pendiente', tone: 'red' },
  en_proceso: { label: 'En proceso', tone: 'amber' },
  cumplido: { label: 'Cumplido', tone: 'green' },
  no_aplica: { label: 'No aplica', tone: 'gray' }
};
export const AI_STATUS = {
  sin_revisar: { label: 'Sin revisión IA', tone: 'gray' },
  aprobado: { label: 'Aprobado IA', tone: 'green' },
  observaciones: { label: 'Con observaciones', tone: 'amber' },
  rechazado: { label: 'Rechazado IA', tone: 'red' }
};
export const ACT_STATUS = {
  pendiente: { label: 'Pendiente', tone: 'gray' },
  en_proceso: { label: 'En proceso', tone: 'amber' },
  completada: { label: 'Completada', tone: 'green' },
  retrasada: { label: 'Retrasada', tone: 'red' },
  cancelada: { label: 'Cancelada', tone: 'gray' }
};
export const TR_STATUS = {
  programada: { label: 'Programada', tone: 'blue' },
  realizada: { label: 'Realizada', tone: 'green' },
  reprogramada: { label: 'Reprogramada', tone: 'amber' },
  cancelada: { label: 'Cancelada', tone: 'gray' }
};

// Permite iniciar sesión con un usuario simple (ej. "david") además del correo
export const USER_DOMAIN = 'urueta.local';
export const toEmail = (u) => {
  const v = String(u || '').trim().toLowerCase();
  return v.includes('@') ? v : `${v}@${USER_DOMAIN}`;
};
export const displayUser = (email) => (email || '').endsWith('@' + USER_DOMAIN) ? email.split('@')[0] : email;
