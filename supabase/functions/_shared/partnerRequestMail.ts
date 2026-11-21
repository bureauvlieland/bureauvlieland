// Eén tekst voor de partneraanvraag (program_request_partner), zie
// docs/plan-notificaties.md §5 fase 3 en docs/plan-afhandeling-onderdelen.md.
//
// Gebruikt door send-items-to-partners (eerste verzending én herinnering),
// accept-quote-proposal (admin-pad na klantakkoord) en als noodrem in
// approve-quote-item wanneer de databasetemplate niet laadt. De generator is
// zuiver (geen Supabase, geen Mailjet) zodat de tekst getest kan worden; de
// aanroeper zet het resultaat in de huisstijl met wrapEmailHtml.
//
// Drie onderdeelsoorten (_shared/itemHandling.ts): offerte (prijs gevraagd),
// bevestiging (één klik, geen prijs), mededeling (geen reactie). De mail vraagt
// nooit om een prijs of bevestiging bij een soort die dat niet kent en noemt
// facturatie alleen bij onderdelen op de bureaufactuur.
import { formatDateNL, renderEffectiveTimeLine, sanitizeHtml, type ItemTimeFields } from "./email-templates.ts";
import {
  expectsPartnerInvoice,
  partnerBillingNote,
  partnerHandlingOf,
  type HandlingItemLike,
  type PartnerHandling,
} from "./itemHandling.ts";

export interface PartnerRequestMailItem extends HandlingItemLike, ItemTimeFields {
  block_name: string;
}

export interface PartnerRequestMailInput {
  /** Naam van de partner (bedrijfsnaam of contactpersoon), ongesanitized. */
  partnerName: string;
  /** BV-nummer van het dossier; mag ontbreken (dan geen referentieregel). */
  referenceNumber: string | null | undefined;
  /** Bedrijfsnaam van de klant, anders de naam. */
  customerLabel: string | null | undefined;
  /** ISO-datums (YYYY-MM-DD) van het programma. */
  dates: string[] | null | undefined;
  numberOfPeople: number | string | null | undefined;
  items: PartnerRequestMailItem[];
  portalUrl: string;
  /** De klant heeft de voorwaarden ondertekend (program_requests.terms_accepted_at). */
  customerSigned: boolean;
  /** Herinnering aan een eerder verstuurde aanvraag die nog open staat. */
  reminder?: boolean;
  /** Testmodus-prefix voor het onderwerp (getSubjectPrefix). */
  subjectPrefix?: string;
}

export interface PartnerRequestMail {
  subject: string;
  /** Binnenkant van de mail; de aanroeper wikkelt dit in wrapEmailHtml. */
  html: string;
  /** Minstens één onderdeel landt op de bureaufactuur: facturatie-alinea getoond. */
  anyBureauInvoice: boolean;
  /** Alle onderdelen zijn mededelingen: geen actie gevraagd. */
  allInform: boolean;
}

/** De vaste factuurinstructie aan partners (letterlijk gelijk in alle mails). */
export function partnerInvoiceInstruction(referenceNumber: string | null | undefined): string {
  const ref = referenceNumber ? ` ${sanitizeHtml(referenceNumber)}` : "";
  return `Mail na uitvoering de pdf van je factuur naar <a href="mailto:invoices@reply.bureauvlieland.nl">invoices@reply.bureauvlieland.nl</a>, met onze referentie${ref} erop. Wij factureren centraal aan de klant.`;
}

/** Korte regel per onderdeel over wat we van de partner verwachten. */
export function partnerHandlingLine(handling: PartnerHandling): string {
  switch (handling) {
    case "confirm":
      return "Alleen even bevestigen dat dit geregeld is; een prijs of offerte is niet nodig.";
    case "inform":
      return "Ter kennisgeving, je hoeft hier niets mee te doen.";
    default:
      return "Bevestig dit onderdeel in het partnerportaal en geef daarbij je prijs door.";
  }
}

/** Korte samenvatting van de onderdelen voor het onderwerp. */
export function itemsSummary(items: PartnerRequestMailItem[]): string {
  if (items.length === 1) return items[0].block_name;
  return `${items.length} onderdelen`;
}

