/**
 * Eén plek voor alle AI-aanroepen vanuit edge functions.
 *
 * Alle scan- en tekstfuncties (inkoopfactuurscanner, verzamelfacturen,
 * logiesregels, e-mailhulp, programmasuggesties, sales-leads, social media)
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

/**
 * POST /chat/completions. Geeft de ruwe Response terug zodat aanroepers hun
 * eigen fout- en 429-afhandeling houden.
 */
export async function aiChatCompletions(
  body: Record<string, unknown> & { model: string },
): Promise<Response> {
  const key = apiKey();
  if (!key) throw new Error(AI_NOT_CONFIGURED_MESSAGE);
  const model = body.model.replace(/^google\//, "");
  return await fetch(`${GEMINI_BASE}/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ ...body, model }),
  });
}
