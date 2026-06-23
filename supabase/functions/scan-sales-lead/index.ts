// Scan a sales inbox lead with Lovable AI Gateway and store the structured result.
// Triggered by inbound-email after a new sales_inbox row is created; can also be
// called from the admin UI to rescan.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `Je bent een specialist die binnenkomende sales-aanvragen voor Bureau Vlieland analyseert.
Bureau Vlieland organiseert bedrijfsuitjes, groepsreizen en arrangementen op Vlieland.

Lees de e-mail en eventuele bijgevoegde tekst en extracteer gestructureerd via de tool 'extract_lead'.

Regels:
- customer_name: contactpersoon (voor- en achternaam) van de aanvrager.
- customer_email/phone: hoofdcontactgegevens; gebruik null als niet aanwezig.
- customer_company: bedrijfsnaam of organisatie, indien genoemd.
- number_of_people: getal (integer) als aantal personen genoemd wordt; anders null.
- preferred_dates: array van strings met datum(s) of periode(s) zoals genoemd ("15-16 mei 2025", "weekend juni", etc.); leeg als onbekend.
- program_type: korte beschrijving van het type uitje/programma ("teamuitje", "familieweekend", "vergadering + uitje", etc.) of null.
- wishes: vrije tekst met wensen/details (activiteiten, overnachting, catering, doel van het uitje). Vat samen, max 500 tekens.
- budget_indication: budget zoals genoemd (string, met of zonder valuta), of null.
- source: hoe heeft de klant ons gevonden, indien expliciet genoemd ("google", "doorverwezen", etc.) of null.
- confidence: getal 0-1 hoe zeker je bent dat dit een echte aanvraag is (vs spam/nieuwsbrief/onduidelijk).

Als de mail GEEN sales-aanvraag is (spam, nieuwsbrief, automatische reply), zet confidence laag (<0.3) en vul alleen wat duidelijk is.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const auth = req.headers.get("Authorization") || "";
    const token = auth.replace(/^Bearer\s+/i, "");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;

    let authorized = token && token === serviceKey;

    if (!authorized && token) {
      // Validate as user JWT and require admin role
      const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY") ?? serviceKey, {
        global: { headers: { Authorization: `Bearer ${token}` } },
      });
      const { data: userData } = await userClient.auth.getUser();
      const uid = userData?.user?.id;
      if (uid) {
        const adminClient = createClient(supabaseUrl, serviceKey);
        const { data: isAdmin } = await adminClient.rpc("has_role", {
          _user_id: uid,
          _role: "admin",
        });
        if (isAdmin === true) authorized = true;
      }
    }

    if (!authorized) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { inbox_id } = await req.json();
    if (!inbox_id) {
      return new Response(JSON.stringify({ error: "inbox_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    await supabase
      .from("sales_inbox")
      .update({ scan_status: "scanning", scan_error: null })
      .eq("id", inbox_id);

    const { data: inbox, error: loadErr } = await supabase
      .from("sales_inbox")
      .select("from_email, from_name, subject, body_text, body_html")
      .eq("id", inbox_id)
      .single();

    if (loadErr || !inbox) {
      return new Response(JSON.stringify({ error: "inbox row not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      await supabase
        .from("sales_inbox")
        .update({ scan_status: "failed", scan_error: "LOVABLE_API_KEY not set" })
        .eq("id", inbox_id);
      return new Response(JSON.stringify({ error: "No AI key" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userPrompt = [
      `Afzender: ${inbox.from_name || ""} <${inbox.from_email}>`,
      `Onderwerp: ${inbox.subject || "(geen onderwerp)"}`,
      "",
      "--- E-MAIL INHOUD ---",
      inbox.body_text || "(geen tekst-inhoud — alleen HTML beschikbaar)",
    ].join("\n");

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Lovable-API-Key": LOVABLE_API_KEY,
        "Content-Type": "application/json",
        "X-Lovable-AIG-SDK": "vercel-ai-sdk",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "extract_lead",
            description: "Extract structured sales lead data from the inbound email.",
            parameters: {
              type: "object",
              properties: {
                customer_name: { type: ["string", "null"] },
                customer_email: { type: ["string", "null"] },
                customer_phone: { type: ["string", "null"] },
                customer_company: { type: ["string", "null"] },
                number_of_people: { type: ["integer", "null"] },
                preferred_dates: { type: "array", items: { type: "string" } },
                program_type: { type: ["string", "null"] },
                wishes: { type: ["string", "null"] },
                budget_indication: { type: ["string", "null"] },
                source: { type: ["string", "null"] },
                confidence: { type: "number" },
              },
              required: ["customer_name", "customer_email", "preferred_dates", "wishes", "confidence"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "extract_lead" } },
      }),
    });

    if (!aiResp.ok) {
      const errText = await aiResp.text().catch(() => "");
      const msg = `AI gateway ${aiResp.status}: ${errText.substring(0, 500)}`;
      await supabase
        .from("sales_inbox")
        .update({ scan_status: "failed", scan_error: msg })
        .eq("id", inbox_id);
      return new Response(JSON.stringify({ error: msg }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiJson = await aiResp.json();
    const toolCall = aiJson?.choices?.[0]?.message?.tool_calls?.[0];
    const rawArgs = toolCall?.function?.arguments;
    let parsed: Record<string, unknown> | null = null;
    try {
      parsed = typeof rawArgs === "string" ? JSON.parse(rawArgs) : rawArgs ?? null;
    } catch (e) {
      console.error("Could not parse tool args:", e, rawArgs);
    }

    if (!parsed) {
      await supabase
        .from("sales_inbox")
        .update({ scan_status: "failed", scan_error: "Geen gestructureerd antwoord van AI" })
        .eq("id", inbox_id);
      return new Response(JSON.stringify({ error: "No structured result" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fallback: if AI didn't find an email, use the sender's email
    if (!parsed.customer_email && inbox.from_email && inbox.from_email !== "unknown") {
      parsed.customer_email = inbox.from_email;
    }
    if (!parsed.customer_name && inbox.from_name) {
      parsed.customer_name = inbox.from_name;
    }

    await supabase
      .from("sales_inbox")
      .update({
        scan_status: "scanned",
        scan_result: parsed,
        scan_error: null,
      })
      .eq("id", inbox_id);

    return new Response(
      JSON.stringify({ status: "ok", data: parsed }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("scan-sales-lead error:", err);
    return new Response(
      JSON.stringify({ status: "error", message: err instanceof Error ? err.message : "Unknown" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
