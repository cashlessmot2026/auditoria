import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase, getToken, setToken } from './supabase';
import { toEmail } from './utils';

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(() => getToken());
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Valida el token guardado y trae el perfil (null si venció o es inválido)
  const loadProfile = useCallback(async () => {
    if (!getToken()) { setSession(null); setProfile(null); return; }
    const { data, error } = await supabase.rpc('app_me');
    if (error) { setProfile(null); return; }   // error de red: se conserva el token
    if (!data) { setToken(null); setSession(null); setProfile(null); return; }
    setProfile(data);
  }, []);

  useEffect(() => { loadProfile().finally(() => setLoading(false)); }, [loadProfile]);

  const signIn = useCallback(async (user, password) => {
    const { data, error } = await supabase.rpc('app_login', { p_email: toEmail(user), p_password: password });
    if (error) throw error;
    if (!data?.ok) throw new Error(data?.error || 'No fue posible iniciar sesión');
    setToken(data.token); setSession(data.token); setProfile(data.profile);
  }, []);

  const signOut = useCallback(async () => {
    try { await supabase.rpc('app_logout'); } catch { /* */ }
    setToken(null); setSession(null); setProfile(null);
  }, []);

  const value = {
    session, profile, loading, signIn, signOut,
    isAdmin: profile?.role === 'admin' && profile?.active,
    refreshProfile: loadProfile
  };
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export const useAuth = () => useContext(AuthCtx);
