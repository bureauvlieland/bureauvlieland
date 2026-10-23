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
import { sendMailjet, type MailjetMessage } from "../_shared/mailjet-send.ts";
import { buildLodgingHeadcountMail } from "./lodging-mail.ts";

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

/**
 * Verstuurt via de centrale helper en geeft de Mailjet MessageID terug voor
 * email_log. Voorheen stond hier een eigen fetch die een niet gedeclareerde
 * variabele vulde; de mail ging dan wel weg, maar het loggen gooide een
 * ReferenceError en de function meldde de verzending als mislukt.
 */
const send = async (source: string, message: MailjetMessage): Promise<string | null> => {
  const result = await sendMailjet({ source, messages: [message] });
  if (!result.ok) throw new Error(result.error || "EMAIL_SERVICE_ERROR");
  return result.messageId ?? null;
};

const formatEur = (n: number) =>
  `€${n.toLocaleString("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

interface Payload {
  /** Het programma. Mag ontbreken als alleen logiespartners gemaild worden. */
  request_id?: string;
  old_people: number;
  new_people: number;
  note?: string;
  origin?: string;
  send_customer?: boolean;
  partner_item_ids?: string[];
  accommodation_quote_ids?: string[];
}

export const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const body = (await req.json()) as Payload;
    const {
      request_id,
      old_people,
      new_people,
      note,
      origin,
      send_customer = false,
      partner_item_ids = [],
      accommodation_quote_ids = [],
    } = body;

    if (typeof new_people !== "number" || typeof old_people !== "number") {
      return jsonResponse({ error: "old_people en new_people zijn verplicht" }, 400);
    }
    if (!request_id && accommodation_quote_ids.length === 0) {
      return jsonResponse({ error: "request_id of accommodation_quote_ids is verplicht" }, 400);
    }

    let program: {
      id: string;
      reference_number: string | null;
      customer_name: string | null;
      customer_email: string | null;
      customer_company: string | null;
      customer_token: string | null;
      number_of_people: number | null;
      selected_dates: unknown;
    } | null = null;
    if (request_id) {
      const { data, error: programError } = await supabase
        .from("program_requests")
        .select(
          "id, reference_number, customer_name, customer_email, customer_company, customer_token, number_of_people, selected_dates",
        )
        .eq("id", request_id)
        .single();
      if (programError || !data) {
        return jsonResponse({ error: "Project niet gevonden" }, 404);
      }
      program = data;
    }

    const baseUrl = getPortalBaseUrl(origin);
    const subjectPrefix = getSubjectPrefix(origin);
    const ref = program?.reference_number || "";
    const selectedDates = Array.isArray(program?.selected_dates) ? (program!.selected_dates as string[]) : [];
    const dates = selectedDates.map(formatDateNL).join(", ");
    const numberOfDays = Math.max(selectedDates.length, 1);
    const trimmedNote = note?.trim() ?? "";

    const noteHtmlCustomer = trimmedNote
      ? `<p style="margin: 12px 0 0; color: #475569;"><em>Toelichting Bureau Vlieland: ${sanitizeHtml(trimmedNote)}</em></p>`
      : "";
    const noteHtmlPartner = trimmedNote
      ? `<p style="margin: 8px 0 0; color: #475569;"><em>Toelichting Bureau Vlieland: ${sanitizeHtml(trimmedNote)}</em></p>`
      : "";

    const results: Record<string, unknown> = {
      customer: null,
      partners: [] as unknown[],
      accommodations: [] as unknown[],
    };

    // ---------------- Klantmail ----------------
    if (send_customer && program?.customer_email) {
      const recipient = getRecipientEmail(program.customer_email, origin);
      const portalUrl = `${baseUrl}/mijn-programma/${program.customer_token}`;
      const subject = `${subjectPrefix}Aantal personen aangepast van ${old_people} naar ${new_people}${ref ? ` (${ref})` : ""}`;

      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
          <h2 style="color: #1a365d; border-bottom: 2px solid #1a365d; padding-bottom: 10px;">
            Aantal personen aangepast
          </h2>
          <p>Geachte ${sanitizeHtml(program.customer_name || "")},</p>
          <p>
            Wij hebben in uw programma het aantal personen aangepast van
            <strong>${old_people}</strong> naar <strong>${new_people}</strong>.
          </p>
          <div style="background: #f0f9ff; padding: 20px; border-left: 4px solid #0284c7; border-radius: 8px; margin: 20px 0;">
            ${dates ? `<p style="margin: 0 0 8px;"><strong>Datum(s):</strong> ${dates}</p>` : ""}
            <p style="margin: 0 0 8px;"><strong>Nieuw aantal personen:</strong> ${new_people}</p>
            <p style="margin: 0;">De prijzen per persoon blijven gelijk; de totalen in uw programma worden automatisch herberekend op basis van het nieuwe aantal.</p>
            ${noteHtmlCustomer}
          </div>
          <p>
            <a href="${portalUrl}" style="display: inline-block; background: #1a365d; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 600;">
              Open uw programma
            </a>
          </p>
          <p style="color: #475569; font-size: 14px;">
            Heeft u nog vragen of wijzigingen? U kunt eenvoudig op deze e-mail antwoorden.
          </p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">
          <p style="color: #666; font-size: 13px;">Referentie: ${ref || "-"}</p>
        </div>
      `;

      try {
        const messageId = await send("notify-headcount-change-bulk:customer", {
          From: { Email: "hallo@bureauvlieland.nl", Name: "Bureau Vlieland" },
          To: [{ Email: recipient, Name: program.customer_name || undefined }],
          ...(buildReplyTo(ref) ? { ReplyTo: buildReplyTo(ref) } : {}),
          Subject: subject,
          HTMLPart: html,
        });
        await logEmail({
          mailjet_message_id: messageId ?? undefined,
          email_type: EmailTypes.PROGRAM_REQUEST_CUSTOMER,
          subject,
          recipient_email: recipient,
          recipient_name: program.customer_name || undefined,
          related_request_id: program.id,
          status: "sent",
          sent_by: "admin",
          metadata: {
            template_name: "headcount_change_customer",
            actor: "admin → klant (aantalwijziging)",
            old_people,
            new_people,
          },
        });
        results.customer = { sent: true, recipient };
      } catch (err) {
        console.error("customer mail error:", err);
        results.customer = { sent: false, error: String(err) };
      }
    }

    // ---------------- Partner-onderdelen ----------------
    if (partner_item_ids.length > 0 && program) {
      const { data: rawItems } = await supabase
        .from("program_request_items")
        .select(
          "id, block_name, status, provider_id, provider_name, block_type, block_category, provider_email, price_type, admin_price_override, quoted_price, override_people, customer_approved_at, customer_accepted_at",
        )
        .in("id", partner_item_ids);

      // Server-side guard: alleen door de klant goedgekeurde items krijgen
      // een aantal-wijziging-mail. Zolang een item nog in offerte staat
      // (customer_approved_at én customer_accepted_at leeg) heeft de klant
      // het programma nog niet definitief gemaakt.
      const items = (rawItems || []).filter((it: any) => {
        if (it.status === "cancelled") return false;
        return !!(it.customer_approved_at || it.customer_accepted_at);
      });
      const skippedNotApproved = (rawItems || []).filter(
        (it: any) => it.status !== "cancelled" && !it.customer_approved_at && !it.customer_accepted_at,
      );
      for (const it of skippedNotApproved) {
        (results.partners as unknown[]).push({
          item_id: it.id,
          partner_id: it.provider_id,
          sent: false,
          reason: "not_customer_approved",
        });
      }

      // Groepeer per partner. Bureau-items (rederij/fietsverhuur/bagagevervoer/
      // 'bureau') worden bewust MEE-genotificeerd zodat de betrokken partner
      // (of Bureau zelf, als centrale boeker) een signaal krijgt om de
      // reservering aan te passen.
      const groups = new Map<string, { partner_id: string; items: typeof items }>();
      for (const it of items || []) {
        const key = it.provider_id || "_no_partner";
        if (!groups.has(key)) groups.set(key, { partner_id: it.provider_id || "", items: [] });
        groups.get(key)!.items!.push(it);
      }

      for (const [partnerId, grp] of groups.entries()) {
        const { data: partner } = await supabase
          .from("partners")
          .select("id, name, email, contact_email")
          .eq("id", partnerId)
          .maybeSingle();

        const firstItem = grp.items![0];
        const partnerEmail =
          firstItem.provider_email || partner?.contact_email || partner?.email;
        if (!partnerEmail) {
          (results.partners as unknown[]).push({ partner_id: partnerId, sent: false, reason: "no_email" });
          continue;
        }

        const recipient = getRecipientEmail(partnerEmail, origin);
        const partnerPortalUrl = `${baseUrl}/partner/login`;

        const itemRows = grp
          .items!.map((it) => {
            const effPeople = it.override_people ?? new_people;
            const isPerPerson = it.price_type === "per_person" || it.price_type === "per_person_per_day";
            const isPerDay = it.price_type === "per_person_per_day";
            const unit = it.admin_price_override != null ? Number(it.admin_price_override) : null;
            const newTotal = unit != null
              ? unit * (isPerPerson ? effPeople : 1) * (isPerDay ? numberOfDays : 1)
              : null;
            const priceLine = unit != null
              ? `<br><span style="color:#475569;">${formatEur(unit)} ${isPerDay ? "p.p.p.d." : isPerPerson ? "p.p." : "totaal"}, nieuw totaal ${newTotal != null ? formatEur(newTotal) : "-"}</span>`
              : "";
            const overrideNote = it.override_people != null
              ? `<br><span style="color:#b45309;font-size:13px;">Let op: dit onderdeel heeft een eigen aantal (${it.override_people}) en volgt het projectaantal niet automatisch.</span>`
              : "";
            return `<li style="margin: 6px 0;"><strong>${sanitizeHtml(it.block_name)}</strong>: ${effPeople} pers.${priceLine}${overrideNote}</li>`;
          })
          .join("");

        const subject = `${subjectPrefix}Aantal gasten gewijzigd van ${old_people} naar ${new_people}${ref ? ` (${ref})` : ""}`;
        const html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
            <h2 style="color: #1a365d; border-bottom: 2px solid #1a365d; padding-bottom: 10px;">
              Aantal gasten gewijzigd, totaal bijgewerkt
            </h2>
            <p>Beste ${sanitizeHtml(partner?.name || firstItem.provider_name || "")},</p>
            <p>
              Het aantal gasten voor onderstaand project is aangepast van
              <strong>${old_people}</strong> naar <strong>${new_people}</strong>.
              De met u afgesproken <strong>prijs per persoon blijft staan</strong>;
              alleen het totaal beweegt mee. U hoeft hier verder niets voor te doen;
              wij informeren u ter kennisgeving.
            </p>
            <div style="background: #f0f9ff; padding: 20px; border-left: 4px solid #0284c7; border-radius: 8px; margin: 20px 0;">
              ${dates ? `<p style="margin: 0 0 8px;"><strong>Datum(s):</strong> ${dates}</p>` : ""}
              <p style="margin: 0 0 8px;"><strong>Onderde(e)l(en):</strong></p>
              <ul style="margin: 4px 0 0; padding-left: 20px;">${itemRows}</ul>
              ${noteHtmlPartner}
            </div>
            <p>
              <a href="${partnerPortalUrl}" style="display: inline-block; background: #1a365d; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 600;">
                Bekijk in het partnerportaal
              </a>
            </p>
            <p style="color: #475569; font-size: 14px;">
              Klopt er iets niet of moet de prijs anders? U kunt op deze e-mail antwoorden.
            </p>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">
            <p style="color: #666; font-size: 13px;">Referentie: ${ref || "-"}</p>
          </div>
        `;

        try {
          const messageId = await send("notify-headcount-change-bulk:partner", {
            From: { Email: "hallo@bureauvlieland.nl", Name: "Bureau Vlieland" },
            To: [{ Email: recipient, Name: partner?.name || firstItem.provider_name || undefined }],
            ...(buildReplyTo(ref) ? { ReplyTo: buildReplyTo(ref) } : {}),
            Subject: subject,
            HTMLPart: html,
          });
          await logEmail({
            mailjet_message_id: messageId ?? undefined,
            email_type: EmailTypes.PROGRAM_REQUEST_PARTNER,
            subject,
            recipient_email: recipient,
            recipient_name: partner?.name || firstItem.provider_name || undefined,
            related_request_id: program.id,
            related_partner_id: partnerId,
            status: "sent",
            sent_by: "admin",
            metadata: {
              template_name: "headcount_change_partner_bulk",
              actor: "admin → partner (aantalwijziging)",
              old_people,
              new_people,
              item_ids: grp.items!.map((i) => i.id),
            },
          });
          (results.partners as unknown[]).push({ partner_id: partnerId, sent: true, recipient });
        } catch (err) {
          console.error("partner mail error:", err);
          (results.partners as unknown[]).push({ partner_id: partnerId, sent: false, error: String(err) });
        }
      }
    }

    // ---------------- Logies-partners ----------------
    if (accommodation_quote_ids.length > 0) {
      const { data: quotes } = await supabase
        .from("accommodation_quotes")
        .select(
          "id, request_id, partner_id, accommodation_name, status, price_total, priced_for_guests, accommodation_requests!inner(id, reference_number, arrival_date, departure_date, number_of_guests, customer_name, customer_company, linked_program_id)",
        )
        .in("id", accommodation_quote_ids);

      for (const q of quotes || []) {
        // Alleen de door de klant gekozen logies-partner krijgt een aantal-
        // wijziging-mail. `submitted`/`forwarded`/`pending` = nog geen keuze.
        if (q.status !== "selected") {
          (results.accommodations as unknown[]).push({
            quote_id: q.id,
            sent: false,
            reason: "not_customer_selected",
          });
          continue;
        }
        const { data: partner } = await supabase
          .from("partners")
          .select("id, name, email, contact_email")
          .eq("id", q.partner_id)
          .maybeSingle();

        const partnerEmail = partner?.contact_email || partner?.email;
        if (!partnerEmail) {
          (results.accommodations as unknown[]).push({ quote_id: q.id, sent: false, reason: "no_email" });
          continue;
        }

        const ar = q.accommodation_requests as unknown as {
          id: string;
          reference_number: string | null;
          arrival_date: string;
          departure_date: string;
          number_of_guests: number | null;
          customer_name: string;
          customer_company: string | null;
          linked_program_id: string | null;
        };
        const recipient = getRecipientEmail(partnerEmail, origin);
        const logiesRef = ar.reference_number || ref;
        // De prijs geldt voor priced_for_guests; dat is het "oude" aantal voor de
        // partner, ook als de admin de wijziging later nog eens doorgeeft.
        const pricedFor = (q.priced_for_guests as number | null) ?? old_people;
        const newGuests = ar.number_of_guests ?? new_people;

        const { subject, html } = buildLodgingHeadcountMail({
          partnerName: partner?.name || "",
          accommodationName: q.accommodation_name || "",
          customerLabel: ar.customer_company || ar.customer_name || program?.customer_company || program?.customer_name || "de klant",
          arrival: formatDateNL(ar.arrival_date),
          departure: formatDateNL(ar.departure_date),
          oldGuests: pricedFor,
          newGuests,
          currentPriceTotal: Number(q.price_total) || null,
          reference: logiesRef || null,
          actionUrl: `${baseUrl}/partner/logies/${q.request_id}?actie=aantal`,
          note: trimmedNote || null,
          subjectPrefix,
        });

        try {
          const messageId = await send("notify-headcount-change-bulk:lodging", {
            From: { Email: "hallo@bureauvlieland.nl", Name: "Bureau Vlieland" },
            To: [{ Email: recipient, Name: partner?.name || undefined }],
            ...(buildReplyTo(logiesRef) ? { ReplyTo: buildReplyTo(logiesRef) } : {}),
            Subject: subject,
            HTMLPart: html,
          });
          await logEmail({
            mailjet_message_id: messageId ?? undefined,
            email_type: EmailTypes.ACCOMMODATION_QUOTE_REQUEST_PARTNER,
            subject,
            recipient_email: recipient,
            recipient_name: partner?.name || undefined,
            related_request_id: program?.id ?? ar.linked_program_id ?? undefined,
            related_accommodation_id: q.request_id,
            related_partner_id: q.partner_id,
            status: "sent",
            sent_by: "admin",
            metadata: {
              template_name: "headcount_change_accommodation_partner",
              actor: "admin → logies-partner (aantalwijziging, bevestiging gevraagd)",
              old_people: pricedFor,
              new_people: newGuests,
              quote_id: q.id,
            },
          });
          // Vanaf nu telt de herinnering in check-pending-items.
          if (pricedFor !== newGuests) {
            await supabase
              .from("accommodation_quotes")
              .update({ headcount_change_requested_at: new Date().toISOString() })
              .eq("id", q.id);
          }
          (results.accommodations as unknown[]).push({ quote_id: q.id, sent: true, recipient });
        } catch (err) {
          console.error("accommodation mail error:", err);
          (results.accommodations as unknown[]).push({ quote_id: q.id, sent: false, error: String(err) });
        }
      }
    }

    return jsonResponse({ success: true, results });
  } catch (error) {
    console.error("notify-headcount-change-bulk error:", error);
    return jsonResponse({ error: "Er ging iets mis bij het versturen" }, 500);
  }
};

if (import.meta.main) Deno.serve(handler);
