// Zuivere helpers voor de heads-up T-3 aan partners (notificaties fase 3):
// welke onderdelen in aanmerking komen, de variabelen voor de DB-template
// `partner_headsup_t3` en de noodrem als die template niet laadt.
import { formatDateNL, sanitizeHtml } from "../_shared/email-templates.ts";
import { expectsPartnerInvoice, isInformationalItem, type HandlingItemLike } from "../_shared/itemHandling.ts";

export const HEADSUP_TEMPLATE_ID = "partner_headsup_t3";

export interface HeadsupCandidateItem extends HandlingItemLike {
  status: string | null;
  customer_approved_at?: string | null;
  customer_accepted_at?: string | null;
}

/**
 * Welke onderdelen krijgen een heads-up?
 *
 * - `accepted`: de klant heeft het voorstel van de partner geaccepteerd
 *   (update-customer-program, per onderdeel). Was al zo.
 * - `confirmed` mét klantakkoord: in de klantreis sinds fase 4 keurt de klant
 *   het programma goed vóór de partner het ziet (customer_approved_at), en de
 *   bevestiging van de partner houdt status `confirmed`
 *   (update-partner-item-status:348). Zonder deze tak kreeg precies de
 *   gangbare route geen briefing.
 * - `confirmed` zónder klantakkoord: de klant moet nog kiezen; geen briefing.
 * - Mededelingen (`partner_handling = inform`) slaan we over: de partner is
 *   er niet bij betrokken en hoeft niets voor te bereiden
 *   (docs/plan-afhandeling-onderdelen.md: briefing optioneel).
 */
export function isHeadsupCandidate(item: HeadsupCandidateItem): boolean {
  if (isInformationalItem(item)) return false;
  if (item.status === "accepted") return true;
  if (item.status === "confirmed") return !!(item.customer_approved_at || item.customer_accepted_at);
  return false;
}

export interface HeadsupMailInput {
  partnerName: string;
  blockName: string;
  /** ISO-datum van de uitvoering. */
  activityDate: string;
  effectiveTime: string | null;
  durationMinutes: number | null;
  people: number | null;
  location: string | null;
  referenceNumber: string | null;
  customerLabel: string;
  partnerInstructions: string | null;
  guestNames: string | null;
  /** Alleen gevuld bij catering. */
  dietaryNotes: string | null;
  guestsUpdatedAt: string | null;
  /** program_requests.invoicing_mode; leeg geldt als bureau_central. */
  invoicingMode: string | null;
  item: HandlingItemLike;
  portalUrl: string;
  subjectPrefix?: string;
}

export interface HeadsupMail {
  subject: string;
  variables: Record<string, string>;
  /** Noodrem: binnenkant van de mail, door de aanroeper te wikkelen in wrapEmailHtml. */
  fallbackHtml: string;
  bureauInvoice: boolean;
}

function nlToBr(s: string | null | undefined): string {
  return sanitizeHtml(s).replace(/\n/g, "<br>");
}

