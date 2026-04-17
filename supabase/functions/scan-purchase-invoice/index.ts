import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Je bent een specialist in het analyseren van Nederlandse inkoopfacturen. Lees ALLE pagina's van de PDF zorgvuldig.

Extracteer gestructureerde data via de tool 'extract_invoice'. Belangrijke regels:
- Bedragen ALTIJD als getallen (geen €/EUR, geen duizendscheidingstekens, punt als decimaal — dus "1.234,56" → 1234.56).
- Datums in formaat YYYY-MM-DD.
- BTW-percentage als getal (0, 9 of 21 — geen %-teken).
- supplier_name = de leverancier/afzender (NIET de geadresseerde "Bureau Vlieland").
- Als een veld niet zichtbaar is, gebruik null.

ORDERREGELS (BELANGRIJK):
- Vul ALTIJD line_items in met ALLE regels van de factuur.
- Per regel MOET je vat_rate invullen (BTW-tarief van die specifieke regel: 0, 9 of 21).
- Bij twijfel over BTW-tarief per regel: kijk naar BTW-subtotalen op de factuur (vaak onderaan: "9% BTW: ... / 21% BTW: ...").

VAT BREAKDOWN:
- Vul vat_breakdown in met één entry per uniek BTW-tarief op de factuur.
- Som van vat_breakdown[].amount_excl moet gelijk zijn aan amount_excl_vat.

REKENKUNDIGE CHECK:
- amount_excl_vat + vat_amount = amount_incl_vat (controleer dit!)
- Bij gemengde tarieven: header vat_rate = het hoogste tarief, maar lees bedragen uit subtotalen op de factuur.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsErr } = await supabase.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub;

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: roles } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();

    if (!roles) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { file_path, file_base64, mime_type } = body as {
      file_path?: string;
      file_base64?: string;
      mime_type?: string;
    };

    let pdfBase64: string | null = null;
    let pdfMime = mime_type || "application/pdf";

    if (file_base64) {
      pdfBase64 = file_base64;
    } else if (file_path) {
      const { data, error } = await adminClient.storage
        .from("partner-invoices")
        .download(file_path);
      if (error || !data) {
        return new Response(
          JSON.stringify({ error: "Could not download file", details: error?.message }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      const buf = new Uint8Array(await data.arrayBuffer());
      let binary = "";
      const chunkSize = 0x8000;
      for (let i = 0; i < buf.length; i += chunkSize) {
        binary += String.fromCharCode.apply(
          null,
          Array.from(buf.subarray(i, i + chunkSize)),
        );
      }
      pdfBase64 = btoa(binary);
      pdfMime = data.type || "application/pdf";
    } else {
      return new Response(
        JSON.stringify({ error: "file_path or file_base64 required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              {
                type: "text",
                text:
                  "Analyseer deze inkoopfactuur en extracteer ALLE velden via de extract_invoice tool. Vul ALTIJD line_items in met vat_rate per regel.",
              },
              {
                type: "image_url",
                image_url: { url: `data:${pdfMime};base64,${pdfBase64}` },
              },
            ],
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_invoice",
              description: "Extracteer factuurgegevens incl. orderregels per BTW-tarief",
              parameters: {
                type: "object",
                properties: {
                  invoice_number: { type: ["string", "null"] },
                  invoice_date: { type: ["string", "null"], description: "YYYY-MM-DD" },
                  supplier_name: { type: ["string", "null"] },
                  amount_excl_vat: { type: ["number", "null"] },
                  vat_rate: { type: ["number", "null"], description: "0, 9 of 21 (hoofdtarief)" },
                  vat_amount: { type: ["number", "null"] },
                  amount_incl_vat: { type: ["number", "null"] },
                  description: { type: ["string", "null"] },
                  vat_breakdown: {
                    type: "array",
                    description: "Eén entry per uniek BTW-tarief op de factuur",
                    items: {
                      type: "object",
                      properties: {
                        vat_rate: { type: "number" },
                        amount_excl: { type: "number" },
                        vat_amount: { type: "number" },
                      },
                      required: ["vat_rate", "amount_excl", "vat_amount"],
                      additionalProperties: false,
                    },
                  },
                  line_items: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        description: { type: "string" },
                        quantity: { type: ["number", "null"] },
                        unit_price: { type: ["number", "null"] },
                        total_excl_vat: { type: ["number", "null"] },
                        vat_rate: { type: ["number", "null"], description: "BTW-tarief van deze regel: 0, 9 of 21" },
                      },
                      required: ["description", "vat_rate"],
                      additionalProperties: false,
                    },
                  },
                },
                required: [
                  "invoice_number",
                  "invoice_date",
                  "supplier_name",
                  "amount_excl_vat",
                  "vat_rate",
                  "vat_amount",
                  "amount_incl_vat",
                  "description",
                  "line_items",
                  "vat_breakdown",
                ],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "extract_invoice" } },
      }),
    });

    if (!aiResp.ok) {
      const text = await aiResp.text();
      console.error("AI gateway error:", aiResp.status, text);
      if (aiResp.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, probeer over enkele momenten." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResp.status === 402) {
        return new Response(JSON.stringify({ error: "AI-credits op. Voeg credits toe." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "AI scan failed", details: text }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiJson = await aiResp.json();
    const toolCall = aiJson.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      return new Response(
        JSON.stringify({ error: "AI returned no structured data", raw: aiJson }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    let extracted;
    try {
      extracted = JSON.parse(toolCall.function.arguments);
    } catch (e) {
      return new Response(
        JSON.stringify({ error: "Could not parse AI output", raw: toolCall.function.arguments }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(JSON.stringify({ data: extracted }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("scan-purchase-invoice error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
