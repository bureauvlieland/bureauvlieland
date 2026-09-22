// draft-reference-case
//
// Een AI-voorzet voor de tekst van een referentiepagina (titel, intro,
// alinea's), op basis van de momentopname van het programma en de
// beoordeling van de klant. Erwin redigeert; de klant keurt goed. Alleen
// voor admins (docs/plan-reviews-oogsten.md, fase 3).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.23.8";
import { aiChatCompletions, aiConfigured, AI_NOT_CONFIGURED_MESSAGE } from "../_shared/ai.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

export const BodySchema = z.object({ case_id: z.string().uuid() });

interface ProgramItem {
  time?: string | null;
  name?: string;
  category?: string;
  provider?: string | null;
}
interface ProgramDay {
  label?: string;
  date?: string | null;
  items?: ProgramItem[];
}

export interface DraftInput {
  company: string;
  group_size: number | null;
  program_date: string | null;
  days: number;
  program: ProgramDay[];
  facts: { label: string; value: string }[];
  quote: string;
  quote_author: string;
  quote_role: string;
  landing_path: string;
}

export interface Draft {
  title: string;
  intro: string;
  paragraphs: string[];
}

export const SYSTEM_PROMPT = `Je schrijft referentiepagina's voor Bureau Vlieland, een organisator van groepsprogramma's op Vlieland.
Schrijf in het Nederlands, in de u-vorm, feitelijk en warm, zonder superlatieven, zonder uitroeptekens en zonder verzonnen details:
gebruik alleen wat in het programma en de beoordeling staat. Noem de organisatie bij naam. Geen prijzen.
Vorm: een titel van hoogstens 8 woorden zonder punt, een intro van één of twee zinnen, en twee tot drie alinea's
(wat de groep kwam doen, hoe het programma verliep, wat het opleverde). Sluit niet af met een oproep of een slogan.`;

/** De opdracht voor het model, opgebouwd uit de momentopname. */
export function buildUserPrompt(input: DraftInput): string {
  const dagen = (input.program ?? [])
    .map((d) => {
      const items = (d.items ?? [])
        .map((i) => `${i.time ? `${i.time} ` : ""}${i.name ?? ""}${i.category ? ` (${i.category})` : ""}`)
        .join("; ");
      return `- ${d.label ?? "Dag"}${d.date ? ` (${d.date})` : ""}: ${items || "geen onderdelen"}`;
    })
    .join("\n");
  const feiten = (input.facts ?? []).map((f) => `- ${f.label}: ${f.value}`).join("\n");
  return `Organisatie: ${input.company || "onbekend"}
Groepsgrootte: ${input.group_size ?? "onbekend"}
Datum: ${input.program_date ?? "onbekend"}, ${input.days} dag(en)
Instappagina: ${input.landing_path || "onbekend"}
Feiten:
${feiten || "- geen"}
Programma:
${dagen || "- geen"}
Beoordeling van ${input.quote_author || "de klant"}${input.quote_role ? ` (${input.quote_role})` : ""}: "${input.quote || "geen"}"

Gebruik de tool draft_reference om de tekst terug te geven.`;
}

/** Leest en beperkt wat het model teruggeeft. */
export function parseDraft(args: unknown): Draft | null {
  if (!args || typeof args !== "object") return null;
  const a = args as Record<string, unknown>;
  const title = typeof a.title === "string" ? a.title.trim().replace(/\.$/, "").slice(0, 120) : "";
  const intro = typeof a.intro === "string" ? a.intro.trim().slice(0, 400) : "";
  const paragraphs = Array.isArray(a.paragraphs)
    ? a.paragraphs.filter((p): p is string => typeof p === "string" && p.trim().length > 0).map((p) => p.trim().slice(0, 1200)).slice(0, 4)
    : [];
  if (!title || paragraphs.length === 0) return null;
  return { title, intro, paragraphs };
}

export const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json(401, { error: "Unauthorized" });
    const jwt = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(jwt);
    if (authError || !user) return json(401, { error: "Unauthorized" });
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleData) return json(403, { error: "Admin access required" });

    if (!aiConfigured()) return json(503, { error: AI_NOT_CONFIGURED_MESSAGE });

    const parsed = BodySchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return json(400, { error: "case_id (uuid) is verplicht" });

    const { data: rc, error } = await supabase
      .from("reference_cases")
      .select("id, company, group_size, program_date, days, program, facts, quote, quote_author, quote_role, landing_path")
      .eq("id", parsed.data.case_id)
      .maybeSingle();
    if (error || !rc) return json(404, { error: "Referentiepagina niet gevonden" });

    const response = await aiChatCompletions({
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: buildUserPrompt(rc as unknown as DraftInput) },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "draft_reference",
            description: "Geef de tekst van de referentiepagina terug.",
            parameters: {
              type: "object",
              properties: {
                title: { type: "string", description: "Titel van hoogstens 8 woorden, zonder punt" },
                intro: { type: "string", description: "Intro van één of twee zinnen" },
                paragraphs: { type: "array", items: { type: "string" }, description: "Twee tot drie alinea's" },
              },
              required: ["title", "intro", "paragraphs"],
              additionalProperties: false,
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "draft_reference" } },
    });

    if (!response.ok) {
      const text = await response.text();
      console.error("AI error:", response.status, text);
      return json(502, { error: `AI-voorzet mislukt (${response.status})` });
    }
    const aiResponse = await response.json();
    const toolCall = aiResponse.choices?.[0]?.message?.tool_calls?.[0];
    let args: unknown = null;
    try {
      args = toolCall?.function?.arguments ? JSON.parse(toolCall.function.arguments) : null;
    } catch {
      args = null;
    }
    const draft = parseDraft(args);
    if (!draft) return json(502, { error: "AI-voorzet was leeg of onbruikbaar" });

    return json(200, { draft: { title: draft.title, intro: draft.intro, body: draft.paragraphs.join("\n\n") } });
  } catch (err) {
    console.error("draft-reference-case error:", err);
    return json(500, { error: "Onverwachte fout bij de AI-voorzet" });
  }
};

if (import.meta.main) Deno.serve(handler);
