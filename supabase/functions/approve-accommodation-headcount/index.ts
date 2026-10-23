import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendMailjet } from "../_shared/mailjet-send.ts";
import { logEmail } from "../_shared/email-logger.ts";
import {
  SENDER_EMAIL,
  SENDER_NAME,
  buildReplyTo,
  formatCurrencyNL,
  formatDateNL,
  getPortalBaseUrl,
  getRecipientEmail,
  getSubjectPrefix,
  sanitizeHtml,
  wrapEmailHtml,
} from "../_shared/email-templates.ts";
import {
  describeHeadcountChange,
  nightsBetween,
  parseHeadcountProposal,
  recalculateLodgingCommission,
  recalculatePricePerPersonPerNight,
} from "../_shared/accommodationHeadcount.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const jsonResponse = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

export const EmailTypesHeadcount = {
  CUSTOMER_CONFIRMED: "accommodation_headcount_confirmed_customer",
  PARTNER_CONFIRMED: "accommodation_headcount_confirmed_partner",
  PARTNER_REJECTED: "accommodation_headcount_rejected_partner",
} as const;

const button = (href: string, label: string) =>
  `<p style="margin: 24px 0;"><a href="${href}" style="display: inline-block; background: #0F4C5C; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 600;">${label}</a></p>`;

const row = (label: string, value: string) =>
  `<p style="margin: 0 0 8px;"><strong>${label}:</strong> ${value}</p>`;

/**
 * approve-accommodation-headcount
 *
 * Het bureau beoordeelt het voorstel dat een logiespartner deed na een
 * aantalwijziging (confirm-accommodation-headcount). Bij goedkeuring gaan de
 * oude waarden naar accommodation_quote_history, krijgt de offerte het
 * nieuwe totaal en wordt de klant geïnformeerd. De offerte blijft "selected";
 * er volgt geen nieuwe keuzeronde. Bij afwijzing vervalt het voorstel en
 * hoort de partner waarom.
 */
