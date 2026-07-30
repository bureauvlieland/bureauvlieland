import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  buildComposerPrompt,
  buildDossier,
  suggestIntent,
  truncate,
  type DossierEntry,
} from "../_shared/emailComposerIntents.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * AI e-mailcomposer voor de klantenkaart.
 *
 * Genereert subject + body op basis van:
 *  - de gekozen intentie (waarom stuur ik deze mail)
 *  - het volledige projectdossier: in- en uitgaande mails (inhoud), chat,
 *    systeemmails, admin-notities en projectgebeurtenissen
 *  - optionele admin-instructie of herschrijf-opdracht
 *
 * Met `previewOnly: true` retourneert de functie alleen de dossier-samenvatting
 * plus een aanbevolen intentie, zodat de UI kan tonen waarop de AI zich baseert.
 *
 * Alleen admins. Gebruikt Lovable AI Gateway (LOVABLE_API_KEY).
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");

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
      recipientType,
      intent,
      instruction,
      currentBody,
      refineInstruction,
      previewOnly,
    } = body ?? {};

    if (!requestId && !accommodationId) {
      return json({ error: "requestId of accommodationId verplicht" }, 400);
    }
    if (!previewOnly && !lovableKey) {
      return json({ error: "LOVABLE_API_KEY ontbreekt" }, 500);
    }

    // ---------------------------------------------------------------
    // Projectcontext
    // ---------------------------------------------------------------
    const ctx: Record<string, unknown> = {};
    let portalUrl = "";
    let contactFirstName = "heer/mevrouw";
    let referenceNumber = "";
    let quoteSentAt: string | null = null;
    let termsAcceptedAt: string | null = null;
    let executionDone = false;
    let hasOpenInvoice = false;

    if (requestId) {
      const { data: pr } = await supabase
        .from("program_requests")
        .select(
          "reference_number, status, quote_status, customer_name, customer_company, customer_email, number_of_people, selected_dates, customer_token, created_at, quote_sent_at, quote_valid_until, terms_accepted_at, program_published_at, completed_at, general_notes",
        )
        .eq("id", requestId)
        .maybeSingle();
      if (pr) {
        contactFirstName = (pr.customer_name || "").trim().split(/\s+/)[0] || "heer/mevrouw";
        referenceNumber = pr.reference_number || "";
        portalUrl = `https://bureauvlieland.nl/mijn-programma/${pr.customer_token}`;
        quoteSentAt = pr.quote_sent_at ?? null;
        termsAcceptedAt = pr.terms_accepted_at ?? null;
        executionDone = !!pr.completed_at;
        ctx.project = {
          type: "programma",
          referentie: pr.reference_number,
          status: pr.status,
          offerte_status: pr.quote_status,
          contactpersoon: pr.customer_name,
          bedrijf: pr.customer_company,
          aantal_personen: pr.number_of_people,
          datums: pr.selected_dates,
          aanvraag_op: pr.created_at,
          offerte_verstuurd_op: pr.quote_sent_at,
          offerte_geldig_tot: pr.quote_valid_until,
          programma_gepubliceerd_op: pr.program_published_at,
          klant_ondertekend_op: pr.terms_accepted_at,
          afgerond_op: pr.completed_at,
          admin_notitie: pr.general_notes,
        };
      }

      // Programma-onderdelen op hoofdlijnen (geen prijsdetails de prompt in).
      const { data: items } = await supabase
        .from("program_request_items")
        .select("block_name, status, day_index, preferred_time, number_of_people")
        .eq("request_id", requestId)
        .limit(60);
      if (items?.length) {
        const byStatus: Record<string, number> = {};
        for (const it of items) {
          const key = String(it.status ?? "onbekend");
          byStatus[key] = (byStatus[key] ?? 0) + 1;
        }
        ctx.programma_onderdelen = {
          totaal: items.length,
          per_status: byStatus,
          namen: items.map((i) => i.block_name).filter(Boolean).slice(0, 25),
        };
      }

      const { data: invoices } = await supabase
        .from("bureau_invoices")
        .select("invoice_number, invoice_type, amount_incl_vat, invoice_date, status, forwarded_to_accounting_at")
        .eq("request_id", requestId)
        .order("created_at", { ascending: true })
        .limit(10);
      if (invoices?.length) {
        hasOpenInvoice = invoices.some((i) => i.status !== "paid");
        ctx.facturen = invoices.map((i) => ({
          nummer: i.invoice_number,
          soort: i.invoice_type,
          bedrag_incl_btw: i.amount_incl_vat,
          factuurdatum: i.invoice_date,
          status: i.status,
        }));
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
        if (!requestId) {
          contactFirstName = (ar.customer_name || "").trim().split(/\s+/)[0] || "heer/mevrouw";
        }
        referenceNumber = referenceNumber || ar.reference_number || "";
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

    // ---------------------------------------------------------------
    // Dossier: in- en uitgaande communicatie
    // ---------------------------------------------------------------
    const raw: DossierEntry[] = [];

    // 1) Projectdossier (bevat inhoud van in- én uitgaande mails, notities, telefoon)
    let commQuery = supabase
      .from("project_communications")
      .select("communication_type, direction, subject, content, contact_name, communication_date, created_at")
      .order("communication_date", { ascending: false })
      .limit(30);
    if (requestId) commQuery = commQuery.eq("request_id", requestId);
    else commQuery = commQuery.eq("accommodation_id", accommodationId);
    const { data: comms } = await commQuery;

    for (const c of comms ?? []) {
      const at = c.communication_date || c.created_at;
      if (!at) continue;
      const inbound = c.direction === "inbound";
      const type = String(c.communication_type ?? "");
      let kind: DossierEntry["kind"];
      if (type.startsWith("chat")) kind = inbound ? "chat_in" : "chat_out";
      else if (type === "note" || type === "internal_note") kind = "note";
      else kind = inbound ? "email_in" : "email_out";
      raw.push({
        at,
        kind,
        who: c.contact_name ?? null,
        subject: c.subject ?? null,
        content: c.content ?? null,
      });
    }

    // 2) Systeemmails uit email_log die niet in het dossier staan
    let logQuery = supabase
      .from("email_log")
      .select("subject, email_type, sent_at, created_at, recipient_email, status")
      .order("created_at", { ascending: false })
      .limit(20);
    if (requestId) logQuery = logQuery.eq("related_request_id", requestId);
    else logQuery = logQuery.eq("related_accommodation_id", accommodationId);
    const { data: logs } = await logQuery;

    const dossierSubjects = new Set(
      (comms ?? []).map((c) => (c.subject ?? "").trim().toLowerCase()).filter(Boolean),
    );
    for (const l of logs ?? []) {
      const subject = (l.subject ?? "").trim();
      if (subject && dossierSubjects.has(subject.toLowerCase())) continue; // al als email_out vastgelegd
      const at = l.sent_at || l.created_at;
      if (!at) continue;
      raw.push({
        at,
        kind: "system_email",
        who: l.recipient_email ?? null,
        subject: `${subject}${l.email_type ? ` (${l.email_type})` : ""}`,
        content: l.status && l.status !== "sent" ? `Status: ${l.status}` : null,
      });
    }

    // 3) Chatberichten via gekoppelde gesprekken
    let convQuery = supabase.from("chat_conversations").select("id").limit(10);
    if (requestId) convQuery = convQuery.eq("request_id", requestId);
    else convQuery = convQuery.eq("accommodation_request_id", accommodationId);
    const { data: convs } = await convQuery;
    const convIds = (convs ?? []).map((c) => c.id);
    if (convIds.length > 0) {
      const { data: msgs } = await supabase
        .from("chat_messages")
        .select("sender_type, sender_name, content, created_at")
        .in("conversation_id", convIds)
        .order("created_at", { ascending: false })
        .limit(20);
      for (const m of msgs ?? []) {
        if (!m.created_at) continue;
        raw.push({
          at: m.created_at,
          kind: m.sender_type === "admin" ? "chat_out" : "chat_in",
          who: m.sender_name ?? null,
          content: m.content ?? null,
        });
      }
    }

    // 4) Projectgebeurtenissen (klantacties) uit de history
    if (requestId) {
      const { data: history } = await supabase
        .from("program_request_history")
        .select("action, actor, actor_name, notes, created_at")
        .eq("request_id", requestId)
        .order("created_at", { ascending: false })
        .limit(15);
      for (const h of history ?? []) {
        if (!h.created_at) continue;
        raw.push({
          at: h.created_at,
          kind: "history",
          who: h.actor_name || h.actor || null,
          subject: h.action ?? null,
          content: h.notes ?? null,
        });
      }
    }

    const { entries: dossier, summary } = buildDossier(raw, { max: 15 });
    const suggested = suggestIntent({
      quoteSentAt,
      termsAcceptedAt,
      executionDone,
      hasOpenInvoice,
      summary,
    });

    if (previewOnly) {
      return json({ summary, suggestedIntent: suggested, referenceNumber, portalUrl });
    }

    // ---------------------------------------------------------------
    // AI
    // ---------------------------------------------------------------
    const { system, user } = buildComposerPrompt({
      intent: intent ?? suggested,
      instruction,
      currentBody,
      refineInstruction,
      contactFirstName,
      recipientName,
      recipientEmail,
      recipientType: recipientType === "partner" ? "partner" : "customer",
      referenceNumber,
      portalUrl,
      projectContext: ctx,
      dossier,
      summary,
    });

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${lovableKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-3.6-flash",
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (aiRes.status === 429) return json({ error: "AI-limiet bereikt — probeer het zo opnieuw." }, 429);
    if (aiRes.status === 402) {
      return json({ error: "AI-credits op. Voeg credits toe in Workspace → Usage." }, 402);
    }
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
      const m = content.match(/\{[\s\S]*\}/);
      if (m) {
        try {
          parsed = JSON.parse(m[0]);
        } catch { /* noop */ }
      }
    }

    if (!parsed.subject || !parsed.body) {
      return json({ error: "AI-suggestie kon niet worden gelezen", raw: truncate(content, 300) }, 500);
    }

    const finalBody = portalUrl
      ? parsed.body.replaceAll("{{portal_url}}", portalUrl)
      : parsed.body;

    return json({
      subject: parsed.subject,
      body: finalBody,
      summary,
      suggestedIntent: suggested,
    });
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
