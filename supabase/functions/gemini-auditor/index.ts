// Supabase Edge Function: proxy seguro hacia Google Gemini
// La llave NUNCA viaja al navegador. Configure el secreto:
//   supabase secrets set GEMINI_API_KEY=su_llave
// Opcional: GEMINI_MODELS="gemini-3.5-flash,gemini-flash-latest,gemini-3.8-flash"
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);

  // 1) Validar que quien llama sea un usuario activo de la app
  const authHeader = req.headers.get("Authorization") ?? "";
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const { data: { user } } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
  if (!user) return json({ error: "No autenticado" }, 401);
  const { data: profile } = await supabase.from("profiles").select("active").eq("id", user.id).single();
  if (!profile?.active) return json({ error: "Usuario inactivo" }, 403);

  // 2) Reenviar a Gemini
  const key = Deno.env.get("GEMINI_API_KEY");
  if (!key) return json({ error: "Falta el secreto GEMINI_API_KEY" }, 500);
  const models = (Deno.env.get("GEMINI_MODELS") ?? "gemini-3.5-flash,gemini-flash-latest,gemini-3.8-flash")
    .split(",").map((m) => m.trim()).filter(Boolean);

  const { system, contents, json: wantJson } = await req.json();
  const payload: Record<string, unknown> = {
    contents,
    generationConfig: { temperature: 0.3, ...(wantJson ? { responseMimeType: "application/json" } : {}) },
  };
  if (system) payload.systemInstruction = { parts: [{ text: system }] };

  let lastError = "";
  for (const model of models) {
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
      { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) },
    );
    const data = await r.json().catch(() => ({}));
    if (r.ok) return json({ ...data, model });
    lastError = data?.error?.message ?? `HTTP ${r.status}`;
    if (![404, 429, 500, 503].includes(r.status)) break;
  }
  return json({ error: lastError }, 502);
});
