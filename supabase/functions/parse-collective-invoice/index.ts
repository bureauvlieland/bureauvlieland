// Parse a collective supplier invoice (Doeksen verzamelfactuur) and
// auto-match each line against existing program_request_items via booking_reference.
// Returns a dry-run proposal — does NOT write to partner_purchase_invoices.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `Je bent een specialist in het uitlezen van Nederlandse verzamelfacturen van veerdiensten (Rederij Doeksen).

Lees ALLE pagina's en extracteer per boekingsregel:
- resnr (boekingsreferentie, numeriek string, bv "12777224")
- customer_name (de "Naam"-kolom, bv "Stedelijk Gymnasium Haarlem (SGH)")
- departure_dates (array van datums voor deze Resnr — bij heen+terug zijn er twee datums; YYYY-MM-DD)
- routes (array, parallel aan departure_dates: "HV" of "VH")
- reference (optionele klantreferentie, kolom "Referentie")
- amount_excl_vat, vat_amount, amount_incl_vat (NUMMERS, geen €, punt als decimaal)
- tourist_tax (kolom "TB" — toeristenbelasting, 0% btw)
- supplier_commission (kolom "Commissie" — bedrag dat de leverancier aan ons als reisagent geeft)

Belangrijke regels:
- Eén Resnr kan twee regels beslaan (heen + terug) — combineer die tot ÉÉN boeking met twee datums. Bedragen staan alleen op de eerste regel.
- Lege regels (alleen datum/route, geen resnr) NIET als losse boeking opnemen.
- Bedragen ALTIJD als getallen.
- Datums als YYYY-MM-DD.

