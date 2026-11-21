// Eén tekst voor de aantalwijzigingsmails aan partners (notificaties fase 3).
//
// Gebruikt door notify-headcount-change-bulk (alle goedgekeurde onderdelen
// van een project, plus de gekozen logiespartner) en
// notify-partner-headcount-change (één onderdeel). Voorheen hadden die drie
// eigen teksten, waarvan twee in de u-vorm. De generators zijn zuiver; de
// aanroeper wikkelt het resultaat in wrapEmailHtml.
import { formatCurrencyNL, sanitizeHtml } from "./email-templates.ts";

export interface HeadcountMailItem {
  blockName: string;
  /** Het aantal dat voor dit onderdeel geldt (override_people of het nieuwe projectaantal). */
  people: number;
  /** Prijs per eenheid zoals met de partner afgesproken (admin_price_override), of null. */
  unitPrice: number | null;
  priceType: string | null;
  /** Nieuw totaal na herberekening, of null als er geen prijs bekend is. */
  newTotal: number | null;
  /** Vorig totaal (quoted_price), alleen bekend bij de per-onderdeel-variant. */
  oldTotal?: number | null;
  /** Eigen aantal op het onderdeel dat het projectaantal niet volgt. */
  overridePeople?: number | null;
}

export interface PartnerHeadcountMailInput {
  partnerName: string;
  customerLabel: string | null | undefined;
  reference: string | null | undefined;
  /** Al opgemaakt, bijvoorbeeld "vrijdag 4 december 2026". */
  dates: string;
  /** Vorig projectaantal; onbekend bij de per-onderdeel-variant. */
  oldPeople: number | null;
  newPeople: number;
  items: HeadcountMailItem[];
  note?: string | null;
  portalUrl: string;
  subjectPrefix?: string;
}

function unitLabel(priceType: string | null): string {
  if (priceType === "per_person_per_day") return "p.p.p.d.";
  if (priceType === "per_person") return "p.p.";
  return "totaal";
}

function noteHtml(note: string | null | undefined): string {
  const trimmed = note?.trim();
  return trimmed
    ? `<p style="margin:8px 0 0;color:#475569;"><em>Toelichting Bureau Vlieland: ${sanitizeHtml(trimmed)}</em></p>`
    : "";
}

/** Aantalwijziging voor activiteiten, catering en andere onderdelen: ter info, prijs p.p. blijft staan. */
export function buildPartnerHeadcountMail(input: PartnerHeadcountMailInput): { subject: string; html: string } {
  const ref = input.reference ? String(input.reference) : "";
  const refSuffix = ref ? ` (${ref})` : "";
  const summary = input.items.length === 1 ? input.items[0].blockName : `${input.items.length} onderdelen`;
  const change = input.oldPeople != null
    ? `van ${input.oldPeople} naar ${input.newPeople}`
    : `naar ${input.newPeople}`;
  const subject = `${input.subjectPrefix ?? ""}Aantal gasten gewijzigd ${change}: ${summary}${refSuffix}`;

  const itemRows = input.items
    .map((it) => {
      const priceLine = it.unitPrice != null
        ? `<br><span style="color:#475569;">${formatCurrencyNL(it.unitPrice)} ${unitLabel(it.priceType)}, nieuw totaal ${it.newTotal != null ? formatCurrencyNL(it.newTotal) : "-"}${it.oldTotal != null ? ` <span style="color:#64748b;">(was ${formatCurrencyNL(it.oldTotal)})</span>` : ""}</span>`
        : "";
      const overrideNote = it.overridePeople != null
        ? `<br><span style="color:#b45309;font-size:13px;">Let op: dit onderdeel heeft een eigen aantal (${it.overridePeople}) en volgt het projectaantal niet automatisch.</span>`
        : "";
      return `<li style="margin:6px 0;"><strong>${sanitizeHtml(it.blockName)}</strong>: ${it.people} pers.${priceLine}${overrideNote}</li>`;
    })
    .join("");

  const html = `
    <h2 style="color:#0F4C5C;margin:0 0 16px;">Aantal gasten gewijzigd, totaal bijgewerkt</h2>
    <p>Hoi ${sanitizeHtml(input.partnerName)},</p>
    <p>
      Het aantal gasten voor ${input.customerLabel ? `het programma van <strong>${sanitizeHtml(input.customerLabel)}</strong>` : "onderstaand programma"} is aangepast ${change}.
      De met jou afgesproken <strong>prijs per persoon blijft staan</strong>; alleen het totaal beweegt mee met het nieuwe aantal.
      Je hoeft hier verder niets voor te doen; we informeren je ter kennisgeving.
    </p>
    <div style="background:#f0f9ff;padding:20px;border-left:4px solid #0284c7;border-radius:8px;margin:20px 0;">
      ${input.dates ? `<p style="margin:0 0 8px;"><strong>Datum(s):</strong> ${sanitizeHtml(input.dates)}</p>` : ""}
      <p style="margin:0 0 8px;"><strong>Nieuw aantal gasten:</strong> ${input.newPeople}${input.oldPeople != null ? ` (was ${input.oldPeople})` : ""}</p>
      <p style="margin:0 0 4px;"><strong>${input.items.length === 1 ? "Onderdeel" : "Onderdelen"}:</strong></p>
      <ul style="margin:0;padding-left:20px;">${itemRows}</ul>
      ${noteHtml(input.note)}
    </div>
    <p>
      <a href="${input.portalUrl}" style="display:inline-block;background:#0F4C5C;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:6px;font-weight:600;">Bekijk in partnerportaal</a>
    </p>
    <p style="color:#475569;font-size:14px;">Klopt er iets niet, of moet de prijs anders? Reageer dan op deze mail.</p>
    ${ref ? `<p style="color:#666;font-size:13px;">Referentie: ${sanitizeHtml(ref)}</p>` : ""}
  `;
  return { subject, html };
}

