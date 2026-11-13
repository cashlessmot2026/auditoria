import { createClient } from '@supabase/supabase-js';

export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://ammeqhkgaksrhrsnxwys.supabase.co';
export const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_aTnNLT6oPzsUIvI3RNng8A_Mk7YYU_p';

// Sesión propia (sin Supabase Auth): el token lo entrega app_login() y viaja
// en el encabezado "x-app-token" de cada petición (datos, archivos y funciones).
const TOKEN_KEY = 'urueta-token';
export const getToken = () => { try { return localStorage.getItem(TOKEN_KEY); } catch { return null; } };
export const setToken = (t) => { try { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY); } catch { /* */ } };

const fetchWithToken = (input, init = {}) => {
  const headers = new Headers(init.headers || {});
  const t = getToken();
  if (t) headers.set('x-app-token', t);
  return fetch(input, { ...init, headers });
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  global: { fetch: fetchWithToken }
});

export const PROFILE_COLUMNS = 'id,email,full_name,cargo,phone,role,active,funciones,created_at,last_login_at';

export const BUCKET = 'pamec-docs';

export async function logAction(action, entity, entity_id, detail) {
  try {
    await supabase.from('audit_log').insert({ action, entity, entity_id: entity_id ? String(entity_id) : null, detail });
  } catch { /* la bitácora nunca debe romper el flujo */ }
}

export async function signedUrl(path, seconds = 600) {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, seconds);
  if (error) throw error;
  return data.signedUrl;
}
