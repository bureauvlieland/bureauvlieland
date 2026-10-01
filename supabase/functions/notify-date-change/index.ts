import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  sanitizeHtml,
  formatDateNL,
  getPortalBaseUrl,
  getSubjectPrefix,
  getRecipientEmail,
  buildReplyTo,
} from "../_shared/email-templates.ts";
import { logEmail, EmailTypes } from "../_shared/email-logger.ts";
import { isBureauItem } from "../_shared/bureau-item.ts";
import { sendMailjet, type MailjetMessage } from "../_shared/mailjet-send.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

interface MailResult {
  ok: boolean;
  messageId: string | null;
  error?: string;
}

const sendMail = async (message: MailjetMessage): Promise<MailResult> => {
  const result = await sendMailjet({ messages: [message], source: "notify-date-change" });
  if (!result.ok) return { ok: false, messageId: null, error: result.error };
  return { ok: true, messageId: result.messageId };
};

/** Status-waarden waarbij een partner al gereageerd heeft en dus opnieuw moet beoordelen. */
const PARTNER_RESPONDED_STATUSES = new Set([
  "confirmed",
  "accepted",
  "alternative",
  "counter_proposed",
  "unavailable",
]);
const VALID_UNSENT_QUOTE_STATUSES = new Set(["concept", "offerte_verstuurd", "in_afstemming", "optioneel"]);

