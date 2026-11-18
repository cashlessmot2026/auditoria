// Cliente de Gemini. La llave y el interruptor se guardan en Ajustes (tabla ai_config).
const MODELS = ['gemini-3.5-flash', 'gemini-flash-latest', 'gemini-3.8-flash'];

function extractText(data) {
  return (data?.candidates?.[0]?.content?.parts || []).map((p) => p.text || '').join('').trim();
}

/**
 * contents: [{ role: 'user'|'model', parts: [{ text } | { inlineData: { mimeType, data } }] }]
 */
export async function askGemini({ apiKey, system, contents, json = false }) {
  if (!apiKey) throw new Error('Falta la llave API de Gemini (Ajustes → Agente IA).');
  const payload = {
    contents,
    generationConfig: { temperature: 0.3, ...(json ? { responseMimeType: 'application/json' } : {}) }
  };
  if (system) payload.systemInstruction = { parts: [{ text: system }] };
  let last = '';
  for (const model of MODELS) {
    let r;
    try {
      r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey }, body: JSON.stringify(payload)
      });
    } catch { throw new Error('No hay conexión con Gemini.'); }
    const data = await r.json().catch(() => ({}));
    if (r.ok) return extractText(data);
    last = data?.error?.message || `HTTP ${r.status}`;
    if (![404, 429, 500, 503].includes(r.status)) break;
  }
  throw new Error('Gemini: ' + last);
}

export function parseJSON(text) {
  try { return JSON.parse(text); } catch { /* intenta extraer bloque */ }
  const m = text.match(/\{[\s\S]*\}/);
  if (m) { try { return JSON.parse(m[0]); } catch { /* */ } }
  return null;
}

export const SUPPORTED_AI_MIME = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'text/plain', 'text/csv'];
