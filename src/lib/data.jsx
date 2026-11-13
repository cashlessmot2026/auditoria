import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase, logAction, PROFILE_COLUMNS } from './supabase';
import { useAuth } from './auth';
import { REQUIREMENTS, ACTIVITY_TEMPLATE, TRAINING_TEMPLATE } from '../data/pamecCatalog';
import { addDays } from './utils';

const DataCtx = createContext(null);

export function DataProvider({ children }) {
  const { profile } = useAuth();
  const [state, setState] = useState({
    settings: null, requirements: [], activities: [], trainings: [], goals: [], profiles: [], documents: [], loaded: false, error: null
  });

  const reload = useCallback(async () => {
    if (!profile?.active) return;
    const q = (t, order = 'created_at') => supabase.from(t).select(t === 'profiles' ? PROFILE_COLUMNS : '*').order(order, { ascending: true });
    const [s, r, a, t, g, p, d] = await Promise.all([
      supabase.from('ips_settings').select('*').eq('id', 1).maybeSingle(),
      supabase.from('requirements').select('*').order('sort').order('code'),
      q('activities', 'start_date'),
      q('trainings', 'scheduled_date'),
      q('goals', 'due_date'),
      q('profiles', 'full_name'),
      supabase.from('documents').select('id,requirement_id,activity_id,training_id,file_name,file_path,mime_type,size_bytes,ai_verdict,ai_score,created_at,expires_on,uploaded_by').order('created_at', { ascending: false })
    ]);
    const error = [s, r, a, t, g, p, d].find((x) => x.error)?.error?.message || null;
    setState({
      settings: s.data, requirements: r.data || [], activities: a.data || [], trainings: t.data || [],
      goals: g.data || [], profiles: p.data || [], documents: d.data || [], loaded: true, error
    });
  }, [profile?.active]);

  useEffect(() => { reload(); }, [reload]);

  // Carga la plantilla normativa base (solo admin, solo si está vacío)
  const seedTemplate = useCallback(async () => {
    const reqRows = REQUIREMENTS.map((r, i) => ({ ...r, sort: i, due_date: addDays(r.priority === 'alta' ? 90 : 180) }));
    const { error: e1 } = await supabase.from('requirements').upsert(reqRows, { onConflict: 'code', ignoreDuplicates: true });
    if (e1) throw e1;
    const { count: ac } = await supabase.from('activities').select('id', { count: 'exact', head: true });
    if (!ac) {
      const { error } = await supabase.from('activities').insert(ACTIVITY_TEMPLATE.map((x, i) => ({
        title: x.title, phase: x.phase, start_date: addDays(x.start), end_date: addDays(x.end), sort: i, responsible: profile.id
      })));
      if (error) throw error;
    }
    const { count: tc } = await supabase.from('trainings').select('id', { count: 'exact', head: true });
    if (!tc) {
      const { error } = await supabase.from('trainings').insert(TRAINING_TEMPLATE.map((x) => ({
        topic: x.topic, norma: x.norma, scheduled_date: addDays(x.offset), duration_hours: x.hours,
        audience: 'Todo el personal', expected_attendees: 5, responsible: profile.id
      })));
      if (error) throw error;
    }
    await logAction('Cargó plantilla normativa base', 'requirements');
    await reload();
  }, [profile?.id, reload]);

  return <DataCtx.Provider value={{ ...state, reload, seedTemplate }}>{children}</DataCtx.Provider>;
}

export const useData = () => useContext(DataCtx);

export function useProfileName() {
  const { profiles } = useData();
  return (id) => profiles.find((p) => p.id === id)?.full_name || 'Sin asignar';
}