/**
 * De mail aan de gekozen logiespartner na een aantalwijziging. De partner kan
 * bij een gekozen offerte geen nieuwe offerte indienen; de mail vraagt daarom
 * om het nieuwe aantal te bevestigen via "Nieuw aantal bevestigen" in het
 * partnerportaal (docs/plan-logies-aantalwijziging.md).
 */
export interface LodgingHeadcountMailInput {
  partnerName: string;
  accommodationName: string;
  customerLabel: string;
  /** Al opgemaakt, bijvoorbeeld "5 november 2026". */
  arrival: string;
  departure: string;
  oldGuests: number;
  newGuests: number;
  currentPriceTotal: number | null;
  reference: string | null;
  actionUrl: string;
  note?: string | null;
  subjectPrefix?: string;
}

export function buildLodgingHeadcountMail(input: LodgingHeadcountMailInput): { subject: string; html: string } {
  const ref = input.reference ? ` (${input.reference})` : "";
  const subject = `${input.subjectPrefix ?? ""}Nieuw aantal gasten bevestigen: ${input.newGuests} in plaats van ${input.oldGuests}${ref}`;
  const priceHtml = input.currentPriceTotal && input.currentPriceTotal > 0
    ? `<p style="margin:0 0 8px;"><strong>Huidig totaal:</strong> ${formatCurrencyNL(input.currentPriceTotal)} voor ${input.oldGuests} gasten</p>`
    : "";

  const html = `
    <h2 style="color:#0F4C5C;margin:0 0 16px;">Wil je het nieuwe aantal gasten bevestigen?</h2>
    <p>Hoi ${sanitizeHtml(input.partnerName)},</p>
    <p>
      Het aantal gasten voor de logiesaanvraag van ${sanitizeHtml(input.customerLabel)} is gewijzigd van
      <strong>${input.oldGuests}</strong> naar <strong>${input.newGuests}</strong>.
      De klant heeft je offerte al gekozen; die blijft staan. Wil je het nieuwe aantal bevestigen
      en, als dat nodig is, het totaal aanpassen?
    </p>
    <div style="background:#f0f9ff;padding:20px;border-left:4px solid #0284c7;border-radius:8px;margin:20px 0;">
      <p style="margin:0 0 8px;"><strong>Logies:</strong> ${sanitizeHtml(input.accommodationName)}</p>
      <p style="margin:0 0 8px;"><strong>Aankomst:</strong> ${sanitizeHtml(input.arrival)}</p>
      <p style="margin:0 0 8px;"><strong>Vertrek:</strong> ${sanitizeHtml(input.departure)}</p>
      <p style="margin:0 0 8px;"><strong>Nieuw aantal gasten:</strong> ${input.newGuests} (was ${input.oldGuests})</p>
      ${priceHtml}
      ${noteHtml(input.note)}
    </div>
    <p><strong>Zo werkt het</strong></p>
    <ol style="margin:4px 0 16px;padding-left:20px;">
      <li style="margin:4px 0;">Open de logiesaanvraag in het partnerportaal met de knop hieronder.</li>
      <li style="margin:4px 0;">Kies "Nieuw aantal bevestigen" en vul het totaal voor ${input.newGuests} gasten in. Blijft de prijs gelijk, dan bevestig je het huidige bedrag.</li>
      <li style="margin:4px 0;">Bureau Vlieland beoordeelt je bevestiging en informeert de klant. Je hoeft geen nieuwe offerte in te dienen.</li>
    </ol>
    <p>
      <a href="${input.actionUrl}" style="display:inline-block;background:#0F4C5C;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:6px;font-weight:600;">Nieuw aantal bevestigen</a>
    </p>
    <p style="color:#475569;font-size:14px;">Heb je vragen? Reageer dan op deze mail.</p>
    <p style="color:#666;font-size:13px;">Referentie: ${sanitizeHtml(input.reference || "-")}</p>
  `;
  return { subject, html };
}
