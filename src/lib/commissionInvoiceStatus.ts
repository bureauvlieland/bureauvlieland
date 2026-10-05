/**
 * Levenscyclus van een commissiefactuur (docs/plan-commissiefacturen.md, fase 2).
 *
 *   draft → final → sent → forwarded → paid
 *                                     ↘ credited (vanaf final)
 *
 * Een concept heeft geen nummer en mag bewerkt en verwijderd worden. Bij
 * "Definitief maken" krijgt de factuur haar nummer uit de maandreeks en ligt
 * ze vast; fouten daarna worden met een creditnota hersteld. De database
 * bewaakt dezelfde regels (guard_commission_invoice_lifecycle); dit bestand
 * bepaalt alleen welke knoppen het scherm toont.
 */

export type CommissionInvoiceStatus =
  | "draft"
  | "final"
  | "sent"
  | "forwarded"
  | "paid"
  | "credited";

export const COMMISSION_INVOICE_STATUS_LABELS: Record<CommissionInvoiceStatus, string> = {
  draft: "Concept",
  final: "Definitief",
  sent: "Verstuurd",
  forwarded: "Doorgestuurd",
  paid: "Betaald",
  credited: "Gecrediteerd",
};

export const COMMISSION_INVOICE_STATUS_ORDER: CommissionInvoiceStatus[] = [
  "draft",
  "final",
  "sent",
  "forwarded",
  "paid",
  "credited",
];

/** Statussen waarin een factuur gecrediteerd kan worden. */
export const CREDITABLE_STATUSES: CommissionInvoiceStatus[] = ["final", "sent", "forwarded", "paid"];

/** Nummer zoals het scherm het toont: een concept heeft er nog geen. */
export function commissionInvoiceLabel(invoice: {
  invoice_number: string | null;
  status: string;
}): string {
  return invoice.invoice_number ?? (invoice.status === "draft" ? "Concept" : "–");
}

/** Welke handelingen mogen in deze status. */
export function commissionInvoiceActions(status: string) {
  return {
    /** Regels, datum en opmerkingen aanpassen. */
    edit: status === "draft",
    /** Kop en regels weg, bronnen weer vrij. */
    delete: status === "draft",
    /** Nummer uitgeven, PDF maken, bronnen op gefactureerd. */
    finalize: status === "draft",
    /** Mail met PDF naar de partner; herverzenden mag. */
    send: status === "final" || status === "sent",
    /** Naar de boekhouding; alleen na versturen. */
    forward: status === "sent",
    /** Betaald markeren; alleen na versturen of doorsturen. */
    markPaid: status === "sent" || status === "forwarded",
    /** Creditnota maken; de bronnen komen weer vrij. Alleen voor definitieve facturen. */
    credit: CREDITABLE_STATUSES.includes(status as CommissionInvoiceStatus),
  };
}


/**
 * Telt mee in het totaal: alles behalve concepten. Een gecrediteerde factuur
 * en haar creditnota tellen allebei mee en heffen elkaar op.
 */
export function countsTowardsTotal(status: string): boolean {
  return status !== "draft";
}

export interface PartnerInvoiceDetails {
  name?: string | null;
  email?: string | null;
  contact_email?: string | null;
  address_street?: string | null;
  address_postal?: string | null;
  address_city?: string | null;
  kvk_number?: string | null;
}

export interface PartnerInvoiceCheck {
  /** Zonder deze velden kan de factuur niet definitief worden. */
  blocking: string[];
  /** Mag ontbreken, maar hoort op een factuur. */
  warnings: string[];
}

const filled = (value: string | null | undefined) => (value ?? "").trim() !== "";

/**
 * Controle van de partnergegevens vóór "Definitief maken". Naam, adres en
 * e-mailadres zijn verplicht (naam en adres horen op de factuur, het
 * e-mailadres is nodig om hem te versturen). KvK is een waarschuwing.
 */
export function checkPartnerInvoiceDetails(partner: PartnerInvoiceDetails | null): PartnerInvoiceCheck {
  if (!partner) return { blocking: ["partner"], warnings: [] };
  const blocking: string[] = [];
  const warnings: string[] = [];
  if (!filled(partner.name)) blocking.push("naam");
  if (!filled(partner.contact_email) && !filled(partner.email)) blocking.push("e-mailadres");
  if (!filled(partner.address_street)) blocking.push("straat");
  if (!filled(partner.address_postal)) warnings.push("postcode");
  if (!filled(partner.address_city)) blocking.push("plaats");
  if (!filled(partner.kvk_number)) warnings.push("KvK-nummer");
  return { blocking, warnings };
}

/** Pad in de bucket `commission-invoices` waar de PDF van een factuur staat. */
export function commissionInvoicePdfPath(partnerId: string, invoiceNumber: string): string {
  return `${partnerId}/${invoiceNumber}.pdf`;
}
