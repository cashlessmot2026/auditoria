import { NavLink } from 'react-router-dom';
import { LayoutDashboard, ListChecks, CalendarRange, GraduationCap, Target, Users, Bot, Settings, LogOut } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { Avatar } from './ui';

const LINKS = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', short: 'Inicio' },
  { to: '/requisitos', icon: ListChecks, label: 'Checklist PAMEC', short: 'Checklist' },
  { to: '/cronograma', icon: CalendarRange, label: 'Cronograma', short: 'Cronograma' },
  { to: '/capacitaciones', icon: GraduationCap, label: 'Capacitaciones', short: 'Capacitar' },
  { to: '/metas', icon: Target, label: 'Metas y funciones', short: 'Metas' },
  { to: '/auditor', icon: Bot, label: 'Auditor IA', short: 'Auditor IA' },
  { to: '/equipo', icon: Users, label: 'Equipo', admin: true },
  { to: '/ajustes', icon: Settings, label: 'Ajustes' }
];

export default function Layout({ children }) {
  const { profile, isAdmin, signOut } = useAuth();
  const links = LINKS.filter((l) => !l.admin || isAdmin);
  const icon = `${import.meta.env.BASE_URL}pwa-192x192.png`;

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <img src={icon} alt="" />
          <div><b>Urueta Dermatología</b><span>PAMEC · San Andrés Islas</span></div>
        </div>
        {links.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>
            <Icon size={19} /> {label}
          </NavLink>
        ))}
        <div className="spacer" />
        <div className="user-chip">
          <Avatar name={profile?.full_name} />
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: '.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{profile?.full_name}</div>
            <div className="small muted">{isAdmin ? 'Administrador' : profile?.cargo || 'Ejecutor PAMEC'}</div>
          </div>
          <button className="btn ghost icon" title="Cerrar sesión" onClick={signOut}><LogOut size={16} /></button>
        </div>
      </aside>

      <main className="main">
        <div className="mobile-header">
          <div className="row" style={{ gap: 10 }}>
            <img src={icon} alt="" width="36" height="36" style={{ borderRadius: 12 }} />
            <div><b style={{ fontSize: '.95rem' }}>Urueta Dermatología</b><div className="small muted">PAMEC</div></div>
          </div>
          <div className="row" style={{ gap: 6 }}>
            {isAdmin && <NavLink to="/equipo" className="btn ghost icon" aria-label="Equipo"><Users size={17} /></NavLink>}
            <NavLink to="/ajustes" className="btn ghost icon" aria-label="Ajustes"><Settings size={17} /></NavLink>
          </div>
        </div>
        {children}
      </main>

      <nav className="bottom-nav">
        {LINKS.filter((l) => l.short).map(({ to, icon: Icon, short }) => (
          <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => (isActive ? 'active' : '')}>
            <Icon size={20} />{short}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

export const PageHead = ({ title, sub, children }) => (
  <div className="topbar">
    <div><h1>{title}</h1>{sub && <p className="sub">{sub}</p>}</div>
    {children && <div className="row">{children}</div>}
  </div>
);
