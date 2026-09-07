import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import {
  INVOICE_SCAN_SYSTEM_PROMPT,
  INVOICE_SCAN_TOOL,
  INVOICE_SCAN_USER_INSTRUCTION,
  normalizeScannedInvoice,
} from "../_shared/purchaseInvoiceScan.ts";
import { aiChatCompletions, aiConfigured, AI_NOT_CONFIGURED_MESSAGE } from "../_shared/ai.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = userData.user.id;

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

    if (!aiConfigured()) {
      return new Response(JSON.stringify({ error: AI_NOT_CONFIGURED_MESSAGE }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiResp = await aiChatCompletions({
      model: "google/gemini-2.5-pro",
      messages: [
        { role: "system", content: INVOICE_SCAN_SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            { type: "text", text: INVOICE_SCAN_USER_INSTRUCTION },
            {
              type: "image_url",
              image_url: { url: `data:${pdfMime};base64,${pdfBase64}` },
            },
          ],
        },
      ],
      tools: [INVOICE_SCAN_TOOL],
      tool_choice: { type: "function", function: { name: "extract_invoice" } },
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

    // Regelprijzen die inclusief btw zijn omrekenen naar exclusief; het scherm
    // rekent verderop met exclusieve prijzen.
    normalizeScannedInvoice(extracted);

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
