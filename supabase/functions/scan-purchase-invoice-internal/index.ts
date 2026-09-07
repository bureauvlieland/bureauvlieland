// Internal scan function called by inbound-purchase-invoice (no admin auth — service-role only)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import {
  INVOICE_SCAN_SYSTEM_PROMPT,
  INVOICE_SCAN_TOOL,
  INVOICE_SCAN_USER_INSTRUCTION,
  normalizeScannedInvoice,
} from "../_shared/purchaseInvoiceScan.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

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
          { role: "system", content: INVOICE_SCAN_SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              { type: "text", text: INVOICE_SCAN_USER_INSTRUCTION },
              { type: "image_url", image_url: { url: `data:application/pdf;base64,${pdfBase64}` } },
            ],
          },
        ],
        tools: [INVOICE_SCAN_TOOL],
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
    // Regelprijzen die inclusief btw zijn omrekenen naar exclusief. Dit gebeurde
    // alleen op de uploadroute, waardoor een horecabon via de inbox een te hoge
    // grondslag kreeg.
    normalizeScannedInvoice(extracted);

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
