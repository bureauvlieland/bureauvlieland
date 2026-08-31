/**
 * Bureau-notificaties bij logies-offerte-gebeurtenissen.
 *
 * Tot nu toe leverde een ingediende/herziene/afgewezen logiesofferte alleen
 * een werkbanktaak op. Deze helper stuurt daarnaast direct een mail naar het
 * bureau-adres, zodat een offerte niet blijft liggen tot iemand de Werkbank
 * opent. De werkbanktaak blijft leidend; de mail is een extra signaal.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendMailjet } from "./mailjet-send.ts";
import { logEmail } from "./email-logger.ts";
import {
  sanitizeHtml,
  formatDateNL,
  formatCurrencyNL,
  getRecipientEmail,
  getSubjectPrefix,
  getPortalBaseUrl,
} from "./email-templates.ts";
import { GENERAL_CONTACT_EMAIL } from "./bureau-contact.ts";

export type LodgingAlertKind = "submitted" | "revised" | "declined";

export const LodgingAlertEmailTypes: Record<LodgingAlertKind, string> = {
  submitted: "lodging_quote_submitted_bureau",
  revised: "lodging_quote_revised_bureau",
  declined: "lodging_quote_declined_bureau",
};

const ACTOR: Record<LodgingAlertKind, string> = {
  submitted: "system → bureau (logiesofferte ingediend)",
  revised: "system → bureau (logiesofferte herzien)",
  declined: "system → bureau (logiesaanvraag afgewezen)",
};

const HEADING: Record<LodgingAlertKind, string> = {
  submitted: "Nieuwe logiesofferte ontvangen",
  revised: "Herziene logiesofferte ontvangen",
  declined: "Logiesaanvraag afgewezen",
};

export interface LodgingAlertInput {
  kind: LodgingAlertKind;
  quoteId: string;
  partner: { id: string; name: string };
  accommodationName?: string | null;
  priceTotal?: number | null;
  validUntil?: string | null;
  request: {
    id: string;
    customer_name: string;
    customer_company?: string | null;
    reference_number?: string | null;
    linked_program_id?: string | null;
    arrival_date?: string | null;
    departure_date?: string | null;
    number_of_guests?: number | null;
  };
  /** Alleen bij `declined` */
  declineReason?: string | null;
  proposedArrival?: string | null;
  proposedDeparture?: string | null;
  /** Origin van de aanroepende client (voor test-mode rerouting). */
  origin?: string;
  /** Versie-marker zodat een herziening wél opnieuw mag mailen. */
  versionKey?: string | number | null;
}

export function buildLodgingAlertSubject(input: {
  kind: LodgingAlertKind;
  partnerName: string;
  customerLabel: string;
  referenceNumber?: string | null;
  hasAlternativeDates?: boolean;
}): string {
  const prefixText =
    input.kind === "submitted"
      ? "Nieuwe logiesofferte"
      : input.kind === "revised"
        ? "Herziene logiesofferte"
        : input.hasAlternativeDates
          ? "Logies: alternatieve datums"
          : "Logiesaanvraag afgewezen";
  const ref = input.referenceNumber ? ` (${input.referenceNumber})` : "";
  return `${prefixText} — ${input.partnerName} voor ${input.customerLabel}${ref}`;
}

function row(label: string, value: string): string {
  return `<tr>
    <td style="padding:6px 0; color:#64748b; font-size:14px;">${sanitizeHtml(label)}</td>
    <td style="padding:6px 0; text-align:right; font-size:14px;"><strong>${value}</strong></td>
  </tr>`;
}

