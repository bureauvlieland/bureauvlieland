// Teksten van de twee cateringmails (klantbevestiging en bureaumelding), los
// van Deno.serve zodat de test ze kan importeren. De huisstijlwrapper
// (wrapEmailHtml) komt er in index.ts omheen; hier alleen de binnenkant.

import { sanitizeHtml } from "../_shared/email-templates.ts";

/** Wat de site de klant belooft (src/content/promises.ts, RESPONSE_TIME). */
export const CATERING_RESPONSE_PROMISE = "binnen 5 werkdagen";

export interface CateringItem {
  name: string;
  role?: string | null;
  provider?: string | null;
  priceIndication?: string | null;
}

export interface CateringMailInput {
  requestId: string;
  /** BV-nummer, als de aanvraag er al een heeft. */
  referenceNumber: string;
  contact: { name: string; company: string; email: string; phone: string; notes: string; dietary: string };
  cateringType: string;
  date: string;
  startTime: string;
  locationText: string;
  hasHorecaOnSite: boolean | null | undefined;
  guests: number;
  items: CateringItem[];
  indicativeTotal: number | null | undefined;
  /** Basis-URL van de admin (getPortalBaseUrl). */
  baseUrl: string;
}

export const fmtEur = (n: number | null | undefined): string =>
  typeof n === "number" ? `€ ${n.toLocaleString("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "Op aanvraag";

export function horecaLabel(value: boolean | null | undefined): string {
  return value === true ? "Ja" : value === false ? "Nee" : "Onbekend";
}

function itemsHtml(items: CateringItem[]): string {
  if (!items.length) return `<p style="color:#666;">Maatwerk — invulling volgt in afstemming.</p>`;
  return `<ul style="padding-left:18px;margin:8px 0;">${items
    .map(
      (i) => `<li style="margin-bottom:6px;">
              <strong>${sanitizeHtml(i.name)}</strong>${i.role ? ` <span style="color:#666;font-size:12px;">(${sanitizeHtml(i.role)})</span>` : ""}
              ${i.provider ? `<br><span style="color:#666;font-size:12px;">${sanitizeHtml(i.provider)}</span>` : ""}
              ${i.priceIndication ? `<br><span style="color:#666;font-size:12px;">${sanitizeHtml(i.priceIndication)}</span>` : ""}
            </li>`,
    )
    .join("")}</ul>`;
}

/** Onderwerp van de klantbevestiging, met dossiernummer als dat er is. */
export function customerSubject(referenceNumber: string): string {
  return `Bevestiging van uw cateringaanvraag${referenceNumber ? ` (${referenceNumber})` : ""}`;
}

/** Onderwerp van de bureaumelding: type, aantal, datum en dossiernummer. */
export function bureauSubject(input: Pick<CateringMailInput, "cateringType" | "guests" | "date" | "referenceNumber">): string {
  const ref = input.referenceNumber ? ` (${input.referenceNumber})` : "";
  return `Nieuwe cateringaanvraag — ${input.cateringType} · ${input.guests} personen · ${input.date}${ref}`;
}

/** Deeplink naar de aanvraag in de admin (route /admin/aanvragen/:id). */
export function adminRequestUrl(baseUrl: string, requestId: string): string {
  return `${baseUrl}/admin/aanvragen/${requestId}`;
}

/** Klantbevestiging (u-vorm), binnenkant voor de wrapper. */
export function buildCustomerHtml(input: CateringMailInput): string {
  const safe = {
    name: sanitizeHtml(input.contact.name),
    notes: sanitizeHtml(input.contact.notes),
    dietary: sanitizeHtml(input.contact.dietary),
    type: sanitizeHtml(input.cateringType),
    date: sanitizeHtml(input.date),
    startTime: sanitizeHtml(input.startTime),
    location: sanitizeHtml(input.locationText),
    ref: sanitizeHtml(input.referenceNumber),
  };
  const indicative = fmtEur(input.indicativeTotal ?? null);
  return `
      <h2 style="color:#0F4C5C;margin:0 0 8px;">Beste ${safe.name},</h2>
      <p>Hartelijk dank voor uw cateringaanvraag bij Bureau Vlieland. Wij hebben uw aanvraag in goede orde ontvangen en nemen <strong>${CATERING_RESPONSE_PROMISE}</strong> contact met u op met een definitieve offerte.</p>

      <h3 style="color:#0F4C5C;margin-top:24px;">Uw aanvraag</h3>
      <table style="width:100%;border-collapse:collapse;font-size:14px;">
        <tr><td style="padding:6px 0;color:#555;width:160px;">Type</td><td style="padding:6px 0;"><strong>${safe.type}</strong></td></tr>
        <tr><td style="padding:6px 0;color:#555;">Datum</td><td style="padding:6px 0;">${safe.date}${safe.startTime ? ` om ${safe.startTime}` : ""}</td></tr>
        <tr><td style="padding:6px 0;color:#555;">Aantal gasten</td><td style="padding:6px 0;">${input.guests}</td></tr>
        <tr><td style="padding:6px 0;color:#555;">Locatie</td><td style="padding:6px 0;">${safe.location}</td></tr>
        <tr><td style="padding:6px 0;color:#555;">Horeca op locatie</td><td style="padding:6px 0;">${horecaLabel(input.hasHorecaOnSite)}</td></tr>
        ${safe.ref ? `<tr><td style="padding:6px 0;color:#555;">Referentie</td><td style="padding:6px 0;">${safe.ref}</td></tr>` : ""}
      </table>

      <h3 style="color:#0F4C5C;margin-top:24px;">Samenstelling</h3>
      ${itemsHtml(input.items)}

      <p style="background:#f7fafc;padding:12px 14px;border-left:3px solid #0F4C5C;margin-top:16px;">
        <strong>Indicatieve prijs:</strong> ${indicative} (incl. btw)<br>
        <span style="font-size:12px;color:#555;">Drank is altijd een p.m.-post en wordt na afloop op nacalculatie verrekend. De definitieve prijs staat in de offerte.</span>
      </p>

      ${safe.dietary ? `<h3 style="color:#0F4C5C;margin-top:24px;">Dieetwensen</h3><p>${safe.dietary.replace(/\n/g, "<br>")}</p>` : ""}
      ${safe.notes ? `<h3 style="color:#0F4C5C;margin-top:24px;">Uw opmerkingen</h3><p>${safe.notes.replace(/\n/g, "<br>")}</p>` : ""}

      <p style="margin-top:24px;">Heeft u nog vragen? Beantwoord deze e-mail of bel ons op <strong>0562 700 208</strong>.</p>
      <p>Met vriendelijke groet,<br><strong>Bureau Vlieland</strong></p>
  `;
}

/** Bureaumelding: zakelijk, zonder aanhef, met "Aan zet" en de beloofde termijn. */
export function buildBureauHtml(input: CateringMailInput): string {
  const safe = {
    name: sanitizeHtml(input.contact.name),
    company: sanitizeHtml(input.contact.company),
    email: sanitizeHtml(input.contact.email),
    phone: sanitizeHtml(input.contact.phone),
    notes: sanitizeHtml(input.contact.notes),
    dietary: sanitizeHtml(input.contact.dietary),
    type: sanitizeHtml(input.cateringType),
    date: sanitizeHtml(input.date),
    startTime: sanitizeHtml(input.startTime),
    location: sanitizeHtml(input.locationText),
    ref: sanitizeHtml(input.referenceNumber),
  };
  const indicative = fmtEur(input.indicativeTotal ?? null);
  const url = adminRequestUrl(input.baseUrl, input.requestId);
  return `
      <h2 style="color:#0F4C5C;margin:0 0 8px;">Nieuwe cateringaanvraag${safe.ref ? ` — ${safe.ref}` : ""}</h2>
      <p style="margin:0 0 16px;"><strong>Aan zet:</strong> Bureau Vlieland — de klant is ${CATERING_RESPONSE_PROMISE} een definitieve offerte beloofd.</p>
      <h3>Klant</h3>
      <p>
        <strong>${safe.name}</strong>${safe.company ? ` — ${safe.company}` : ""}<br>
        ${safe.email} · ${safe.phone}
      </p>
      <h3>Catering</h3>
      <ul>
        <li><strong>Type:</strong> ${safe.type}</li>
        <li><strong>Datum:</strong> ${safe.date}${safe.startTime ? ` om ${safe.startTime}` : ""}</li>
        <li><strong>Gasten:</strong> ${input.guests}</li>
        <li><strong>Locatie:</strong> ${safe.location}</li>
        <li><strong>Horeca op locatie:</strong> ${horecaLabel(input.hasHorecaOnSite)}</li>
        <li><strong>Indicatieve prijs (incl. btw):</strong> ${indicative}</li>
      </ul>
      <h3>Samenstelling</h3>
      ${itemsHtml(input.items)}
      ${safe.dietary ? `<h3>Dieet</h3><p>${safe.dietary.replace(/\n/g, "<br>")}</p>` : ""}
      ${safe.notes ? `<h3>Opmerkingen klant</h3><p>${safe.notes.replace(/\n/g, "<br>")}</p>` : ""}
      <p style="margin:24px 0;"><a href="${url}" style="display:inline-block;padding:12px 20px;background:#0F4C5C;color:#ffffff;text-decoration:none;border-radius:6px;">Open de aanvraag</a></p>
  `;
}
