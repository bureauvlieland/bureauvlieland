// AI-classificatie van logies-inkoopfactuurregels.
// Suggereert per regel: room | extra (met categorie) | tourist_tax | exclude.
// Toeristenbelasting wordt expliciet uitgesloten — zit al in onze verkoopfactuur.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `Je classificeert regels van een Nederlandse logies-/hotelfactuur voor doorboeking op een verkoopfactuur.

Per regel kies je één van:
- "room"        → overnachting / kamerprijs / arrangement / "logies" / room rate
- "extra"       → F&B, faciliteiten of vervoer dat het hotel apart factureert
- "tourist_tax" → toeristenbelasting / verblijfsbelasting / city tax (MOET UITGESLOTEN worden — wij berekenen die zelf op de verkoopfactuur)
- "exclude"     → niet doorberekenen (bv. kortingen, eigen risico, betaal-correcties)

Bij "extra" kies je een categorie:
- "fb"         → ontbijt, lunch, diner, drank, koffie, borrel, restaurant
- "facilities" → parkeren, sauna, wasruimte, conferentiezaal, wifi, kluis
- "transport"  → shuttle, taxi, bagagevervoer
- "other"      → alles wat niet in fb/facilities/transport past

Confidence is 0-1. Reason is één korte Nederlandse zin (max 12 woorden).
KRITIEK: toeristenbelasting/verblijfsbelasting/city tax → ALTIJD "tourist_tax".`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Admin-auth: must be logged-in admin
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      {
        global: { headers: { Authorization: req.headers.get("Authorization") || "" } },
      },
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: role } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!role) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const lines: Array<{ description: string; quantity?: number | null; unit_price?: number | null; vat_rate?: number | null }> = body.lines || [];
    const partnerName: string = body.partner_name || "";
    const quoteContext: string = body.quote_context || "";

    if (!Array.isArray(lines) || lines.length === 0) {
      return new Response(JSON.stringify({ suggestions: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "Missing LOVABLE_API_KEY" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userPayload = {
      partner: partnerName,
      context: quoteContext,
      lines: lines.map((l, i) => ({
        index: i,
        description: l.description,
        quantity: l.quantity ?? null,
        unit_price: l.unit_price ?? null,
        vat_rate: l.vat_rate ?? null,
      })),
    };

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: `Classificeer deze regels:\n${JSON.stringify(userPayload, null, 2)}` },
        ],
        tools: [{
          type: "function",
          function: {
            name: "classify_lines",
            description: "Classificeer iedere factuurregel",
            parameters: {
              type: "object",
              properties: {
                suggestions: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      index: { type: "number" },
                      target: { type: "string", enum: ["room", "extra", "tourist_tax", "exclude"] },
                      extra_category: { type: ["string", "null"], enum: ["fb", "facilities", "transport", "other", null] },
                      confidence: { type: "number" },
                      reason: { type: "string" },
                    },
                    required: ["index", "target", "confidence", "reason"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["suggestions"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "classify_lines" } },
      }),
    });

    if (!aiResp.ok) {
      const text = await aiResp.text();
      console.error("AI gateway error:", aiResp.status, text);
      return new Response(JSON.stringify({ error: `AI ${aiResp.status}` }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiJson = await aiResp.json();
    const toolCall = aiJson.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      return new Response(JSON.stringify({ error: "No AI output" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const parsed = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("classify-lodging-invoice-lines error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Unknown" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
