import { supabase } from './supabase';

const DIRECT_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const MODELS = ['gemini-3.5-flash', 'gemini-flash-latest', 'gemini-3.8-flash'];

function extractText(data) {
  return (data?.candidates?.[0]?.content?.parts || []).map((p) => p.text || '').join('').trim();
}

async function callDirect(payload) {
  let last = '';
  for (const model of MODELS) {
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${DIRECT_KEY}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }
    );
    const data = await r.json().catch(() => ({}));
    if (r.ok) return data;
    last = data?.error?.message || `HTTP ${r.status}`;
    if (![404, 429, 500, 503].includes(r.status)) break;
  }
  throw new Error(last);
}

/**
 * Llama a Gemini. Primero intenta la Edge Function segura "gemini-auditor";
 * si no está desplegada y existe VITE_GEMINI_API_KEY (solo desarrollo), llama directo.
 * contents: [{ role: 'user'|'model', parts: [{ text } | { inlineData: { mimeType, data } }] }]
 */
export async function askGemini({ system, contents, json = false }) {
  let edgeError = '';
  try {
    const { data, error } = await supabase.functions.invoke('gemini-auditor', { body: { system, contents, json } });
    if (!error && data?.candidates) return extractText(data);
    edgeError = data?.error || error?.message || 'sin respuesta';
  } catch (e) { edgeError = e.message; }

  if (DIRECT_KEY) {
    const payload = {
      contents,
      generationConfig: { temperature: 0.3, ...(json ? { responseMimeType: 'application/json' } : {}) }
    };
    if (system) payload.systemInstruction = { parts: [{ text: system }] };
    return extractText(await callDirect(payload));
  }
  throw new Error('No fue posible contactar al Auditor IA (' + edgeError + '). Despliegue la Edge Function "gemini-auditor" (ver README).');
}

export function parseJSON(text) {
  try { return JSON.parse(text); } catch { /* intenta extraer bloque */ }
  const m = text.match(/\{[\s\S]*\}/);
  if (m) { try { return JSON.parse(m[0]); } catch { /* */ } }
  return null;
}

export const SUPPORTED_AI_MIME = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'text/plain', 'text/csv'];
