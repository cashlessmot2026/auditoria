import { createClient } from '@supabase/supabase-js';

export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://ammeqhkgaksrhrsnxwys.supabase.co';
export const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_aTnNLT6oPzsUIvI3RNng8A_Mk7YYU_p';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true }
});

// Cliente secundario (sin sesión persistente) para que el admin cree cuentas
// sin cerrar su propia sesión.
export const signupClient = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false, storageKey: 'urueta-signup' }
});

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