const shortDate = (d: string) =>
  new Date(`${d}T12:00:00`).toLocaleDateString("nl-NL", {
    weekday: "short",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

/** Dag-voor-dag overzicht: "Dag 1: di 4 november 2026 → do 5 november 2026". */
function buildDateRows(oldDates: string[], newDates: string[]): string[] {
  const n = Math.max(oldDates.length, newDates.length);
  const rows: string[] = [];
  for (let i = 0; i < n; i++) {
    const o = oldDates[i];
    const nw = newDates[i];
    if (o && nw) rows.push(o === nw ? `Dag ${i + 1}: ${shortDate(nw)} (ongewijzigd)` : `Dag ${i + 1}: ${shortDate(o)} → ${shortDate(nw)}`);
    else if (nw) rows.push(`Dag ${i + 1}: nieuw — ${shortDate(nw)}`);
    else if (o) rows.push(`Dag ${i + 1}: ${shortDate(o)} — vervalt`);
  }
  return rows;
}

const renderDateBlock = (rows: string[]) =>
  `<ul style="margin: 8px 0 0; padding-left: 20px;">${rows.map((r) => `<li style="margin: 4px 0;">${sanitizeHtml(r)}</li>`).join("")}</ul>`;

const button = (href: string, label: string) =>
  `<p><a href="${href}" style="display: inline-block; background: #1a365d; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 600;">${label}</a></p>`;

interface Payload {
  request_id: string;
  old_dates: string[];
  note?: string;
  origin?: string;
  send_customer?: boolean;
  /**
   * 'customer' alleen via interne service-aanroep: de klant wijzigde zelf de
   * datum. Dan geen klantmail, geen akkoord-reset en geen eigen tijdlijnregel
   * (de aanroeper logt die al).
   */
  actor?: "admin" | "customer";
  /** Klant moet de onderdelen opnieuw goedkeuren (zet customer_approved_at/accepted_at terug). */
  reset_customer_approval?: boolean;
  /** Items van partners die de wijziging moeten ontvangen en opnieuw moeten bevestigen. */
  partner_item_ids?: string[];
  accommodation_quote_ids?: string[];
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    // Twee aanroepers: een ingelogde admin (browser) of een andere edge function
    // met de service-role key (klant wijzigde zelf de datum, actor=customer).
    const jwt = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
    if (!jwt) return json({ error: "Unauthorized" }, 401);
    const isServiceCall = jwt === Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!isServiceCall) {
      const { data: userData } = await supabase.auth.getUser(jwt);
      const actorUserId = userData?.user?.id ?? null;
      if (!actorUserId) return json({ error: "Unauthorized" }, 401);
      const { data: roleRow } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", actorUserId)
        .eq("role", "admin")
        .maybeSingle();
      if (!roleRow) return json({ error: "Forbidden" }, 403);
    }

    const body = (await req.json()) as Payload;
    const {
      request_id,
      old_dates,
      note,
      origin,
      actor: requestedActor,
      send_customer: sendCustomerRequested = false,
      reset_customer_approval: resetRequested = false,
      partner_item_ids = [],
      accommodation_quote_ids = [],
    } = body;

    const actor = isServiceCall && requestedActor === "customer" ? "customer" : "admin";
    const send_customer = actor === "admin" && sendCustomerRequested;
    const reset_customer_approval = actor === "admin" && resetRequested;

    if (!request_id || !Array.isArray(old_dates) || old_dates.length === 0) {
      return json({ error: "request_id en old_dates zijn verplicht" }, 400);
    }

    const { data: program, error: programError } = await supabase
      .from("program_requests")
      .select(
        "id, reference_number, customer_name, customer_email, customer_company, customer_token, number_of_people, selected_dates, quote_status, quote_valid_until",
      )
      .eq("id", request_id)
      .single();
    if (programError || !program) return json({ error: "Project niet gevonden" }, 404);

    const newDates: string[] = Array.isArray(program.selected_dates) ? (program.selected_dates as string[]) : [];
    const oldSorted = [...old_dates].sort();
    const newSorted = [...newDates].sort();
    if (JSON.stringify(oldSorted) === JSON.stringify(newSorted)) {
      return json({ error: "De opgegeven oude datums zijn gelijk aan de huidige datums — niets te melden" }, 400);
    }

    const baseUrl = getPortalBaseUrl(origin);
    const subjectPrefix = getSubjectPrefix(origin);
    const ref = program.reference_number || "";
    const nowIso = new Date().toISOString();
    const dateRows = buildDateRows(oldSorted, newSorted);
    const dateBlock = renderDateBlock(dateRows);
    const oldLabel = oldSorted.map((d) => formatDateNL(d)).join(", ");
    const newLabel = newSorted.map((d) => formatDateNL(d)).join(", ");
    const noteHtml = note?.trim()
      ? `<p style="margin: 12px 0 0; color: #475569;"><em>Toelichting Bureau Vlieland: ${sanitizeHtml(note.trim())}</em></p>`
      : "";

    const results: {
      customer: unknown;
      partners: unknown[];
      accommodations: unknown[];
      customer_items_reset: number;
    } = { customer: null, partners: [], accommodations: [], customer_items_reset: 0 };

    // ---- Items laden (vóór enige reset) ----
    const { data: allItems } = await supabase
      .from("program_request_items")
      .select(
        "id, block_name, status, provider_id, provider_name, provider_email, block_type, block_category, skip_partner_notification, item_quote_status, preferred_time, customer_approved_at, customer_accepted_at, day_index",
      )
      .eq("request_id", request_id)
      .neq("status", "cancelled");
    const items = (allItems || []) as any[];

    // Server-side guard voor partners: alleen niet-bureau items die de klant
    // al goedkeurde én al naar de partner zijn verstuurd. Anders kent de
    // partner het onderdeel nog niet en volgt de reguliere offerte-flow.
    const wantedIds = new Set(partner_item_ids);
    const partnerItems = items.filter((it) => {
      if (!wantedIds.has(it.id)) return false;
      if (isBureauItem(it)) return false;
      // Alleen open of door de partner beantwoorde aanvragen; uitgevoerde/afgeronde niet terugzetten.
      if (it.status !== "pending" && !PARTNER_RESPONDED_STATUSES.has(it.status)) return false;
      if (!(it.customer_approved_at || it.customer_accepted_at)) return false;
      return it.skip_partner_notification === false;
    });
    for (const id of wantedIds) {
      if (!partnerItems.some((it) => it.id === id)) {
        results.partners.push({ item_id: id, sent: false, reason: "not_eligible" });
      }
    }

    // ---------------- Partners: reset + mail ----------------
    const groups = new Map<string, any[]>();
    for (const it of partnerItems) {
      const key = it.provider_id || "_no_partner";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(it);
    }

    for (const [partnerId, groupItems] of groups.entries()) {
      // Partner moet opnieuw kunnen beoordelen: terug naar open aanvraag.
      for (const it of groupItems) {
        const upd: Record<string, unknown> = {
          quoted_at: null,
          confirmed_time: null,
          proposed_time: null,
          customer_counter_time: null,
          status_note: null,
          status_updated_at: nowIso,
          updated_at: nowIso,
          item_quote_status:
            it.item_quote_status && it.item_quote_status !== "bevestigd" && VALID_UNSENT_QUOTE_STATUSES.has(it.item_quote_status)
              ? it.item_quote_status === "concept" ? "in_afstemming" : it.item_quote_status
              : "in_afstemming",
        };
        // Alleen naar 'pending' als de partner al gereageerd had; anders staat
        // de aanvraag al open.
        if (PARTNER_RESPONDED_STATUSES.has(it.status)) upd.status = "pending";
        const { error: updErr } = await supabase.from("program_request_items").update(upd).eq("id", it.id);
        if (updErr) {
          console.error("notify-date-change: partner item reset failed", { item_id: it.id, error: updErr });
          results.partners.push({ item_id: it.id, sent: false, reason: "reset_failed", error: updErr.message });
        }
      }

      const { data: partner } = await supabase
        .from("partners")
        .select("id, name, email, contact_email")
        .eq("id", partnerId)
        .maybeSingle();
      const first = groupItems[0];
      const partnerEmail = first.provider_email || partner?.contact_email || partner?.email;
      const partnerName = partner?.name || first.provider_name || "";
      if (!partnerEmail) {
        results.partners.push({ partner_id: partnerId, sent: false, reason: "no_email", reset: true });
        continue;
      }

      const recipient = getRecipientEmail(partnerEmail, origin);
      const itemList = groupItems
        .map((it) => {
          const day = typeof it.day_index === "number" ? newSorted[it.day_index] : null;
          return `<li style="margin: 6px 0;"><strong>${sanitizeHtml(it.block_name)}</strong>${day ? ` — nu op ${sanitizeHtml(shortDate(day))}` : ""}${it.preferred_time ? ` om ${sanitizeHtml(String(it.preferred_time).slice(0, 5))}` : ""}</li>`;
        })
        .join("");
      const subject = `${subjectPrefix}Datum gewijzigd — graag opnieuw bevestigen${ref ? ` (${ref})` : ""}`;
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
          <h2 style="color: #1a365d; border-bottom: 2px solid #1a365d; padding-bottom: 10px;">
            Datum gewijzigd — graag opnieuw bevestigen
          </h2>
          <p>Hoi ${sanitizeHtml(partnerName)},</p>
          <p>
            De datum(s) van onderstaand project zijn gewijzigd. Je eerdere bevestiging voor de datum
            van <strong>${sanitizeHtml(oldLabel)}</strong> vervalt daarmee. Wil je in het partnerportaal
            beoordelen of je op de <strong>nieuwe datum</strong> beschikbaar bent en opnieuw bevestigen?
          </p>
          <div style="background: #fffbeb; padding: 20px; border-left: 4px solid #d97706; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0;"><strong>Wijziging:</strong></p>
            ${dateBlock}
            <p style="margin: 16px 0 8px;"><strong>Onderde(e)l(en) voor jou:</strong></p>
            <ul style="margin: 0; padding-left: 20px;">${itemList}</ul>
            ${noteHtml}
          </div>
          ${button(`${baseUrl}/partner/login`, "Beoordeel in partnerportaal →")}
          <p style="color: #475569; font-size: 14px;">
            Past de nieuwe datum niet? Geef dat dan aan in het portaal (niet beschikbaar of alternatief voorstel)
            of reply op deze mail.
          </p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">
          <p style="color: #666; font-size: 13px;">Referentie: ${sanitizeHtml(ref || "-")}</p>
        </div>`;

      const mail = await sendMail({
        From: { Email: "hallo@bureauvlieland.nl", Name: "Bureau Vlieland" },
        To: [{ Email: recipient, Name: partnerName }],
        ...(buildReplyTo(ref) ? { ReplyTo: buildReplyTo(ref) } : {}),
        Subject: subject,
        HTMLPart: html,
      });
      await logEmail({
        email_type: EmailTypes.PROGRAM_REQUEST_PARTNER,
        subject,
        recipient_email: recipient,
        recipient_name: partnerName || undefined,
        related_request_id: program.id,
        related_partner_id: partnerId,
        status: mail.ok ? "sent" : "failed",
        error_message: mail.ok ? undefined : mail.error,
        mailjet_message_id: mail.messageId ?? undefined,
        sent_by: actor === "customer" ? "update-customer-program" : "admin",
        metadata: {
          template_name: "date_change_partner",
          actor: actor === "customer"
            ? "klant → partner (datumwijziging, opnieuw bevestigen)"
            : "admin → partner (datumwijziging, opnieuw bevestigen)",
          old_dates: oldSorted,
          new_dates: newSorted,
          item_ids: groupItems.map((i) => i.id),
        },
      });
      results.partners.push({
        partner_id: partnerId,
        sent: mail.ok,
        recipient,
        item_ids: groupItems.map((i) => i.id),
        ...(mail.ok ? {} : { error: mail.error }),
      });
    }

    // ---------------- Klant: reset akkoord + mail ----------------
    if (reset_customer_approval) {
      const approvedIds = items
        .filter((it) => it.customer_approved_at || it.customer_accepted_at)
        .map((it) => it.id);
      if (approvedIds.length > 0) {
        const { error: resetErr } = await supabase
          .from("program_request_items")
          .update({ customer_approved_at: null, customer_accepted_at: null, updated_at: nowIso })
          .in("id", approvedIds);
        if (resetErr) console.error("notify-date-change: customer reset failed", resetErr);
        else results.customer_items_reset = approvedIds.length;
      }
      // Een verlopen offerte mag het opnieuw akkoord geven niet blokkeren.
      if (program.quote_status === "offerte_verstuurd" && program.quote_valid_until) {
        if (new Date(program.quote_valid_until).getTime() < Date.now()) {
          const extended = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
          await supabase.from("program_requests").update({ quote_valid_until: extended }).eq("id", program.id);
        }
      }
    }

    if (send_customer && program.customer_email) {
      const recipient = getRecipientEmail(program.customer_email, origin);
      const portalUrl = `${baseUrl}/mijn-programma/${program.customer_token}`;
      const subject = `${subjectPrefix}Datum van uw programma gewijzigd${ref ? ` (${ref})` : ""}`;
      const reapproveText = reset_customer_approval
        ? `<p>Omdat de datum is gewijzigd vragen wij u het programma <strong>opnieuw te beoordelen en goed te keuren</strong>. Bureau Vlieland legt de aangepaste data ook opnieuw voor aan de betrokken aanbieders; zodra zij bevestigen ontvangt u bericht.</p>`
        : `<p>Bureau Vlieland legt de aangepaste data opnieuw voor aan de betrokken aanbieders; zodra zij bevestigen ontvangt u bericht.</p>`;
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
          <h2 style="color: #1a365d; border-bottom: 2px solid #1a365d; padding-bottom: 10px;">
            Datum van uw programma gewijzigd
          </h2>
          <p>Geachte ${sanitizeHtml(program.customer_name || "")},</p>
          <p>
            De datum(s) van uw programma zijn aangepast. De onderdelen in uw programma schuiven mee naar de nieuwe dag(en).
          </p>
          <div style="background: #fffbeb; padding: 20px; border-left: 4px solid #d97706; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0;"><strong>Wijziging:</strong></p>
            ${dateBlock}
            ${noteHtml}
          </div>
          ${reapproveText}
          ${button(portalUrl, reset_customer_approval ? "Bekijk en keur uw programma goed →" : "Open uw programma →")}
          <p style="color: #475569; font-size: 14px;">
            Klopt er iets niet? U kunt eenvoudig op deze e-mail antwoorden.
          </p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">
          <p style="color: #666; font-size: 13px;">Referentie: ${sanitizeHtml(ref || "-")}</p>
        </div>`;
      const mail = await sendMail({
        From: { Email: "hallo@bureauvlieland.nl", Name: "Bureau Vlieland" },
        To: [{ Email: recipient, Name: program.customer_name }],
        ...(buildReplyTo(ref) ? { ReplyTo: buildReplyTo(ref) } : {}),
        Subject: subject,
        HTMLPart: html,
      });
      await logEmail({
        email_type: EmailTypes.PROGRAM_REQUEST_CUSTOMER,
        subject,
        recipient_email: recipient,
        recipient_name: program.customer_name || undefined,
        related_request_id: program.id,
        status: mail.ok ? "sent" : "failed",
        error_message: mail.ok ? undefined : mail.error,
        mailjet_message_id: mail.messageId ?? undefined,
        sent_by: "admin",
        metadata: {
          template_name: "date_change_customer",
          actor: "admin → klant (datumwijziging)",
          old_dates: oldSorted,
          new_dates: newSorted,
          reapproval_requested: reset_customer_approval,
        },
      });
      results.customer = { sent: mail.ok, recipient, ...(mail.ok ? {} : { error: mail.error }) };
    }

    // ---------------- Logies-partner (alleen mail) ----------------
    if (accommodation_quote_ids.length > 0) {
      const { data: quotes } = await supabase
        .from("accommodation_quotes")
        .select(
          "id, request_id, partner_id, accommodation_name, status, accommodation_requests!inner(id, reference_number, arrival_date, departure_date)",
        )
        .in("id", accommodation_quote_ids);

      for (const q of quotes || []) {
        if (q.status !== "selected") {
          results.accommodations.push({ quote_id: q.id, sent: false, reason: "not_customer_selected" });
          continue;
        }
        const { data: partner } = await supabase
          .from("partners")
          .select("id, name, email, contact_email")
          .eq("id", q.partner_id)
          .maybeSingle();
        const partnerEmail = partner?.contact_email || partner?.email;
        if (!partnerEmail) {
          results.accommodations.push({ quote_id: q.id, sent: false, reason: "no_email" });
          continue;
        }
        const ar = q.accommodation_requests as unknown as {
          reference_number: string | null;
          arrival_date: string;
          departure_date: string;
        };
        const recipient = getRecipientEmail(partnerEmail, origin);
        const logiesRef = ar.reference_number || ref;
        const subject = `${subjectPrefix}Datum gewijzigd — logies${logiesRef ? ` (${logiesRef})` : ""}`;
        const html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
            <h2 style="color: #1a365d; border-bottom: 2px solid #1a365d; padding-bottom: 10px;">Datum gewijzigd — logies</h2>
            <p>Hoi ${sanitizeHtml(partner?.name || "")},</p>
            <p>
              De data van onderstaande logies-aanvraag zijn gewijzigd. Wil je controleren of je op de nieuwe
              data nog beschikbaar bent en je offerte indien nodig aanpassen in het partnerportaal?
            </p>
            <div style="background: #fffbeb; padding: 20px; border-left: 4px solid #d97706; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0 0 8px;"><strong>Logies:</strong> ${sanitizeHtml(q.accommodation_name || "")}</p>
              <p style="margin: 0 0 8px;"><strong>Was:</strong> ${sanitizeHtml(oldLabel)}</p>
              <p style="margin: 0 0 8px;"><strong>Nieuw aankomst:</strong> ${sanitizeHtml(formatDateNL(ar.arrival_date))}</p>
              <p style="margin: 0;"><strong>Nieuw vertrek:</strong> ${sanitizeHtml(formatDateNL(ar.departure_date))}</p>
              ${noteHtml}
            </div>
            ${button(`${baseUrl}/partner/login`, "Open partnerportaal →")}
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">
            <p style="color: #666; font-size: 13px;">Referentie: ${sanitizeHtml(logiesRef || "-")}</p>
          </div>`;
        const mail = await sendMail({
          From: { Email: "hallo@bureauvlieland.nl", Name: "Bureau Vlieland" },
          To: [{ Email: recipient, Name: partner?.name }],
          ...(buildReplyTo(logiesRef) ? { ReplyTo: buildReplyTo(logiesRef) } : {}),
          Subject: subject,
          HTMLPart: html,
        });
        await logEmail({
          email_type: EmailTypes.ACCOMMODATION_QUOTE_REQUEST_PARTNER,
          subject,
          recipient_email: recipient,
          recipient_name: partner?.name || undefined,
          related_request_id: program.id,
          related_accommodation_id: q.request_id,
          related_partner_id: q.partner_id,
          status: mail.ok ? "sent" : "failed",
          error_message: mail.ok ? undefined : mail.error,
          mailjet_message_id: mail.messageId ?? undefined,
          sent_by: "admin",
          metadata: {
            template_name: "date_change_accommodation_partner",
            actor: "admin → logies-partner (datumwijziging)",
            old_dates: oldSorted,
            new_dates: newSorted,
            quote_id: q.id,
          },
        });
        results.accommodations.push({ quote_id: q.id, sent: mail.ok, recipient, ...(mail.ok ? {} : { error: mail.error }) });
      }
    }

    // ---------------- Tijdlijn ----------------
    const partnersOk = (results.partners as any[]).filter((p) => p.sent).length;
    if (actor === "admin") await supabase.from("program_request_history").insert({
      request_id: program.id,
      action: "dates_changed",
      actor: "admin",
      actor_name: "Bureau Vlieland",
      old_value: { dates: oldSorted },
      new_value: { dates: newSorted },
      notes:
        `Datums gewijzigd door Bureau Vlieland (${oldLabel} → ${newLabel}). ` +
        `${partnersOk} partner(s) gevraagd opnieuw te bevestigen` +
        `${reset_customer_approval ? `; klant gevraagd opnieuw akkoord te geven (${results.customer_items_reset} onderdelen)` : ""}.`,
    });

    return json({ success: true, results });
  } catch (error) {
    console.error("notify-date-change error:", error);
    return json({ error: "Er ging iets mis bij het versturen" }, 500);
  }
});
