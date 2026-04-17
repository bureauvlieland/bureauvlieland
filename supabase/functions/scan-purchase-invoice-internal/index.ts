// Internal scan function called by inbound-purchase-invoice (no admin auth — service-role only)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `Je bent een specialist in het analyseren van Nederlandse inkoopfacturen.
Extracteer gestructureerde data uit de bijgeleverde PDF en gebruik altijd de tool 'extract_invoice'.
- Bedragen altijd als getallen (geen valuta-symbolen, geen duizendscheidingstekens, punt als decimaal).
- Datums in formaat YYYY-MM-DD.
- BTW-percentage als getal (9 of 21, geen %-teken).
- Als een veld niet zichtbaar is, gebruik null.
- supplier_name = de leverancier/afzender (NIET de geadresseerde "Bureau Vlieland").`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Service-role auth only (called from inbound-purchase-invoice)
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

    // Download PDF from storage
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
              { type: "text", text: "Analyseer deze inkoopfactuur via de extract_invoice tool." },
              { type: "image_url", image_url: { url: `data:application/pdf;base64,${pdfBase64}` } },
            ],
          },
        ],
        tools: [{
          type: "function",
          function: {
            name: "extract_invoice",
            description: "Extracteer factuurgegevens",
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
                line_items: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      description: { type: "string" },
                      quantity: { type: ["number", "null"] },
                      unit_price: { type: ["number", "null"] },
                      total_excl_vat: { type: ["number", "null"] },
                    },
                    required: ["description"],
                    additionalProperties: false,
                  },
                },
              },
              required: [
                "invoice_number", "invoice_date", "supplier_name",
                "amount_excl_vat", "vat_rate", "vat_amount", "amount_incl_vat",
                "description", "line_items",
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