EXTRACTIE FACTUURKOP:
- invoice_number, invoice_date (YYYY-MM-DD), supplier_name
- total_excl_vat, total_vat, total_incl_vat (uit de "Te betalen" regel of BTW-specificatie)
- total_tourist_tax, total_supplier_commission (sommen onderaan)
- net_to_pay (kolom "Netto bedrag" totaal — wat wij daadwerkelijk overmaken)`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return jsonResp({ error: "Unauthorized" }, 401);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData?.user) return jsonResp({ error: "Unauthorized" }, 401);

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: role } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!role) return jsonResp({ error: "Forbidden" }, 403);

    const { inbox_id } = await req.json();
    if (!inbox_id) return jsonResp({ error: "inbox_id required" }, 400);

    const { data: inbox, error: inboxErr } = await adminClient
      .from("purchase_invoice_inbox")
      .select("*")
      .eq("id", inbox_id)
      .single();
    if (inboxErr || !inbox?.attachment_path) {
      return jsonResp({ error: "Inbox item or attachment not found" }, 404);
    }

    // Download PDF
    const { data: fileData, error: dlErr } = await adminClient.storage
      .from("partner-invoices")
      .download(inbox.attachment_path);
    if (dlErr || !fileData) return jsonResp({ error: "Could not download PDF" }, 500);

    const buf = new Uint8Array(await fileData.arrayBuffer());
    let binary = "";
    const chunk = 0x8000;
    for (let i = 0; i < buf.length; i += chunk) {
      binary += String.fromCharCode.apply(null, Array.from(buf.subarray(i, i + chunk)));
    }
    const pdfBase64 = btoa(binary);
    const pdfMime = fileData.type || "application/pdf";

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return jsonResp({ error: "LOVABLE_API_KEY missing" }, 500);

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
              { type: "text", text: "Extracteer de verzamelfactuur volledig via extract_collective_invoice." },
              { type: "image_url", image_url: { url: `data:${pdfMime};base64,${pdfBase64}` } },
            ],
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_collective_invoice",
              description: "Extracteer Doeksen-verzamelfactuur met alle boekingsregels",
              parameters: {
                type: "object",
                properties: {
                  invoice_number: { type: "string" },
                  invoice_date: { type: "string", description: "YYYY-MM-DD" },
                  supplier_name: { type: "string" },
                  total_excl_vat: { type: "number" },
                  total_vat: { type: "number" },
                  total_incl_vat: { type: "number" },
                  total_tourist_tax: { type: "number" },
                  total_supplier_commission: { type: "number" },
                  net_to_pay: { type: "number" },
                  bookings: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        resnr: { type: "string" },
                        customer_name: { type: "string" },
                        departure_dates: { type: "array", items: { type: "string" } },
                        routes: { type: "array", items: { type: "string" } },
                        reference: { type: ["string", "null"] },
                        amount_excl_vat: { type: "number" },
                        vat_amount: { type: "number" },
                        amount_incl_vat: { type: "number" },
                        tourist_tax: { type: "number" },
                        supplier_commission: { type: "number" },
                      },
                      required: [
                        "resnr", "customer_name", "departure_dates", "routes",
                        "amount_excl_vat", "vat_amount", "amount_incl_vat",
                        "tourist_tax", "supplier_commission",
                      ],
                      additionalProperties: false,
                    },
                  },
                },
                required: [
                  "invoice_number", "invoice_date", "supplier_name",
                  "total_excl_vat", "total_vat", "total_incl_vat",
                  "total_tourist_tax", "total_supplier_commission", "net_to_pay",
                  "bookings",
                ],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "extract_collective_invoice" } },
      }),
    });

    if (!aiResp.ok) {
      const t = await aiResp.text();
      console.error("AI gateway error:", aiResp.status, t);
      if (aiResp.status === 429) return jsonResp({ error: "Rate limited" }, 429);
      if (aiResp.status === 402) return jsonResp({ error: "AI-credits op" }, 402);
      return jsonResp({ error: "AI scan failed", details: t }, 500);
    }

    const aiJson = await aiResp.json();
    const toolCall = aiJson.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      return jsonResp({ error: "AI returned no structured data" }, 500);
    }
    const extracted = JSON.parse(toolCall.function.arguments);

    // Match each booking against program_request_items via booking_reference
    const allResnrs = extracted.bookings.map((b: any) => b.resnr);

    const { data: ticketRows } = await adminClient
      .from("program_request_items")
      .select(`
        id, request_id, booking_reference, block_id, day_index, block_name,
        program_requests!inner(id, reference_number, customer_name, customer_company, selected_dates)
      `)
      .in("booking_reference", allResnrs);

    const ticketsByRef = new Map<string, any[]>();
    for (const r of ticketRows || []) {
      const ref = String(r.booking_reference);
      if (!ticketsByRef.has(ref)) ticketsByRef.set(ref, []);
      ticketsByRef.get(ref)!.push(r);
    }

    const proposal = extracted.bookings.map((b: any) => {
      const matches = ticketsByRef.get(String(b.resnr)) || [];
      const isInternal = /bureau\s*vlieland/i.test(b.customer_name);

      let match_status: string;
      let item_id: string | null = null;
      let item: any = null;

      if (isInternal) {
        match_status = "internal";
      } else if (matches.length === 1) {
        match_status = "matched";
        item_id = matches[0].id;
        item = matches[0];
      } else if (matches.length > 1) {
        match_status = "ambiguous";
      } else {
        match_status = "unmatched";
      }

      return {
        ...b,
        match_status,
        item_id,
        candidates: matches.map((m) => ({
          item_id: m.id,
          request_id: m.request_id,
          reference_number: m.program_requests?.reference_number,
          customer_label: m.program_requests?.customer_company || m.program_requests?.customer_name,
          block_name: m.block_name,
        })),
        project: item ? {
          request_id: item.request_id,
          reference_number: item.program_requests?.reference_number,
          customer_label: item.program_requests?.customer_company || item.program_requests?.customer_name,
        } : null,
      };
    });

    return jsonResp({
      invoice: {
        invoice_number: extracted.invoice_number,
        invoice_date: extracted.invoice_date,
        supplier_name: extracted.supplier_name,
        total_excl_vat: extracted.total_excl_vat,
        total_vat: extracted.total_vat,
        total_incl_vat: extracted.total_incl_vat,
        total_tourist_tax: extracted.total_tourist_tax,
        total_supplier_commission: extracted.total_supplier_commission,
        net_to_pay: extracted.net_to_pay,
      },
      bookings: proposal,
    });
  } catch (err) {
    console.error("parse-collective-invoice error:", err);
    return jsonResp({ error: err instanceof Error ? err.message : "Unknown error" }, 500);
  }
});

function jsonResp(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
