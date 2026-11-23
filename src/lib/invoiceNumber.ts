/**
 * Verkoopfactuurnummers (docs/nummering.md).
 *
 * Eén reeks per jaar, alleen cijfers: JJNNNN (260041 = jaar 26, nummer 41).
 * Klantfacturen en commissiefacturen putten uit dezelfde reeks. Het nummer
 * wordt in de database toegekend (register_bureau_invoice,
 * finalize_commission_invoice); de browser bedenkt geen nummers meer.
 */

/** Tekst in een regelomschrijving die de database vervangt door het toegekende nummer. */
export const INVOICE_NUMBER_PLACEHOLDER = "{{nummer}}";

/** Wat de admin ziet zolang het nummer nog niet is toegekend. */
export const INVOICE_NUMBER_PENDING_LABEL = "Wordt toegekend bij versturen";

/** Nummer in het nieuwe formaat: twee cijfers jaar, minstens vier cijfers volgnummer. */
export function isSalesInvoiceNumber(value: string | null | undefined): boolean {
  return /^\d{6,}$/.test((value ?? "").trim());
}

/**
 * Factuurnummer zoals een klant het kan hebben ingetikt, terug naar de vorm
 * waarin wij het bewaren: hoofdletters, zonder spaties, punten en streepjes.
 * "26-0041", "26 0041" en "factuur 260041" vergelijken dan gelijk.
 */
export function normalizeInvoiceReference(value: string | null | undefined): string {
  return (value ?? "").toUpperCase().replace(/[\s.\-_/]/g, "");
}

/**
 * Staat het factuurnummer in deze tekst (bankomschrijving, onderwerp)?
 * Nummers van alleen cijfers moeten als los getal voorkomen, anders raakt
 * 260041 ook de cijfers van een IBAN of een datum.
 */
export function textMentionsInvoiceNumber(text: string | null | undefined, invoiceNumber: string | null | undefined): boolean {
  const ref = normalizeInvoiceReference(invoiceNumber);
  if (!ref) return false;
  const haystack = normalizeInvoiceReference(text);
  if (!/^\d+$/.test(ref)) return haystack.includes(ref);
  const escaped = ref.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?<!\\d)${escaped}(?!\\d)`).test(haystack);
}

/** Omschrijving voor de overschrijving: alleen het nummer, want dat is wat de klant moet vermelden. */
export function paymentDescription(invoiceNumber: string): string {
  return invoiceNumber;
}
