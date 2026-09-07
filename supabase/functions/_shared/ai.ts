/**
 * Eén plek voor alle AI-aanroepen vanuit edge functions.
 *
 * Tot de migratie liepen alle AI-calls via de Lovable AI Gateway
 * (ai.gateway.lovable.dev, sleutel LOVABLE_API_KEY). Die gateway is
 * OpenAI-compatibel en routeert op modelprefix: "google/…" naar Gemini,
 * "openai/…" naar OpenAI. Deze module doet precies hetzelfde, maar dan
 * rechtstreeks naar de leverancier met een eigen sleutel:
 *
 *   GEMINI_API_KEY  → https://generativelanguage.googleapis.com/v1beta/openai
 *   OPENAI_API_KEY  → https://api.openai.com/v1
 *
 * Zolang alleen LOVABLE_API_KEY is gezet (nog onder Lovable Cloud), blijft
 * alles via de Lovable gateway lopen. Zodra de eigen sleutel er is, wint die.
 * Bestaande aanroepen hoeven dus niet te weten waar de call heen gaat; alleen
 * de body (model, messages, tools, …) blijft over.
 */

export type AiProvider = "gemini" | "openai" | "lovable";

interface ResolvedProvider {
  provider: AiProvider;
  baseUrl: string;
  apiKey: string;
  /** Modelnaam zoals de leverancier hem verwacht (zonder "google/"-prefix). */
  model: string;
}

const LOVABLE_BASE = "https://ai.gateway.lovable.dev/v1";
const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/openai";
const OPENAI_BASE = "https://api.openai.com/v1";

export const AI_NOT_CONFIGURED_MESSAGE =
  "Geen AI-sleutel ingesteld: zet GEMINI_API_KEY (en OPENAI_API_KEY voor embeddings), of LOVABLE_API_KEY.";

function env(name: string): string | undefined {
  const v = Deno.env.get(name);
  return v && v.trim() ? v.trim() : undefined;
}

/** Bepaalt provider + sleutel voor een modelnaam. Null als niets is ingesteld. */
export function resolveAiProvider(model: string): ResolvedProvider | null {
  const lovableKey = env("LOVABLE_API_KEY");
  const isOpenAiModel = model.startsWith("openai/");
  const bare = model.replace(/^(google|openai)\//, "");

  if (isOpenAiModel) {
    const key = env("OPENAI_API_KEY");
    if (key) return { provider: "openai", baseUrl: OPENAI_BASE, apiKey: key, model: bare };
  } else {
    const key = env("GEMINI_API_KEY");
    if (key) return { provider: "gemini", baseUrl: GEMINI_BASE, apiKey: key, model: bare };
  }
  if (lovableKey) return { provider: "lovable", baseUrl: LOVABLE_BASE, apiKey: lovableKey, model };
  return null;
}

/** True als er voor chat-modellen (Gemini) een werkende sleutel is. */
export function aiConfigured(): boolean {
  return resolveAiProvider("google/gemini-2.5-flash") !== null;
}

async function post(path: string, body: Record<string, unknown>, model: string): Promise<Response> {
  const resolved = resolveAiProvider(model);
  if (!resolved) throw new Error(AI_NOT_CONFIGURED_MESSAGE);
  return await fetch(`${resolved.baseUrl}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resolved.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ ...body, model: resolved.model }),
  });
}

/**
 * POST /chat/completions. Geeft de ruwe Response terug zodat aanroepers hun
 * eigen fout- en 429-afhandeling houden.
 */
export function aiChatCompletions(
  body: Record<string, unknown> & { model: string },
): Promise<Response> {
  return post("/chat/completions", body, body.model);
}

/** POST /embeddings (OpenAI-compatibel). */
export function aiEmbeddings(
  body: { model: string; input: string | string[]; dimensions?: number },
): Promise<Response> {
  return post("/embeddings", body, body.model);
}
