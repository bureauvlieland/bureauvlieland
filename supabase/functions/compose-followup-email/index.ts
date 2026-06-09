import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * AI follow-up email composer (Round 2).
 * Genereert subject + body voor een opvolg-mail op basis van:
 *  - projectstatus en kerngegevens (program_request of accommodation_request)
 *  - reeds verzonden mails (laatste 10) uit email_log
 *  - optionele admin-instructie
 *
 * Tone: formeel 'u', warm, beknopt, geen verzonnen prijzen/data/partners.
 * Alleen admins. Gebruikt Lovable AI Gateway (LOVABLE_API_KEY).
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableKey) {
      return json({ error: "LOVABLE_API_KEY ontbreekt" }, 500);
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Niet geautoriseerd" }, 401);

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsErr } = await userClient.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims?.sub) return json({ error: "Niet geautoriseerd" }, 401);

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", claimsData.claims.sub)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleData) return json({ error: "Geen admin rechten" }, 403);

    const body = await req.json().catch(() => ({}));
    const {
      requestId,
      accommodationId,
      recipientEmail,
      recipientName,
      instruction, // optioneel: extra sturing van admin
    } = body ?? {};

    if (!requestId && !accommodationId) {
      return json({ error: "requestId of accommodationId verplicht" }, 400);
    }

    // --- Verzamel projectcontext ---
    const ctx: Record<string, unknown> = {};
    let portalUrl = "";
    let contactFirstName = "heer/mevrouw";
    let referenceNumber = "";

    if (requestId) {
      const { data: pr } = await supabase
        .from("program_requests")
        .select(
          "reference_number, status, customer_name, customer_company, customer_email, number_of_people, selected_dates, customer_token, created_at, quote_sent_at, customer_approved_at, customer_accepted_at, admin_notes",
        )
        .eq("id", requestId)
        .maybeSingle();
      if (pr) {
        contactFirstName = (pr.customer_name || "").trim().split(/\s+/)[0] || "heer/mevrouw";
        referenceNumber = pr.reference_number || "";
        portalUrl = `https://bureauvlieland.nl/mijn-programma/${pr.customer_token}`;
        ctx.project = {
          type: "programma",
          referentie: pr.reference_number,
          status: pr.status,
          contactpersoon: pr.customer_name,
          bedrijf: pr.customer_company,
          aantal_personen: pr.number_of_people,
          datums: pr.selected_dates,
          aanvraag_op: pr.created_at,
          offerte_verstuurd_op: pr.quote_sent_at,
          klant_akkoord_op: pr.customer_approved_at,
          klant_ondertekend_op: pr.customer_accepted_at,
          admin_notitie: pr.admin_notes,
        };
      }
    }

    if (accommodationId) {
      const { data: ar } = await supabase
        .from("accommodation_requests")
        .select(
          "reference_number, status, customer_name, customer_company, customer_email, number_of_guests, arrival_date, departure_date, customer_token, created_at",
        )
        .eq("id", accommodationId)
        .maybeSingle();
      if (ar) {
        contactFirstName = (ar.customer_name || "").trim().split(/\s+/)[0] || "heer/mevrouw";
        referenceNumber = ar.reference_number || referenceNumber;
        portalUrl = portalUrl || `https://bureauvlieland.nl/mijn-logies/${ar.customer_token}`;
        ctx.lodging = {
          referentie: ar.reference_number,
          status: ar.status,
          contactpersoon: ar.customer_name,
          bedrijf: ar.customer_company,
          aantal_gasten: ar.number_of_guests,
          aankomst: ar.arrival_date,
          vertrek: ar.departure_date,
          aanvraag_op: ar.created_at,
        };
      }
    }

    // --- Reeds verzonden mails ---
    let logQuery = supabase
      .from("email_log")
      .select("subject, email_type, sent_at, created_at, recipient_email, status")
      .order("created_at", { ascending: false })
      .limit(10);
    if (requestId) logQuery = logQuery.eq("related_request_id", requestId);
    else if (accommodationId) logQuery = logQuery.eq("related_accommodation_id", accommodationId);
    const { data: logs = [] } = await logQuery;

    ctx.recente_mails = (logs ?? []).map((l) => ({
      onderwerp: l.subject,
      type: l.email_type,
      verstuurd: l.sent_at || l.created_at,
      naar: l.recipient_email,
      status: l.status,
    }));

    // --- Bouw prompt ---
    const system = `Je bent een ervaren accountmanager bij Bureau Vlieland, een lokale reisspecialist op Vlieland.
Je schrijft warme, korte opvolg-mails aan zakelijke klanten in formeel Nederlands ('u'-vorm).
Regels:
- Altijd 'u/uw', nooit 'jij/jouw'.
- Max ~180 woorden in het body.
- Verzin nooit prijzen, data, aantallen, partners of toezeggingen die niet in de context staan.
- Verwijs naar de klantpagina via de placeholder {{portal_url}} wanneer relevant (gebruik exact die placeholder, geen verzonnen URL).
- Sluit af met "Met vriendelijke groet,\\nBureau Vlieland".
- Geef GEEN markdown-opmaak, GEEN HTML, alleen platte tekst met regeleinden.
- Begin met "Beste ${contactFirstName},".
- Geen onderwerpregel in de body.
- Stem de inhoud af op de status en wat al verstuurd is — herhaal geen mail die net is verzonden.
Output: STRICT JSON met velden {"subject": string, "body": string}. Geen extra tekst, geen code-fences.`;

    const user = `CONTEXT (JSON):\n${JSON.stringify(ctx, null, 2)}\n\n` +
      `ONTVANGER: ${recipientName || ""} <${recipientEmail || ""}>\n` +
      (referenceNumber ? `REFERENTIE: ${referenceNumber}\n` : "") +
      (portalUrl ? `PORTAL URL: ${portalUrl} (gebruik {{portal_url}} als placeholder in de mail)\n` : "") +
      (instruction ? `\nINSTRUCTIE VAN ADMIN: ${instruction}\n` : "") +
      `\nSchrijf nu een passende opvolg-mail. Output uitsluitend JSON {"subject","body"}.`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${lovableKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (aiRes.status === 429) return json({ error: "AI-limiet bereikt — probeer het zo opnieuw." }, 429);
    if (aiRes.status === 402) return json({ error: "AI-credits op. Voeg credits toe in Workspace → Usage." }, 402);
    if (!aiRes.ok) {
      const t = await aiRes.text();
      console.error("AI gateway error", aiRes.status, t);
      return json({ error: "AI-suggestie mislukt" }, 500);
    }

    const aiData = await aiRes.json();
    const content: string = aiData?.choices?.[0]?.message?.content ?? "";
    let parsed: { subject?: string; body?: string } = {};
    try {
      parsed = JSON.parse(content);
    } catch {
      // Try to extract JSON object
      const m = content.match(/\{[\s\S]*\}/);
      if (m) {
        try { parsed = JSON.parse(m[0]); } catch { /* noop */ }
      }
    }

    if (!parsed.subject || !parsed.body) {
      return json({ error: "AI-suggestie kon niet worden gelezen", raw: content }, 500);
    }

    // Vul {{portal_url}} placeholder zodat admin het meteen ziet
    const finalBody = portalUrl
      ? parsed.body.replaceAll("{{portal_url}}", portalUrl)
      : parsed.body;

    return json({ subject: parsed.subject, body: finalBody });
  } catch (err) {
    console.error("compose-followup-email error", err);
    const msg = err instanceof Error ? err.message : "Interne fout";
    return json({ error: msg }, 500);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
