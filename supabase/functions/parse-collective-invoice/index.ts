// Parse a collective supplier invoice (Doeksen / Isla Vlieland verzamelfactuur) and
// auto-match each line against existing program data.
// - Doeksen: match per Resnr → program_request_items.booking_reference
// - Isla:    match per regel → program_requests.customer_name (fuzzy)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT_DOEKSEN = `Je bent een specialist in het uitlezen van Nederlandse verzamelfacturen van veerdiensten (Rederij Doeksen).

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

const SYSTEM_PROMPT_ISLA = `Je bent een specialist in het uitlezen van Nederlandse verzamelfacturen van Isla Vlieland B.V. (bagagevervoer).

Lees ALLE pagina's en extracteer per factuurregel:
- customer_name (de klant / het bedrijf / de groep waarvoor de dienst is geleverd — bv "Stedelijk Gymnasium Haarlem", "Familie Jansen", etc.)
- delivery_date (datum van levering / dienst, YYYY-MM-DD; gebruik de regelspecifieke datum)
- description (korte beschrijving van wat er geleverd is, bv "Bagagevervoer retour 30 personen")
- amount_excl_vat, vat_amount, amount_incl_vat (NUMMERS, geen €, punt als decimaal)
- reference (optionele referentie/ordernummer als die op de regel staat)

Belangrijke regels:
- Eén regel = één boeking. Geen Resnr.
- Lege/sub-totaal regels NIET opnemen.
- Bedragen ALTIJD als getallen.
- Datums als YYYY-MM-DD.

EXTRACTIE FACTUURKOP:
- invoice_number, invoice_date (YYYY-MM-DD), supplier_name
- total_excl_vat, total_vat, total_incl_vat
- net_to_pay (totaal te betalen)`;

const DOEKSEN_TOOL = {
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
};

const ISLA_TOOL = {
  type: "function",
  function: {
    name: "extract_isla_invoice",
    description: "Extracteer Isla Vlieland verzamelfactuur met alle factuurregels",
    parameters: {
      type: "object",
      properties: {
        invoice_number: { type: "string" },
        invoice_date: { type: "string", description: "YYYY-MM-DD" },
        supplier_name: { type: "string" },
        total_excl_vat: { type: "number" },
        total_vat: { type: "number" },
        total_incl_vat: { type: "number" },
        net_to_pay: { type: "number" },
        lines: {
          type: "array",
          items: {
            type: "object",
            properties: {
              customer_name: { type: "string" },
              delivery_date: { type: ["string", "null"] },
              description: { type: "string" },
              reference: { type: ["string", "null"] },
              amount_excl_vat: { type: "number" },
              vat_amount: { type: "number" },
              amount_incl_vat: { type: "number" },
            },
            required: [
              "customer_name", "description",
              "amount_excl_vat", "vat_amount", "amount_incl_vat",
            ],
            additionalProperties: false,
          },
        },
      },
      required: [
        "invoice_number", "invoice_date", "supplier_name",
        "total_excl_vat", "total_vat", "total_incl_vat",
        "net_to_pay", "lines",
      ],
      additionalProperties: false,
    },
  },
};

function detectSupplierType(hint: string | null | undefined, scanSupplier: string | null | undefined): "doeksen" | "isla" {
  const text = `${hint || ""} ${scanSupplier || ""}`.toLowerCase();
  if (/isla|bagage/.test(text)) return "isla";
  return "doeksen";
}

// Lightweight name normalisation + token-overlap similarity for fuzzy matching
function normalizeName(s: string): string {
  return (s || "")
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/\b(b\.?v\.?|n\.?v\.?|stichting|vereniging|familie|fam\.?|de|het|van|der|den|the)\b/g, " ")
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function nameSimilarity(a: string, b: string): number {
  const na = normalizeName(a);
  const nb = normalizeName(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  if (na.includes(nb) || nb.includes(na)) return 0.9;
  const ta = new Set(na.split(" ").filter((t) => t.length >= 2));
  const tb = new Set(nb.split(" ").filter((t) => t.length >= 2));
  if (ta.size === 0 || tb.size === 0) return 0;
  let overlap = 0;
  for (const t of ta) if (tb.has(t)) overlap++;
  return overlap / Math.max(ta.size, tb.size);
}

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

    const { inbox_id, supplier_type: supplierHint } = await req.json();
    if (!inbox_id) return jsonResp({ error: "inbox_id required" }, 400);

    const { data: inbox, error: inboxErr } = await adminClient
      .from("purchase_invoice_inbox")
      .select("*")
      .eq("id", inbox_id)
      .single();
    if (inboxErr || !inbox?.attachment_path) {
      return jsonResp({ error: "Inbox item or attachment not found" }, 404);
    }

    const supplierType = detectSupplierType(supplierHint, (inbox.scan_result as any)?.supplier_name);

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

    const systemPrompt = supplierType === "isla" ? SYSTEM_PROMPT_ISLA : SYSTEM_PROMPT_DOEKSEN;
    const tool = supplierType === "isla" ? ISLA_TOOL : DOEKSEN_TOOL;
    const userText = supplierType === "isla"
      ? "Extracteer de Isla Vlieland verzamelfactuur volledig via extract_isla_invoice."
      : "Extracteer de verzamelfactuur volledig via extract_collective_invoice.";

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              { type: "text", text: userText },
              { type: "image_url", image_url: { url: `data:${pdfMime};base64,${pdfBase64}` } },
            ],
          },
        ],
        tools: [tool],
        tool_choice: { type: "function", function: { name: tool.function.name } },
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

    if (supplierType === "doeksen") {
      const proposal = await matchDoeksen(adminClient, extracted);
      return jsonResp({
        supplier_type: "doeksen",
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
    } else {
      const proposal = await matchIsla(adminClient, extracted);
      return jsonResp({
        supplier_type: "isla",
        invoice: {
          invoice_number: extracted.invoice_number,
          invoice_date: extracted.invoice_date,
          supplier_name: extracted.supplier_name,
          total_excl_vat: extracted.total_excl_vat,
          total_vat: extracted.total_vat,
          total_incl_vat: extracted.total_incl_vat,
          total_tourist_tax: 0,
          total_supplier_commission: 0,
          net_to_pay: extracted.net_to_pay,
        },
        bookings: proposal,
      });
    }
  } catch (err) {
    console.error("parse-collective-invoice error:", err);
    return jsonResp({ error: err instanceof Error ? err.message : "Unknown error" }, 500);
  }
});

