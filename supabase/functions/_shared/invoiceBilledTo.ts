// Eén bron van waarheid voor "aan wie factureerde de partner?".
// Wordt gebruikt door het partnerportaal en de admin (via
// src/lib/invoiceBilledTo.ts) én door de edge functions.
//
// Een inkoopfactuur is tot nu toe altijd een factuur aan Bureau Vlieland:
// commissiegrondslag én openstaande post die het bureau doorstuurt en
// betaalt. Rekent de partner rechtstreeks met de gast af (de gast betaalt
// het hotel of de activiteit zelf, de boeking liep wel via het bureau), dan
// is de factuur wél grondslag voor de commissie maar géén post voor het
// bureau. Zie docs/factuur-aan-de-gast.md.

export type InvoiceBilledTo = "bureau" | "customer";

export const INVOICE_BILLED_TO_VALUES: readonly InvoiceBilledTo[] = ["bureau", "customer"] as const;

/** Korte labels voor pills en keuzekaarten. */
export const INVOICE_BILLED_TO_LABELS: Record<InvoiceBilledTo, string> = {
  bureau: "Aan Bureau Vlieland",
  customer: "Aan de gast",
};

/** Onbekende of lege waarde valt terug op de default van de database. */
export function normalizeBilledTo(value: unknown): InvoiceBilledTo {
  return value === "customer" ? "customer" : "bureau";
}

export function isValidBilledTo(value: unknown): value is InvoiceBilledTo {
  return value === "bureau" || value === "customer";
}

export interface BilledToLike {
  billed_to?: string | null;
}

/** De gast heeft deze factuur rechtstreeks aan de partner betaald. */
export function isCustomerBilled(row: BilledToLike | null | undefined): boolean {
  return normalizeBilledTo(row?.billed_to) === "customer";
}

/**
 * Hoort deze factuur in de betaalstroom van het bureau (Snelstart,
 * betaalbatch, incasso, bankmatching)? Alleen een factuur aan het bureau.
 */
export function isBureauPayable(row: BilledToLike | null | undefined): boolean {
  return !isCustomerBilled(row);
}

export interface BilledToProjectLike {
  /** program_requests.invoicing_mode: bureau_central of partner_direct. */
  invoicing_mode?: string | null;
  /** program_requests.excluded_fees; 'accommodation' = logies rechtstreeks door de accommodatie gefactureerd. */
  excluded_fees?: string[] | null;
}

/**
 * Vooraf ingevulde keuze bij het registreren van een factuur, afgeleid van
 * het project: bij `partner_direct` factureert de partner de klant zelf, en
 * logies dat van onze factuur is gehaald (`excluded_fees` bevat
 * `accommodation`) rekent de accommodatie rechtstreeks met de gast af. De
 * partner kan de keuze in de dialoog altijd omzetten.
 */
export function defaultBilledToForProject(
  project: BilledToProjectLike | null | undefined,
  kind: "item" | "accommodation",
): InvoiceBilledTo {
  if (!project) return "bureau";
  if (project.invoicing_mode === "partner_direct") return "customer";
  if (kind === "accommodation" && Array.isArray(project.excluded_fees) && project.excluded_fees.includes("accommodation")) {
    return "customer";
  }
  return "bureau";
}
