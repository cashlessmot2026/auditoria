import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { X } from 'lucide-react';

export function Modal({ open, onClose, title, children, wide, footer }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <div className={'modal' + (wide ? ' wide' : '')} role="dialog" aria-modal="true">
        <div className="row between" style={{ marginBottom: 16, flexWrap: 'nowrap' }}>
          <h2>{title}</h2>
          <button className="btn ghost icon" onClick={onClose} aria-label="Cerrar"><X size={18} /></button>
        </div>
        {children}
        {footer && <div className="row" style={{ justifyContent: 'flex-end', marginTop: 20 }}>{footer}</div>}
      </div>
    </div>
  );
}

export const Badge = ({ tone = 'gray', children, icon: Icon }) => (
  <span className={'badge tone-' + tone}>{Icon && <Icon size={12} />}{children}</span>
);

export const StatusBadge = ({ map, value }) => {
  const s = map[value] || { label: value, tone: 'gray' };
  return <Badge tone={s.tone}>{s.label}</Badge>;
};

export const Field = ({ label, children, style }) => (
  <div className="field" style={style}><label>{label}</label>{children}</div>
);

export const Avatar = ({ name, size = 38 }) => {
  const ini = (name || '?').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  return <div className="avatar" style={{ width: size, height: size, fontSize: size * 0.34 }}>{ini}</div>;
};

export const Progress = ({ value, sm }) => (
  <div className={'bar' + (sm ? ' sm' : '')}><i style={{ width: Math.max(0, Math.min(100, value || 0)) + '%' }} /></div>
);

export const Stat = ({ icon: Icon, tone = 'primary', value, label, sub }) => (
  <div className="card stat">
    <div className={'ico tone-' + tone}><Icon size={22} /></div>
    <div>
      <div className="val">{value}</div>
      <div className="lbl">{label}</div>
      {sub && <div className="small muted">{sub}</div>}
    </div>
  </div>
);

export const Empty = ({ icon: Icon, title, children }) => (
  <div className="empty">
    {Icon && <Icon size={40} style={{ opacity: .5 }} />}
    <h3 style={{ marginTop: 10 }}>{title}</h3>
    {children && <div className="small" style={{ marginTop: 6 }}>{children}</div>}
  </div>
);

export function Ring({ value = 0, size = 150, stroke = 14, label, color = '#fff', track = 'rgba(255,255,255,.2)' }) {
  const r = (size - stroke) / 2; const c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`${value}%`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={c - (c * Math.min(100, value)) / 100}
        transform={`rotate(-90 ${size / 2} ${size / 2})`} style={{ transition: 'stroke-dashoffset .8s' }} />
      <text x="50%" y="48%" textAnchor="middle" dominantBaseline="middle" fill={color} fontSize={size * 0.22} fontWeight="800">{value}%</text>
      {label && <text x="50%" y="66%" textAnchor="middle" fill={color} opacity=".8" fontSize={size * 0.085} fontWeight="600">{label}</text>}
    </svg>
  );
}

// ---------- Toasts ----------
const ToastCtx = createContext(() => {});
export function ToastProvider({ children }) {
  const [msg, setMsg] = useState(null);
  const show = useCallback((m) => { setMsg(m); setTimeout(() => setMsg(null), 3200); }, []);
  return <ToastCtx.Provider value={show}>{children}{msg && <div className="toast">{msg}</div>}</ToastCtx.Provider>;
}
export const useToast = () => useContext(ToastCtx);
