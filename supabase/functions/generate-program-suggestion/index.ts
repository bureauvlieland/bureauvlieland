import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { occasion, numberOfPeople, dates, vibe, wishes, availableBlockIds } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Fetch published building blocks
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: blocks, error: blocksError } = await supabase
      .from("building_blocks")
      .select("id, name, category, short_description, duration, min_people, max_people, block_type")
      .eq("status", "published")
      .in("id", availableBlockIds || []);

    if (blocksError) throw blocksError;

    if (!blocks || blocks.length === 0) {
      return new Response(JSON.stringify({ suggestions: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const numberOfDays = dates?.length || 1;

    const systemPrompt = `Je bent Erwin, programmaplanner bij Bureau Vlieland. Je stelt programma's samen voor groepen die naar Vlieland komen.

Je hebt de volgende activiteiten beschikbaar:
${blocks.map((b: any) => `- ID: "${b.id}" | ${b.name} (${b.category}) | ${b.short_description || ""} | Duur: ${b.duration || "onbekend"} | ${b.min_people || "?"}-${b.max_people || "?"} pers. | Type: ${b.block_type}`).join("\n")}

Regels:
- Kies 3-6 activiteiten per dag, afhankelijk van de duur van elke activiteit
- Houd rekening met het aantal personen (${numberOfPeople}) en de min/max van elke activiteit
- Verdeel activiteiten logisch over ${numberOfDays} dag(en)
- Selecteer ALLEEN IDs die in de lijst staan
- Kies geen "self_arranged" items tenzij expliciet gevraagd
- Zorg voor variatie in categorieën (activiteit, catering, vervoer)
- Pas de selectie aan op de sfeer: actief = meer sport/outdoor, ontspannen = meer culinair/natuur, mix = van alles wat
- Geef elke activiteit een logische starttijd (HH:MM, 24-uursnotatie). Plan ze chronologisch op de dag zonder overlap.
- Houd rekening met de duur van elke activiteit bij het plannen van de volgende.
- Ontbijt/ochtend: 08:00-09:00, activiteiten overdag: 09:30-17:00, diner/avond: 18:00+`;

    const userPrompt = `Stel een programma samen voor:
- Gelegenheid: ${occasion}
- Aantal personen: ${numberOfPeople}
- Dagen: ${dates?.join(", ") || "1 dag"}
- Sfeer: ${vibe}
${wishes ? `- Bijzondere wensen: ${wishes}` : ""}

Gebruik de suggest_program tool om de activiteiten te retourneren.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "suggest_program",
              description: "Return a list of building block IDs with day assignments for the program.",
              parameters: {
                type: "object",
                properties: {
                  suggestions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        block_id: { type: "string", description: "The ID of the building block" },
                        day_index: { type: "integer", description: "Zero-based day index (0 = day 1)" },
                      },
                      required: ["block_id", "day_index"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["suggestions"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "suggest_program" } },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    
    // Extract tool call result
    const toolCall = aiResponse.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      console.error("No tool call in response:", JSON.stringify(aiResponse));
      return new Response(JSON.stringify({ suggestions: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const args = JSON.parse(toolCall.function.arguments);
    const suggestions = args.suggestions || [];

    // Validate block IDs exist
    const validBlockIds = new Set(blocks.map((b: any) => b.id));
    const validSuggestions = suggestions.filter((s: any) =>
      validBlockIds.has(s.block_id) && s.day_index >= 0 && s.day_index < numberOfDays
    );

    return new Response(JSON.stringify({ suggestions: validSuggestions }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("generate-program-suggestion error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
