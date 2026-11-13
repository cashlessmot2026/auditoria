import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './lib/auth';
import { DataProvider } from './lib/data';
import Layout from './components/Layout';
import Login from './pages/Login';
import Pending from './pages/Pending';
import Dashboard from './pages/Dashboard';
import Requirements from './pages/Requirements';
import Schedule from './pages/Schedule';
import Trainings from './pages/Trainings';
import Goals from './pages/Goals';
import Team from './pages/Team';
import Auditor from './pages/Auditor';
import Settings from './pages/Settings';

export default function App() {
  const { session, profile, loading, isAdmin } = useAuth();

  if (loading) return <div className="center-screen"><span className="spinner" style={{ color: 'var(--primary)', width: 32, height: 32 }} /></div>;
  if (!session) return <Login />;
  if (!profile || !profile.active) return <Pending />;

  return (
    <DataProvider>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/requisitos" element={<Requirements />} />
          <Route path="/cronograma" element={<Schedule />} />
          <Route path="/capacitaciones" element={<Trainings />} />
          <Route path="/metas" element={<Goals />} />
          <Route path="/auditor" element={<Auditor />} />
          <Route path="/equipo" element={isAdmin ? <Team /> : <Navigate to="/" />} />
          <Route path="/ajustes" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Layout>
    </DataProvider>
  );
}
