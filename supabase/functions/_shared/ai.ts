/**
 * Eén plek voor alle AI-aanroepen vanuit edge functions.
 *
 * Alle scan- en tekstfuncties (inkoopfactuurscanner, verzamelfacturen,
 * logiesregels, e-mailhulp, programmasuggesties, sales-leads)
 * praten met Gemini via het OpenAI-compatibele eindpunt van Google:
 *
 *   GEMINI_API_KEY  → https://generativelanguage.googleapis.com/v1beta/openai
 *
 * Tot de verhuizing van september 2026 liep dit via de Lovable AI Gateway
 * (LOVABLE_API_KEY) en had Claudia een OpenAI-sleutel voor embeddings; beide
 * zijn vervallen. Modelnamen mogen nog met "google/" beginnen (zoals de
 * gateway ze noemde); die prefix wordt hier weggehaald.
 */

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/openai";

export const AI_NOT_CONFIGURED_MESSAGE =
  "Geen AI-sleutel ingesteld: zet GEMINI_API_KEY bij de secrets van de edge functions.";

function apiKey(): string | undefined {
  const v = Deno.env.get("GEMINI_API_KEY");
  return v && v.trim() ? v.trim() : undefined;
}

/** True als er een werkende Gemini-sleutel is. */
export function aiConfigured(): boolean {
  return apiKey() !== undefined;
}

/** Modellen die geprobeerd worden als het gevraagde model faalt (429/404/400). */
export const AI_FALLBACK_MODELS = ["gemini-2.5-flash"];

/** Kale modelnaam zonder gateway-prefix ("google/gemini-2.5-pro" → "gemini-2.5-pro"). */
export function normalizeModel(model: string): string {
  return model.replace(/^google\//, "");
}

/** Volgorde waarin modellen geprobeerd worden: het gevraagde eerst, dan de terugval, zonder dubbelen. */
export function modelChain(model: string, fallbacks: string[] = AI_FALLBACK_MODELS): string[] {
  const chain = [normalizeModel(model)];
  for (const f of fallbacks) if (!chain.includes(normalizeModel(f))) chain.push(normalizeModel(f));
  return chain;
}

/** Een status waarbij een ander model het alsnog kan redden (limiet, onbekend model, ongeldig verzoek voor dit model). */
export function isModelFallbackStatus(status: number): boolean {
  return status === 429 || status === 404 || status === 400 || status === 503;
}

/** Leesbare foutmelding uit een Google-foutantwoord, zonder sleutel of ruis. */
export function aiErrorMessage(status: number, body: string): string {
  try {
    const parsed = JSON.parse(body);
    const msg = parsed?.error?.message ?? parsed?.message;
    if (typeof msg === "string" && msg.trim()) return msg.trim().slice(0, 300);
  } catch { /* geen json */ }
  return body.trim().slice(0, 300) || `HTTP ${status}`;
}

/** Laatste fout van de vorige aiChatCompletions-aanroep, voor een nette melding aan de gebruiker. */
export let lastAiError: { status: number; message: string; model: string } | null = null;

/**
 * POST /chat/completions. Probeert bij een limiet of onbekend model de
 * terugvalmodellen; geeft de laatste Response terug zodat aanroepers hun
 * eigen fout- en 429-afhandeling houden. Logt status en foutmelding (nooit
 * de sleutel).
 */
export async function aiChatCompletions(
  body: Record<string, unknown> & { model: string },
  options: { fallbacks?: string[] } = {},
): Promise<Response> {
  const key = apiKey();
  if (!key) throw new Error(AI_NOT_CONFIGURED_MESSAGE);
  lastAiError = null;
  let last: Response | null = null;
  for (const model of modelChain(body.model, options.fallbacks)) {
    const res = await fetch(`${GEMINI_BASE}/chat/completions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ ...body, model }),
    });
    if (res.ok) return res;
    const text = await res.clone().text();
    const message = aiErrorMessage(res.status, text);
    lastAiError = { status: res.status, message, model };
    console.error(`AI ${model} → ${res.status}: ${message}`);
    last = res;
    if (!isModelFallbackStatus(res.status)) break;
  }
  return last!;
}
