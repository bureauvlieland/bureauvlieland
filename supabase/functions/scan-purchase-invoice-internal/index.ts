// Internal scan function called by inbound-purchase-invoice (no admin auth — service-role only)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `Je bent een specialist in het analyseren van Nederlandse inkoopfacturen. Lees ALLE pagina's van de PDF zorgvuldig.

Extracteer gestructureerde data via de tool 'extract_invoice'. Belangrijke regels:
- Bedragen ALTIJD als getallen (geen €/EUR, geen duizendscheidingstekens, punt als decimaal).
- Datums in formaat YYYY-MM-DD.
- BTW-percentage als getal (0, 9 of 21 — geen %-teken).
- supplier_name = de leverancier/afzender (NIET de geadresseerde "Bureau Vlieland").
- Als een veld niet zichtbaar is, gebruik null.

VAT BREAKDOWN (KRITIEK):
- Vrijwel elke factuur toont onderaan een BTW-overzicht/grondslag-tabel met de subtotalen per tarief (bv. "9% over 871,56 = 78,44" en "21% over 231,40 = 48,60"). Lees dit overzicht ZORGVULDIG.
- Vul vat_breakdown ALTIJD in met één entry per uniek BTW-tarief dat op de factuur voorkomt (sla 0%-regels met bedrag 0 over).
- Som van vat_breakdown[].amount_excl MOET gelijk zijn aan amount_excl_vat (header).
- Som van vat_breakdown[].vat_amount MOET gelijk zijn aan vat_amount (header).
- BIJ GEMENGDE TARIEVEN (meerdere entries in vat_breakdown): zet header-veld vat_rate op null. NOOIT één tarief verzinnen.
- Bij één enkel tarief mag header vat_rate gelijk zijn aan dat tarief.

ORDERREGELS:
- Vul line_items in met ALLE zichtbare regels van de factuur, indien herkenbaar.
- Per regel MOET je vat_rate invullen (BTW-tarief van die specifieke regel: 0, 9 of 21).
- Als regel-tarieven niet duidelijk te lezen zijn maar er WEL een BTW-overzicht is, mag line_items leeg blijven — vat_breakdown is dan leidend.

REKENKUNDIGE CHECK: amount_excl_vat + vat_amount = amount_incl_vat.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const auth = req.headers.get("Authorization") || "";
    const expected = `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`;
    if (auth !== expected) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { inbox_id, file_path } = await req.json();
    if (!inbox_id || !file_path) {
      return new Response(JSON.stringify({ error: "inbox_id and file_path required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    await supabase
      .from("purchase_invoice_inbox")
      .update({ scan_status: "scanning" })
      .eq("id", inbox_id);

    const { data: file, error: dlErr } = await supabase.storage
      .from("partner-invoices")
      .download(file_path);

    if (dlErr || !file) {
      await supabase
        .from("purchase_invoice_inbox")
        .update({ scan_status: "failed", scan_error: dlErr?.message || "Download failed" })
        .eq("id", inbox_id);
      return new Response(JSON.stringify({ error: "Could not download" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const buf = new Uint8Array(await file.arrayBuffer());
    let binary = "";
    const chunkSize = 0x8000;
    for (let i = 0; i < buf.length; i += chunkSize) {
      binary += String.fromCharCode.apply(null, Array.from(buf.subarray(i, i + chunkSize)));
    }
    const pdfBase64 = btoa(binary);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      await supabase
        .from("purchase_invoice_inbox")
        .update({ scan_status: "failed", scan_error: "LOVABLE_API_KEY not set" })
        .eq("id", inbox_id);
      return new Response(JSON.stringify({ error: "No AI key" }), {
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
              { type: "text", text: "Analyseer deze inkoopfactuur via de extract_invoice tool. Vul ALTIJD line_items in met vat_rate per regel." },
              { type: "image_url", image_url: { url: `data:application/pdf;base64,${pdfBase64}` } },
            ],
          },
        ],
        tools: [{
          type: "function",
          function: {
            name: "extract_invoice",
            description: "Extracteer factuurgegevens incl. orderregels per BTW-tarief",
            parameters: {
              type: "object",
              properties: {
                invoice_number: { type: ["string", "null"] },
                invoice_date: { type: ["string", "null"] },
                supplier_name: { type: ["string", "null"] },
                amount_excl_vat: { type: ["number", "null"] },
                vat_rate: { type: ["number", "null"] },
                vat_amount: { type: ["number", "null"] },
                amount_incl_vat: { type: ["number", "null"] },
                description: { type: ["string", "null"] },
                vat_breakdown: {
                  type: "array",
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
                      vat_rate: { type: ["number", "null"] },
                    },
                    required: ["description", "vat_rate"],
                    additionalProperties: false,
                  },
                },
              },
              required: [
                "invoice_number", "invoice_date", "supplier_name",
                "amount_excl_vat", "vat_rate", "vat_amount", "amount_incl_vat",
                "description", "line_items", "vat_breakdown",
              ],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "extract_invoice" } },
      }),
    });

    if (!aiResp.ok) {
      const text = await aiResp.text();
      await supabase
        .from("purchase_invoice_inbox")
        .update({ scan_status: "failed", scan_error: `AI ${aiResp.status}: ${text.substring(0, 500)}` })
        .eq("id", inbox_id);
      return new Response(JSON.stringify({ error: "AI failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiJson = await aiResp.json();
    const toolCall = aiJson.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      await supabase
        .from("purchase_invoice_inbox")
        .update({ scan_status: "failed", scan_error: "No structured AI output" })
        .eq("id", inbox_id);
      return new Response(JSON.stringify({ error: "No structured output" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const extracted = JSON.parse(toolCall.function.arguments);
    await supabase
      .from("purchase_invoice_inbox")
      .update({ scan_status: "scanned", scan_result: extracted })
      .eq("id", inbox_id);

    return new Response(JSON.stringify({ status: "ok", data: extracted }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("scan-purchase-invoice-internal error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Unknown" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
