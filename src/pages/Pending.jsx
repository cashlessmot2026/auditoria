import { Clock, LogOut, RefreshCw } from 'lucide-react';
import { useAuth } from '../lib/auth';

export default function Pending() {
  const { profile, session, signOut, refreshProfile } = useAuth();
  return (
    <div className="center-screen">
      <div className="card stack" style={{ width: 'min(460px, 100%)', textAlign: 'center', padding: 30 }}>
        <div className="ico tone-amber" style={{ width: 64, height: 64, borderRadius: 22, display: 'grid', placeItems: 'center', margin: '0 auto' }}><Clock size={30} /></div>
        <h2>Cuenta pendiente de activación</h2>
        <p className="muted">
          {profile
            ? <>Hola <b>{profile.full_name}</b>. El administrador de Urueta Dermatología debe activar tu perfil ({session?.user?.email}) desde el módulo <b>Equipo</b>.</>
            : <>No se encontró tu perfil. Verifica que el esquema de base de datos (<span className="mono">supabase/schema.sql</span>) esté instalado.</>}
        </p>
        <div className="row" style={{ justifyContent: 'center' }}>
          <button className="btn soft" onClick={refreshProfile}><RefreshCw size={16} /> Verificar de nuevo</button>
          <button className="btn ghost" onClick={signOut}><LogOut size={16} /> Salir</button>
        </div>
      </div>
    </div>
  );
}