export const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ error: "Niet ingelogd" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return jsonResponse({ error: "Ongeldige sessie" }, 401);
    }
    const { data: isAdmin } = await supabase.rpc("is_admin", { _user_id: user.id });
    if (!isAdmin) {
      return jsonResponse({ error: "Geen admin rechten" }, 403);
    }

    let body: { quoteId?: unknown; decision?: unknown; reason?: unknown; origin?: unknown };
    try {
      body = await req.json();
    } catch {
      return jsonResponse({ error: "Ongeldige request body" }, 400);
    }
    const quoteId = typeof body.quoteId === "string" ? body.quoteId : "";
    const decision = body.decision === "approve" || body.decision === "reject" ? body.decision : null;
    if (!quoteId || !decision) {
      return jsonResponse({ error: "quoteId en decision (approve of reject) zijn verplicht" }, 400);
    }
    const reason = typeof body.reason === "string" ? body.reason.trim().slice(0, 2000) : "";
    if (decision === "reject" && !reason) {
      return jsonResponse({ error: "Geef een reden op bij afwijzen" }, 400);
    }
    const origin = (typeof body.origin === "string" ? body.origin : undefined) ?? req.headers.get("origin") ?? undefined;

    const { data: quote, error: quoteError } = await supabase
      .from("accommodation_quotes")
      .select(`
        *,
        partner:partners(id, name, email, contact_email),
        request:accommodation_requests(
          id, customer_name, customer_company, customer_email, customer_token, reference_number,
          linked_program_id, arrival_date, departure_date, number_of_guests
        )
      `)
      .eq("id", quoteId)
      .single();
    if (quoteError || !quote) {
      return jsonResponse({ error: "Offerte niet gevonden" }, 404);
    }

    const partner = quote.partner as unknown as { id: string; name: string; email: string | null; contact_email: string | null } | null;
    const request = quote.request as unknown as {
      id: string;
      customer_name: string;
      customer_company: string | null;
      customer_email: string | null;
      customer_token: string | null;
      reference_number: string | null;
      linked_program_id: string | null;
      arrival_date: string | null;
      departure_date: string | null;
      number_of_guests: number | null;
    } | null;
    if (!partner || !request) {
      return jsonResponse({ error: "Partner of aanvraag niet gevonden" }, 404);
    }

    const proposal = parseHeadcountProposal(quote.headcount_proposal);
    if (!proposal) {
      return jsonResponse({ error: "Er ligt geen voorstel van de partner om te beoordelen" }, 409);
    }

    let program: {
      id: string;
      reference_number: string | null;
      customer_name: string | null;
      customer_email: string | null;
      customer_token: string | null;
      customer_company: string | null;
    } | null = null;
    if (request.linked_program_id) {
      const { data } = await supabase
        .from("program_requests")
        .select("id, reference_number, customer_name, customer_email, customer_token, customer_company")
        .eq("id", request.linked_program_id)
        .maybeSingle();
      program = data ?? null;
    }

    const now = new Date().toISOString();
    const baseUrl = getPortalBaseUrl(origin);
    const subjectPrefix = getSubjectPrefix(origin);
    const logiesRef = request.reference_number || program?.reference_number || "";
    const refSuffix = logiesRef ? ` (${logiesRef})` : "";
    const customerLabel = request.customer_company || request.customer_name;
    const partnerEmail = partner.contact_email || partner.email;
    const partnerPortalUrl = `${baseUrl}/partner/logies/${request.id}?actie=aantal`;
    const arrival = request.arrival_date ? formatDateNL(request.arrival_date) : "";
    const departure = request.departure_date ? formatDateNL(request.departure_date) : "";
    const change = describeHeadcountChange(proposal.previous_guests, proposal.guests);
    const priceChanged = proposal.price_total !== proposal.previous_price_total;
    const results: Record<string, unknown> = {};

    if (decision === "approve") {
      // 1) Oude waarden bewaren als versie.
      const { count: historyCount } = await supabase
        .from("accommodation_quote_history")
        .select("id", { count: "exact", head: true })
        .eq("quote_id", quoteId);
      const { error: historyError } = await supabase.from("accommodation_quote_history").insert({
        quote_id: quoteId,
        version: (historyCount ?? 0) + 1,
        price_total: quote.price_total,
        price_per_person_per_night: quote.price_per_person_per_night,
        room_configuration: quote.room_configuration,
        includes: quote.includes,
        conditions: quote.conditions,
        description: quote.description,
        number_of_guests: proposal.previous_guests ?? quote.priced_for_guests ?? null,
        submitted_at: quote.submitted_at,
        selected_at: quote.selected_at,
        forwarded_at: quote.forwarded_at,
        quote_attachment_path: quote.quote_attachment_path,
        quote_attachment_filename: quote.quote_attachment_filename,
      });
      if (historyError) {
        console.error("approve-accommodation-headcount history error:", historyError);
        return jsonResponse({ error: "Kon de vorige versie niet bewaren" }, 500);
      }

      // 2) Commissie volgt het nieuwe totaal zolang zij nog niet is gefactureerd.
      const { data: extras } = await supabase
        .from("accommodation_quote_extras")
        .select("unit_price, quantity, pricing_type")
        .eq("quote_id", quoteId);
      const extrasTotal = (extras || []).reduce(
        (sum: number, e: { unit_price: number; quantity: number; pricing_type: string }) =>
          sum + (e.pricing_type === "fixed" ? Number(e.unit_price) : Number(e.unit_price) * Number(e.quantity)),
        0,
      );
      const commissionOpen = (quote.commission_status ?? "pending") === "pending" && !quote.commission_exempt && !quote.invoiced_number;
      const nights = nightsBetween(request.arrival_date, request.departure_date);

      const update: Record<string, unknown> = {
        price_total: proposal.price_total,
        price_per_person_per_night: recalculatePricePerPersonPerNight(proposal.price_total, proposal.guests, nights),
        priced_for_guests: proposal.guests,
        headcount_proposal: null,
        headcount_change_requested_at: null,
        headcount_confirmed_at: now,
        updated_at: now,
      };
      if (proposal.room_configuration && proposal.room_configuration.length > 0) {
        update.room_configuration = proposal.room_configuration;
      }
      if (commissionOpen) {
        update.commission_amount = recalculateLodgingCommission(proposal.price_total, extrasTotal, quote.commission_percentage);
      }
      const { error: updateError } = await supabase.from("accommodation_quotes").update(update).eq("id", quoteId);
      if (updateError) {
        console.error("approve-accommodation-headcount update error:", updateError);
        return jsonResponse({ error: "Kon de offerte niet bijwerken" }, 500);
      }
      results.price_total = proposal.price_total;
      results.commission_updated = commissionOpen;

      // 3) Taken sluiten en historie.
      await supabase
        .from("admin_todos")
        .update({ status: "done", completed_at: now, completion_reason: "Goedgekeurd door het bureau" })
        .in("auto_type", ["quote_headcount_review", "quote_headcount_pending_partner"])
        .eq("auto_entity_id", quoteId)
        .neq("status", "done");

      if (program) {
        await supabase.from("program_request_history").insert({
          request_id: program.id,
          action: "accommodation_price_updated",
          actor: "admin",
          actor_name: "Bureau Vlieland",
          old_value: { price_total: proposal.previous_price_total, guests: proposal.previous_guests },
          new_value: { price_total: proposal.price_total, guests: proposal.guests, quote_id: quoteId },
          notes: `Logies ${quote.accommodation_name}: ${change}, totaal ${formatCurrencyNL(proposal.price_total)}${priceChanged ? ` (was ${formatCurrencyNL(proposal.previous_price_total)})` : " (ongewijzigd)"}. Goedgekeurd door Bureau Vlieland; klant geïnformeerd.`,
        });
      }

      // 4) Klant informeren: geen nieuwe keuze, alleen het nieuwe totaal.
      const customerEmail = program?.customer_email || request.customer_email;
      const customerName = program?.customer_name || request.customer_name;
      if (customerEmail) {
        const portalUrl = program?.customer_token
          ? `${baseUrl}/mijn-programma/${program.customer_token}`
          : request.customer_token
            ? `${baseUrl}/mijn-logies/${request.customer_token}`
            : null;
        const subject = `${subjectPrefix}Uw logies is aangepast aan ${proposal.guests} gasten${refSuffix}`;
        const inner = `
          <h2 style="color: #0F4C5C; margin-bottom: 8px;">Uw logies is aangepast aan ${proposal.guests} gasten</h2>
          <p>Geachte ${sanitizeHtml(customerName)},</p>
          <p>
            ${sanitizeHtml(partner.name)} heeft bevestigd dat uw verblijf in ${sanitizeHtml(quote.accommodation_name)}
            ${arrival && departure ? `van ${arrival} tot ${departure} ` : ""}nu voor <strong>${proposal.guests} gasten</strong> is vastgelegd.
          </p>
          <div style="background: #f0f9ff; padding: 20px; border-left: 4px solid #0284c7; border-radius: 8px; margin: 20px 0;">
            ${row("Aantal gasten", String(proposal.guests))}
            ${row("Totaal logies", `${formatCurrencyNL(proposal.price_total)} inclusief btw${priceChanged ? ` (was ${formatCurrencyNL(proposal.previous_price_total)})` : ""}`)}
            ${proposal.room_configuration && proposal.room_configuration.length > 0
              ? row("Kamers", (proposal.room_configuration as Array<{ count?: number; type?: string }>).map((r) => `${r.count ?? 1} x ${sanitizeHtml(r.type || "kamer")}`).join(", "))
              : ""}
            ${proposal.note ? row("Toelichting van de accommodatie", sanitizeHtml(proposal.note)) : ""}
          </div>
          <p>De rest van uw programma verandert niet. U hoeft niets te doen; uw eerdere akkoord blijft gelden.</p>
          ${portalUrl ? button(portalUrl, program ? "Bekijk uw programma" : "Bekijk uw logiesaanvraag") : ""}
          <p style="color: #475569; font-size: 14px;">Heeft u vragen? U kunt op deze e-mail antwoorden.</p>
          <p style="color: #666; font-size: 13px;">Referentie: ${sanitizeHtml(logiesRef || "-")}</p>
        `;
        const html = await wrapEmailHtml(inner, supabase);
        const recipient = getRecipientEmail(customerEmail, origin);
        const send = await sendMailjet({
          source: "approve-accommodation-headcount:customer",
          messages: [{
            From: { Email: SENDER_EMAIL, Name: SENDER_NAME },
            To: [{ Email: recipient, Name: customerName }],
            ...(buildReplyTo(program?.reference_number || logiesRef) ? { ReplyTo: buildReplyTo(program?.reference_number || logiesRef) } : {}),
            Subject: subject,
            HTMLPart: html,
          }],
        });
        await logEmail({
          email_type: EmailTypesHeadcount.CUSTOMER_CONFIRMED,
          subject,
          recipient_email: recipient,
          recipient_name: customerName,
          related_request_id: program?.id,
          related_accommodation_id: request.id,
          related_partner_id: partner.id,
          status: send.ok ? "sent" : "failed",
          error_message: send.ok ? undefined : send.error,
          mailjet_message_id: send.ok ? (send.messageId ?? undefined) : undefined,
          sent_by: "admin",
          html_body: html,
          from_email: SENDER_EMAIL,
          metadata: {
            template_name: EmailTypesHeadcount.CUSTOMER_CONFIRMED,
            actor: "admin → klant (aantal logies bevestigd)",
            quote_id: quoteId,
            guests: proposal.guests,
            price_total: proposal.price_total,
            previous_price_total: proposal.previous_price_total,
          },
        });
        results.customer = { sent: send.ok, recipient };
      } else {
        results.customer = { sent: false, reason: "no_email" };
      }

      // 5) Partner: korte bevestiging dat het is verwerkt.
      if (partnerEmail) {
        const subject = `${subjectPrefix}Nieuw aantal verwerkt: ${customerLabel}${refSuffix}`;
        const inner = `
          <h2 style="color: #0F4C5C; margin-bottom: 8px;">Uw bevestiging is verwerkt</h2>
          <p>Beste ${sanitizeHtml(partner.name)},</p>
          <p>
            Bureau Vlieland heeft uw bevestiging van <strong>${proposal.guests} gasten</strong> voor ${sanitizeHtml(customerLabel)}
            ${arrival && departure ? `(${arrival} tot ${departure}) ` : ""}verwerkt. Het totaal van uw offerte staat nu op
            <strong>${formatCurrencyNL(proposal.price_total)}</strong>. De klant is geïnformeerd.
          </p>
          <p>Na het verblijf factureert u dit bedrag zoals gebruikelijk.</p>
          ${button(`${baseUrl}/partner/logies/${request.id}`, "Open de logiesaanvraag")}
          <p style="color: #666; font-size: 13px;">Referentie: ${sanitizeHtml(logiesRef || "-")}</p>
        `;
        const html = await wrapEmailHtml(inner, supabase);
        const recipient = getRecipientEmail(partnerEmail, origin);
        const send = await sendMailjet({
          source: "approve-accommodation-headcount:partner",
          messages: [{
            From: { Email: SENDER_EMAIL, Name: SENDER_NAME },
            To: [{ Email: recipient, Name: partner.name }],
            ...(buildReplyTo(logiesRef) ? { ReplyTo: buildReplyTo(logiesRef) } : {}),
            Subject: subject,
            HTMLPart: html,
          }],
        });
        await logEmail({
          email_type: EmailTypesHeadcount.PARTNER_CONFIRMED,
          subject,
          recipient_email: recipient,
          recipient_name: partner.name,
          related_request_id: program?.id,
          related_accommodation_id: request.id,
          related_partner_id: partner.id,
          status: send.ok ? "sent" : "failed",
          error_message: send.ok ? undefined : send.error,
          mailjet_message_id: send.ok ? (send.messageId ?? undefined) : undefined,
          sent_by: "admin",
          html_body: html,
          from_email: SENDER_EMAIL,
          metadata: {
            template_name: EmailTypesHeadcount.PARTNER_CONFIRMED,
            actor: "admin → logies-partner (aantal bevestigd)",
            quote_id: quoteId,
          },
        });
        results.partner = { sent: send.ok, recipient };
      }

      return jsonResponse({ success: true, decision, results });
    }

    // ---------------- Afwijzen ----------------
    const { error: rejectError } = await supabase
      .from("accommodation_quotes")
      .update({ headcount_proposal: null, updated_at: now })
      .eq("id", quoteId);
    if (rejectError) {
      console.error("approve-accommodation-headcount reject error:", rejectError);
      return jsonResponse({ error: "Kon het voorstel niet afwijzen" }, 500);
    }
    await supabase
      .from("admin_todos")
      .update({ status: "done", completed_at: now, completion_reason: `Afgewezen: ${reason}` })
      .eq("auto_type", "quote_headcount_review")
      .eq("auto_entity_id", quoteId)
      .neq("status", "done");

    if (program) {
      await supabase.from("program_request_history").insert({
        request_id: program.id,
        action: "accommodation_headcount_rejected",
        actor: "admin",
        actor_name: "Bureau Vlieland",
        old_value: { price_total: proposal.previous_price_total, guests: proposal.previous_guests },
        new_value: { proposed_price_total: proposal.price_total, guests: proposal.guests, quote_id: quoteId },
        notes: `Voorstel van ${partner.name} (${formatCurrencyNL(proposal.price_total)} voor ${proposal.guests} gasten) niet overgenomen. Reden: ${reason}`,
      });
    }

    if (partnerEmail) {
      const subject = `${subjectPrefix}Uw aanpassing voor ${customerLabel} is niet overgenomen${refSuffix}`;
      const inner = `
        <h2 style="color: #0F4C5C; margin-bottom: 8px;">Uw aanpassing is niet overgenomen</h2>
        <p>Beste ${sanitizeHtml(partner.name)},</p>
        <p>
          Bureau Vlieland heeft uw voorstel van <strong>${formatCurrencyNL(proposal.price_total)}</strong> voor
          <strong>${proposal.guests} gasten</strong> (${sanitizeHtml(customerLabel)}${arrival && departure ? `, ${arrival} tot ${departure}` : ""}) niet overgenomen.
        </p>
        <div style="background: #fef2f2; padding: 16px; border-left: 4px solid #dc2626; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0;"><strong>Reden:</strong> ${sanitizeHtml(reason)}</p>
        </div>
        <p>Uw offerte blijft staan op ${formatCurrencyNL(proposal.previous_price_total)}. Wilt u het nieuwe aantal opnieuw bevestigen in het partnerportaal, of neemt u contact met ons op als u wilt overleggen?</p>
        ${button(partnerPortalUrl, "Nieuw aantal bevestigen")}
        <p style="color: #475569; font-size: 14px;">U kunt ook op deze e-mail antwoorden.</p>
        <p style="color: #666; font-size: 13px;">Referentie: ${sanitizeHtml(logiesRef || "-")}</p>
      `;
      const html = await wrapEmailHtml(inner, supabase);
      const recipient = getRecipientEmail(partnerEmail, origin);
      const send = await sendMailjet({
        source: "approve-accommodation-headcount:reject",
        messages: [{
          From: { Email: SENDER_EMAIL, Name: SENDER_NAME },
          To: [{ Email: recipient, Name: partner.name }],
          ...(buildReplyTo(logiesRef) ? { ReplyTo: buildReplyTo(logiesRef) } : {}),
          Subject: subject,
          HTMLPart: html,
        }],
      });
      await logEmail({
        email_type: EmailTypesHeadcount.PARTNER_REJECTED,
        subject,
        recipient_email: recipient,
        recipient_name: partner.name,
        related_request_id: program?.id,
        related_accommodation_id: request.id,
        related_partner_id: partner.id,
        status: send.ok ? "sent" : "failed",
        error_message: send.ok ? undefined : send.error,
        mailjet_message_id: send.ok ? (send.messageId ?? undefined) : undefined,
        sent_by: "admin",
        html_body: html,
        from_email: SENDER_EMAIL,
        metadata: {
          template_name: EmailTypesHeadcount.PARTNER_REJECTED,
          actor: "admin → logies-partner (aanpassing afgewezen)",
          quote_id: quoteId,
          reason,
        },
      });
      results.partner = { sent: send.ok, recipient };
    }

    return jsonResponse({ success: true, decision, results });
  } catch (error) {
    console.error("approve-accommodation-headcount error:", error);
    return jsonResponse({ error: "Interne fout" }, 500);
  }
};

if (import.meta.main) Deno.serve(handler);
