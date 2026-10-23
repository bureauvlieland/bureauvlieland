import { formatCurrencyNL, sanitizeHtml } from "../_shared/email-templates.ts";

/**
 * De mail aan de gekozen logiespartner na een aantalwijziging. Puur, zodat
 * de tekst getest kan worden zonder Supabase of Mailjet.
 *
 * De partner kan bij een gekozen offerte geen nieuwe offerte indienen; de
 * mail vraagt daarom expliciet om het nieuwe aantal te bevestigen via de
 * actie "Nieuw aantal bevestigen" in het partnerportaal (deep link).
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
  const noteHtml = input.note?.trim()
    ? `<p style="margin: 8px 0 0; color: #475569;"><em>Toelichting Bureau Vlieland: ${sanitizeHtml(input.note.trim())}</em></p>`
    : "";
  const priceHtml = input.currentPriceTotal && input.currentPriceTotal > 0
    ? `<p style="margin: 0 0 8px;"><strong>Huidig totaal:</strong> ${formatCurrencyNL(input.currentPriceTotal)} voor ${input.oldGuests} gasten</p>`
    : "";

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
      <h2 style="color: #1a365d; border-bottom: 2px solid #1a365d; padding-bottom: 10px;">
        Wilt u het nieuwe aantal gasten bevestigen?
      </h2>
      <p>Beste ${sanitizeHtml(input.partnerName)},</p>
      <p>
        Het aantal gasten voor de logiesaanvraag van ${sanitizeHtml(input.customerLabel)} is gewijzigd van
        <strong>${input.oldGuests}</strong> naar <strong>${input.newGuests}</strong>.
        De klant heeft uw offerte al gekozen; die blijft staan. Wij vragen u het nieuwe aantal te bevestigen
        en, als dat nodig is, het totaal aan te passen.
      </p>
      <div style="background: #f0f9ff; padding: 20px; border-left: 4px solid #0284c7; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 0 0 8px;"><strong>Logies:</strong> ${sanitizeHtml(input.accommodationName)}</p>
        <p style="margin: 0 0 8px;"><strong>Aankomst:</strong> ${sanitizeHtml(input.arrival)}</p>
        <p style="margin: 0 0 8px;"><strong>Vertrek:</strong> ${sanitizeHtml(input.departure)}</p>
        <p style="margin: 0 0 8px;"><strong>Nieuw aantal gasten:</strong> ${input.newGuests} (was ${input.oldGuests})</p>
        ${priceHtml}
        ${noteHtml}
      </div>
      <p><strong>Zo werkt het</strong></p>
      <ol style="margin: 4px 0 16px; padding-left: 20px;">
        <li style="margin: 4px 0;">Open de logiesaanvraag in het partnerportaal met de knop hieronder.</li>
        <li style="margin: 4px 0;">Kies "Nieuw aantal bevestigen" en vul het totaal voor ${input.newGuests} gasten in. Blijft de prijs gelijk, dan bevestigt u het huidige bedrag.</li>
        <li style="margin: 4px 0;">Bureau Vlieland beoordeelt uw bevestiging en informeert de klant. U hoeft geen nieuwe offerte in te dienen.</li>
      </ol>
      <p>
        <a href="${input.actionUrl}" style="display: inline-block; background: #1a365d; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 600;">
          Nieuw aantal bevestigen
        </a>
      </p>
      <p style="color: #475569; font-size: 14px;">
        Heeft u vragen? U kunt op deze e-mail antwoorden.
      </p>
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">
      <p style="color: #666; font-size: 13px;">Referentie: ${sanitizeHtml(input.reference || "-")}</p>
    </div>
  `;
  return { subject, html };
}