export function buildPartnerRequestMail(input: PartnerRequestMailInput): PartnerRequestMail {
  const prefix = input.subjectPrefix ?? "";
  const reminder = !!input.reminder;
  const ref = input.referenceNumber ? String(input.referenceNumber) : "";
  const refSuffix = ref ? ` (${ref})` : "";
  const summary = itemsSummary(input.items);

  const anyBureauInvoice = input.items.some((item) => expectsPartnerInvoice(item));
  const allInform = input.items.length > 0 && input.items.every((item) => partnerHandlingOf(item) === "inform");
  const anyQuote = input.items.some((item) => partnerHandlingOf(item) === "quote");

  const formattedDates = (input.dates ?? []).filter(Boolean).map((d) => formatDateNL(d)).join(", ");
  const customerLabel = sanitizeHtml(input.customerLabel || "");

  const itemsHtml = input.items
    .map((item) => {
      const handling = partnerHandlingOf(item);
      const billing = partnerBillingNote(item);
      return `<li style="margin-bottom:12px;">
        <strong>${sanitizeHtml(item.block_name)}</strong>
        ${renderEffectiveTimeLine(item, "Tijd")}
        <div style="color:#555;font-size:13px;">${partnerHandlingLine(handling)}</div>
        ${billing ? `<div style="color:#555;font-size:13px;">${sanitizeHtml(billing)}</div>` : ""}
      </li>`;
    })
    .join("");

  let headline: string;
  let subject: string;
  let intro: string;
  if (reminder) {
    headline = "Herinnering: aanvraag staat nog open";
    subject = `${prefix}Herinnering: ${summary} staat nog open${refSuffix}`;
    intro = `<p>Een vriendelijke herinnering: onderstaande aanvraag staat nog open in je partnerportaal en wacht op je reactie.</p>`;
  } else if (allInform) {
    headline = input.customerSigned ? "Ter kennisgeving: programma van de klant" : "Ter kennisgeving: aanvraag via Bureau Vlieland";
    subject = `${prefix}Ter kennisgeving: ${summary}${refSuffix}`;
    intro = input.customerSigned
      ? `<p>De klant heeft het programma akkoord gegeven en getekend. Onderstaande onderdelen staan definitief in het programma; we geven ze je hierbij ter kennisgeving door. Je hoeft hier niets mee te doen.</p>`
      : `<p>Onderstaande onderdelen staan in het programma van deze klant; we geven ze je hierbij ter kennisgeving door. De klant heeft nog niet getekend. Je hoeft hier niets mee te doen.</p>`;
  } else if (input.customerSigned) {
    headline = "Aanvraag bevestigd door klant";
    subject = `${prefix}Aanvraag bevestigd door klant: ${summary}${refSuffix}`;
    intro = `<p>Goed nieuws: de klant heeft het programma akkoord gegeven en getekend. Wij hebben onderstaande onderdelen definitief in het programma opgenomen en vragen je ze via het partnerportaal te bevestigen${anyQuote ? ", met je prijs erbij waar we daarom vragen" : ""}.</p>`;
  } else {
    headline = "Aanvraag via Bureau Vlieland";
    subject = `${prefix}Aanvraag via Bureau Vlieland: ${summary}${refSuffix}`;
    intro = `<p>Wij zetten onderstaande onderdelen alvast bij je uit. De klant heeft het programma nog niet getekend; de aanvraag is daarmee nog onder voorbehoud. Wil je via het partnerportaal laten weten of het past${anyQuote ? ", met je prijs erbij waar we daarom vragen" : ""}? Zodra de klant tekent, hoor je dat van ons.</p>`;
  }

  const buttonLabel = allInform ? "Bekijk in partnerportaal" : "Reageer in partnerportaal";

  const billingParagraph = anyBureauInvoice
    ? `<p style="background:#f0f4ff;padding:12px 16px;border-left:3px solid #0F4C5C;border-radius:4px;color:#374151;font-size:14px;margin:16px 0;">
        <strong>Facturatie:</strong> ${partnerInvoiceInstruction(ref)}
      </p>`
    : "";

  const html = `
    <h2 style="color:#0F4C5C;margin:0 0 16px;">${headline}</h2>
    <p>Hoi ${sanitizeHtml(input.partnerName)},</p>
    ${intro}
    <div style="background:#f7fafc;padding:20px;border-radius:8px;margin:20px 0;">
      <h3 style="margin:0 0 12px;color:#2d3748;font-size:15px;">Aanvraag</h3>
      <table style="width:100%;border-collapse:collapse;">
        ${ref ? `<tr><td style="padding:5px 0;color:#666;">Referentie:</td><td style="padding:5px 0;"><strong>${sanitizeHtml(ref)}</strong></td></tr>` : ""}
        <tr><td style="padding:5px 0;color:#666;">Klant:</td><td style="padding:5px 0;"><strong>${customerLabel || "-"}</strong></td></tr>
        <tr><td style="padding:5px 0;color:#666;">Datum(s):</td><td style="padding:5px 0;"><strong>${formattedDates || "-"}</strong></td></tr>
        <tr><td style="padding:5px 0;color:#666;">Aantal personen:</td><td style="padding:5px 0;"><strong>${input.numberOfPeople ?? "-"}</strong></td></tr>
      </table>
    </div>
    <div style="background:#edf7ed;padding:20px;border-radius:8px;margin:20px 0;border-left:4px solid #48bb78;">
      <h3 style="margin:0 0 12px;color:#276749;font-size:15px;">Onderdelen voor jou</h3>
      <ul style="padding-left:20px;margin:0;">${itemsHtml}</ul>
    </div>
    <div style="text-align:center;margin:24px 0;">
      <a href="${input.portalUrl}" style="display:inline-block;background:#0F4C5C;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:6px;font-weight:600;">${buttonLabel}</a>
    </div>
    ${billingParagraph}
    <p style="color:#374151;font-size:14px;">Vragen? Reageer op deze mail; wij staan tussen jou en de klant in.</p>
    <p style="margin-top:24px;">Met vriendelijke groet,<br><strong>Bureau Vlieland</strong></p>
  `;

  return { subject, html, anyBureauInvoice, allInform };
}