async function matchDoeksen(adminClient: any, extracted: any) {
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

  return extracted.bookings.map((b: any) => {
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
      candidates: matches.map((m: any) => ({
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
      suggested_projects: [],
    };
  });
}

async function matchIsla(adminClient: any, extracted: any) {
  // Fetch projects in a generous window around the invoice date.
  const invDate = extracted.invoice_date ? new Date(extracted.invoice_date) : new Date();
  const from = new Date(invDate); from.setDate(from.getDate() - 120);
  const to = new Date(invDate); to.setDate(to.getDate() + 60);
  const fromStr = from.toISOString().slice(0, 10);
  const toStr = to.toISOString().slice(0, 10);

  const { data: projects } = await adminClient
    .from("program_requests")
    .select("id, reference_number, customer_name, customer_company, selected_dates, status")
    .not("status", "in", "(cancelled,deleted)")
    .gte("created_at", new Date(from.getTime() - 1000 * 60 * 60 * 24 * 365).toISOString())
    .limit(2000);

  const projectList = (projects || []).filter((p: any) => {
    const dates: string[] = Array.isArray(p.selected_dates) ? p.selected_dates : [];
    if (dates.length === 0) return true; // include open projects too
    return dates.some((d: string) => d >= fromStr && d <= toStr);
  });

  const lines: any[] = Array.isArray(extracted.lines) ? extracted.lines : [];

  return lines.map((line: any, idx: number) => {
    const customer = line.customer_name || "";
    // Score all projects on name similarity
    const scored = projectList
      .map((p: any) => {
        const candName = p.customer_company || p.customer_name || "";
        const sim = Math.max(
          nameSimilarity(customer, candName),
          p.customer_name ? nameSimilarity(customer, p.customer_name) : 0,
        );
        return { p, sim };
      })
      .filter((x: any) => x.sim >= 0.6)
      .sort((a: any, b: any) => b.sim - a.sim)
      .slice(0, 5);

    const isInternal = /bureau\s*vlieland/i.test(customer);

    let match_status: string;
    let project: any = null;
    const candidates: any[] = scored.map((s: any) => ({
      item_id: `project:${s.p.id}`, // placeholder, not used to update items
      request_id: s.p.id,
      reference_number: s.p.reference_number,
      customer_label: s.p.customer_company || s.p.customer_name,
      block_name: line.description || "Bagagevervoer",
    }));

    const suggested_projects = scored.map((s: any) => ({
      request_id: s.p.id,
      reference_number: s.p.reference_number,
      customer_label: s.p.customer_company || s.p.customer_name,
      similarity: s.sim,
    }));

    if (isInternal) {
      match_status = "internal";
    } else if (scored.length >= 1) {
      // Always require explicit admin confirmation (booking as extra cost)
      match_status = scored.length === 1 ? "ambiguous" : "ambiguous";
      project = null;
    } else {
      match_status = "unmatched";
    }

    return {
      resnr: `${extracted.invoice_number || "REG"}-${idx + 1}`,
      customer_name: customer,
      departure_dates: line.delivery_date ? [line.delivery_date] : [],
      routes: [],
      reference: line.reference || null,
      description: line.description || "",
      amount_excl_vat: line.amount_excl_vat || 0,
      vat_amount: line.vat_amount || 0,
      amount_incl_vat: line.amount_incl_vat || 0,
      tourist_tax: 0,
      supplier_commission: 0,
      match_status,
      item_id: null,
      candidates,
      project,
      suggested_projects,
    };
  });
}

function jsonResp(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
