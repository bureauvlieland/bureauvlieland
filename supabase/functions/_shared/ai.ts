/**
 * Eén plek voor alle AI-aanroepen vanuit edge functions.
 *
 * Alle scan- en tekstfuncties (inkoopfactuurscanner, verzamelfacturen,
 * logiesregels, e-mailhulp, programmasuggesties, sales-leads) bouwen een
 * OpenAI-achtig verzoek (messages, tools, tool_choice, response_format) en
 * lezen een OpenAI-achtig antwoord (choices[0].message.*). Welke aanbieder
 * dat afhandelt, bepaalt deze module:
 *
 *   ANTHROPIC_API_KEY  → Claude (claude-opus-5) via de Anthropic SDK; het
 *                        gevraagde Gemini-model wordt genegeerd.
 *   GEMINI_API_KEY     → Gemini via het OpenAI-compatibele eindpunt van Google,
 *                        met terugval op andere Gemini-modellen bij limiet of
 *                        verdwenen model.
 *
 * Staan beide sleutels er, dan gaat Claude voor en is Gemini de terugval bij
 * een storing (429/5xx) aan de Claude-kant. Modelnamen mogen nog met "google/"
 * beginnen (zoals de oude Lovable-gateway ze noemde); die prefix gaat eraf.
 */

import Anthropic from "https://esm.sh/@anthropic-ai/sdk@0.124.0";
import { CLAUDE_MODEL, fromAnthropicResponse, toAnthropicRequest, type OpenAiLikeRequest } from "./ai-anthropic.ts";

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/openai";

export const AI_NOT_CONFIGURED_MESSAGE =
  "Geen AI-sleutel ingesteld: zet ANTHROPIC_API_KEY (Claude) of GEMINI_API_KEY bij de secrets van de edge functions.";

function apiKey(): string | undefined {
  const v = Deno.env.get("GEMINI_API_KEY");
  return v && v.trim() ? v.trim() : undefined;
}

function anthropicKey(): string | undefined {
  const v = Deno.env.get("ANTHROPIC_API_KEY");
  return v && v.trim() ? v.trim() : undefined;
}

/** True als er een AI-sleutel is (Claude of Gemini). */
export function aiConfigured(): boolean {
  return anthropicKey() !== undefined || apiKey() !== undefined;
}

/** Welke aanbieder een aanroep nu zou afhandelen; voor logging en de zelftest. */
export function aiProvider(): "anthropic" | "gemini" | null {
  if (anthropicKey()) return "anthropic";
  if (apiKey()) return "gemini";
  return null;
}

/**
 * Gemini-modellen die geprobeerd worden als het gevraagde model faalt
 * (429/404/400). gemini-2.5-flash is per september 2026 niet meer beschikbaar
 * voor nieuwe gebruikers; Google verwijst naar gemini-3.6-flash.
 */
export const AI_FALLBACK_MODELS = ["gemini-3.6-flash", "gemini-3-flash-preview", "gemini-2.5-pro"];

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
async function geminiChatCompletions(
  body: Record<string, unknown> & { model: string },
  options: { fallbacks?: string[] } = {},
): Promise<Response> {
  const key = apiKey();
  if (!key) throw new Error(AI_NOT_CONFIGURED_MESSAGE);
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
    console.error(`AI gemini ${model} → ${res.status}: ${message}`);
    last = res;
    if (!isModelFallbackStatus(res.status)) break;
  }
  return last!;
}

const jsonResponse = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), { status, headers: { "Content-Type": "application/json" } });

async function anthropicChatCompletions(body: Record<string, unknown> & { model: string }): Promise<Response> {
  const client = new Anthropic({ apiKey: anthropicKey() });
  const req = toAnthropicRequest(body as unknown as OpenAiLikeRequest, CLAUDE_MODEL);
  try {
    // deno-lint-ignore no-explicit-any
    const resp = await client.messages.create(req as any);
    if (resp.stop_reason === "refusal") {
      const message = "Claude heeft dit verzoek geweigerd (veiligheidsfilter).";
      lastAiError = { status: 422, message, model: CLAUDE_MODEL };
      return jsonResponse({ error: { message } }, 422);
    }
    return jsonResponse(fromAnthropicResponse(resp as unknown as Parameters<typeof fromAnthropicResponse>[0]));
  } catch (err) {
    if (err instanceof Anthropic.APIError) {
      const status = err.status ?? 500;
      const message = err.message.slice(0, 300);
      lastAiError = { status, message, model: CLAUDE_MODEL };
      console.error(`AI anthropic ${CLAUDE_MODEL} → ${status}: ${message}`);
      return jsonResponse({ error: { message } }, status);
    }
    const message = err instanceof Error ? err.message : String(err);
    lastAiError = { status: 0, message, model: CLAUDE_MODEL };
    console.error(`AI anthropic netwerkfout: ${message}`);
    return jsonResponse({ error: { message } }, 502);
  }
}

/**
 * POST chat/completions, aanbieder-onafhankelijk. Geeft altijd een Response
 * terug in OpenAI-vorm (choices[0].message.content / .tool_calls), zodat de
 * aanroepers hun eigen fout- en 429-afhandeling houden.
 */
export async function aiChatCompletions(
  body: Record<string, unknown> & { model: string },
  options: { fallbacks?: string[] } = {},
): Promise<Response> {
  lastAiError = null;
  if (anthropicKey()) {
    const res = await anthropicChatCompletions(body);
    // Storing aan de Claude-kant en er is een Gemini-sleutel: probeer Gemini.
    if (!res.ok && (res.status === 429 || res.status >= 500) && apiKey()) {
      console.warn(`AI: Claude gaf ${res.status}, terugval op Gemini`);
      return await geminiChatCompletions(body, options);
    }
    return res;
  }
  return await geminiChatCompletions(body, options);
}