function buildHtml(input: LodgingAlertInput, adminUrl: string, hasAltDates: boolean): string {
  const r = input.request;
  const customerLabel = r.customer_company || r.customer_name;
  const rows = [
    r.reference_number ? row("Project", sanitizeHtml(r.reference_number)) : "",
    row("Klant", sanitizeHtml(customerLabel)),
    row("Partner", sanitizeHtml(input.partner.name)),
    input.accommodationName ? row("Accommodatie", sanitizeHtml(input.accommodationName)) : "",
    r.arrival_date ? row("Aankomst", formatDateNL(r.arrival_date)) : "",
    r.departure_date ? row("Vertrek", formatDateNL(r.departure_date)) : "",
    r.number_of_guests ? row("Gasten", String(r.number_of_guests)) : "",
    input.kind !== "declined" && typeof input.priceTotal === "number"
      ? row("Totaal (incl. btw)", formatCurrencyNL(input.priceTotal))
      : "",
    input.kind !== "declined" && input.validUntil
      ? row("Geldig tot", formatDateNL(input.validUntil))
      : "",
    hasAltDates && input.proposedArrival && input.proposedDeparture
      ? row(
          "Voorgestelde datums",
          `${formatDateNL(input.proposedArrival)} t/m ${formatDateNL(input.proposedDeparture)}`,
        )
      : "",
  ]
    .filter(Boolean)
    .join("");

  const reasonBlock =
    input.kind === "declined" && input.declineReason
      ? `<p style="margin:16px 0 0; padding:12px 14px; background:#fef2f2; border-left:3px solid #dc2626; border-radius:4px; font-size:14px; color:#7f1d1d;">
          <strong>Reden:</strong> ${sanitizeHtml(input.declineReason)}
        </p>`
      : "";

  return `<div style="font-family: Arial, sans-serif; max-width:600px; margin:0 auto; color:#0f172a;">
    <h2 style="color:#0F4C5C; margin-bottom:4px;">${HEADING[input.kind]}</h2>
    <p style="margin:0 0 16px; color:#64748b; font-size:14px;">Interne melding — geen actie voor de klant of partner.</p>
    <table style="width:100%; border-collapse:collapse; background:#f8fafc; border-radius:8px; padding:8px;">
      ${rows}
    </table>
    ${reasonBlock}
    <p style="margin:24px 0;">
      <a href="${adminUrl}" style="background:#0F4C5C; color:#ffffff; padding:12px 20px; border-radius:6px; text-decoration:none; display:inline-block;">
        Bekijk in de admin
      </a>
    </p>
  </div>`;
}

/**
 * Verstuurt (en logt) de bureau-melding. Faalt nooit hard: de aanroepende
 * function mag hierdoor nooit de offerte-afhandeling afbreken.
 */
export async function sendLodgingBureauAlert(
  input: LodgingAlertInput,
): Promise<{ sent: boolean; skipped?: string; error?: string }> {
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const emailType = LodgingAlertEmailTypes[input.kind];
    const hasAltDates = !!(input.proposedArrival && input.proposedDeparture);
    const customerLabel = input.request.customer_company || input.request.customer_name;
    const recipient = getRecipientEmail(GENERAL_CONTACT_EMAIL, input.origin);
    const idempotencyKey = `lodging-alert-${emailType}-${input.quoteId}-${input.versionKey ?? "v1"}`;

    // Dedupe: zelfde gebeurtenis + zelfde versie ⇒ niet nogmaals mailen.
    const { data: existing } = await supabase
      .from("email_log")
      .select("id")
      .eq("email_type", emailType)
      .eq("status", "sent")
      .contains("metadata", { idempotency_key: idempotencyKey })
      .limit(1)
      .maybeSingle();

    if (existing) {
      console.log(`[lodging-bureau-alert] already sent for ${idempotencyKey}`);
      return { sent: false, skipped: "duplicate" };
    }

    const subject =
      getSubjectPrefix(input.origin) +
      buildLodgingAlertSubject({
        kind: input.kind,
        partnerName: input.partner.name,
        customerLabel,
        referenceNumber: input.request.reference_number,
        hasAlternativeDates: hasAltDates,
      });

    const baseUrl = getPortalBaseUrl(input.origin);
    const adminUrl = input.request.linked_program_id
      ? `${baseUrl}/admin/aanvragen/${input.request.linked_program_id}`
      : `${baseUrl}/admin/logies`;

    const html = buildHtml(input, adminUrl, hasAltDates);

    const result = await sendMailjet({
      source: "lodging-bureau-alert",
      checkSuppression: false,
      messages: [
        {
          From: { Email: GENERAL_CONTACT_EMAIL, Name: "Bureau Vlieland" },
          To: [{ Email: recipient, Name: "Bureau Vlieland" }],
          Subject: subject,
          HTMLPart: html,
        },
      ],
    });

    await logEmail({
      email_type: emailType,
      subject,
      recipient_email: recipient,
      recipient_name: "Bureau Vlieland",
      related_request_id: input.request.linked_program_id ?? undefined,
      related_accommodation_id: input.request.id,
      related_partner_id: input.partner.id,
      status: result.ok ? "sent" : "failed",
      error_message: result.ok ? undefined : result.error,
      mailjet_message_id: result.ok ? (result.messageId ?? undefined) : undefined,
      sent_by: "system",
      html_body: html,
      from_email: GENERAL_CONTACT_EMAIL,
      idempotency_key: idempotencyKey,
      metadata: {
        template_name: emailType,
        actor: ACTOR[input.kind],
        idempotency_key: idempotencyKey,
        quote_id: input.quoteId,
        ...(input.kind === "declined" ? { alternative_dates: hasAltDates } : {}),
        ...(result.ok ? {} : { failure: true }),
      },
    });

    return result.ok ? { sent: true, skipped: result.skipped } : { sent: false, error: result.error };
  } catch (error) {
    console.error("[lodging-bureau-alert] failed:", error);
    return { sent: false, error: String(error) };
  }
}