export function buildHeadsupMail(input: HeadsupMailInput): HeadsupMail {
  const prefix = input.subjectPrefix ?? "";
  const ref = input.referenceNumber ?? "";
  const eventDate = formatDateNL(input.activityDate);
  // Facturatie alleen bij een onderdeel op de bureaufactuur binnen een project
  // dat centraal factureert. `admin_price_notes` is een interne prijsnotitie
  // en gaat bewust niet mee.
  const bureauInvoice = (input.invoicingMode ?? "bureau_central") === "bureau_central" && expectsPartnerInvoice(input.item);

  const variables: Record<string, string> = {
    partner_name: sanitizeHtml(input.partnerName),
    block_name: sanitizeHtml(input.blockName),
    event_date: sanitizeHtml(eventDate),
    time_info: sanitizeHtml(input.effectiveTime ?? ""),
    duration: input.durationMinutes ? `${input.durationMinutes} min` : "",
    number_of_people: input.people != null ? String(input.people) : "",
    location: sanitizeHtml(input.location ?? ""),
    reference_number: sanitizeHtml(ref),
    customer_name: sanitizeHtml(input.customerLabel),
    partner_instructions: nlToBr(input.partnerInstructions),
    guest_names: nlToBr(input.guestNames),
    dietary_notes: nlToBr(input.dietaryNotes),
    guests_updated: input.guestsUpdatedAt ? sanitizeHtml(formatDateNL(input.guestsUpdatedAt)) : "",
    bureau_invoice: bureauInvoice ? "1" : "",
    portal_url: input.portalUrl,
  };

  const subject = `${prefix}Over 3 dagen: ${input.blockName} op ${eventDate}${ref ? ` (${ref})` : ""}`;

  const v = variables;
  const row = (label: string, value: string, strong = false) =>
    value
      ? `<tr><td style="padding:4px 0;color:#6b7280;width:160px;">${label}</td><td>${strong ? `<strong>${value}</strong>` : value}</td></tr>`
      : "";
  const fallbackHtml = `
    <h2 style="color:#0F4C5C;margin:0 0 16px;">Over 3 dagen op het programma</h2>
    <p>Hoi ${v.partner_name},</p>
    <p>Over drie dagen staat <strong>${v.block_name}</strong> voor ${v.customer_name} op het programma. Hierbij de laatste stand van zaken, zodat je goed voorbereid bent.</p>
    <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin:16px 0;">
      <table style="width:100%;border-collapse:collapse;font-size:14px;">
        ${row("Datum", v.event_date, true)}
        ${row("Tijd", v.time_info, true)}
        ${row("Duur", v.duration)}
        ${row("Aantal personen", v.number_of_people, true)}
        ${row("Locatie", v.location)}
        ${row("Referentie", v.reference_number)}
      </table>
    </div>
    ${v.partner_instructions ? `<div style="background:#fff7ed;border-left:4px solid #E36414;padding:12px 14px;border-radius:6px;margin:12px 0;"><div style="font-size:12px;text-transform:uppercase;letter-spacing:0.05em;color:#92400e;margin-bottom:4px;">Instructie van Bureau Vlieland</div><div style="font-size:14px;">${v.partner_instructions}</div></div>` : ""}
    ${v.guest_names || v.dietary_notes ? `<div style="border:1px solid #e5e7eb;border-radius:8px;padding:14px;margin:12px 0;"><div style="font-weight:600;color:#0F4C5C;margin-bottom:6px;">Gastgegevens${v.guests_updated ? ` <span style="font-weight:400;color:#6b7280;font-size:12px;">(bijgewerkt op ${v.guests_updated})</span>` : ""}</div>${v.guest_names ? `<div style="font-size:13px;margin-bottom:8px;"><div style="color:#6b7280;">Gastenlijst</div>${v.guest_names}</div>` : ""}${v.dietary_notes ? `<div style="font-size:13px;"><div style="color:#6b7280;">Dieetwensen</div>${v.dietary_notes}</div>` : ""}</div>` : ""}
    ${bureauInvoice ? `<p style="font-size:13px;color:#475569;background:#f1f5f9;padding:10px 12px;border-radius:6px;"><strong>Facturatie:</strong> Mail na uitvoering de pdf van je factuur naar <a href="mailto:invoices@reply.bureauvlieland.nl">invoices@reply.bureauvlieland.nl</a>, met onze referentie ${v.reference_number} erop. Wij factureren centraal aan de klant.</p>` : ""}
    <p style="margin:20px 0;"><a href="${v.portal_url}" style="background:#0F4C5C;color:#ffffff;padding:10px 18px;border-radius:6px;text-decoration:none;display:inline-block;">Bekijk in partnerportaal</a></p>
    <p style="font-size:13px;color:#6b7280;">Vragen of wijzigingen? Reageer op deze mail; die komt direct in het dossier terecht.</p>
    <p style="font-size:13px;color:#6b7280;">Met vriendelijke groet,<br>Bureau Vlieland</p>
  `;

  return { subject, variables, fallbackHtml, bureauInvoice };
}
