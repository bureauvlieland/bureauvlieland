// Eén bron van waarheid voor "mag deze partner dit onderdeel factureren?".
// Wordt gebruikt door het partnerportaal (via src/lib/partnerInvoicing.ts)
// én door edge functions (get-partner-dashboard, register-partner-invoice).
//
// Facturatie is vrijgegeven zodra:
//  - de klant de voorwaarden in het portaal heeft geaccepteerd
//    (`terms_accepted_at`), OF
//  - het bureau het project heeft vrijgegeven voor facturatie
//    (`completion_status` = ready_for_invoice / partially_invoiced /
//    fully_invoiced). Dat gebeurt handmatig via "Markeer als klaar voor
//    facturatie" of automatisch door auto-close-past-execution na afloop.
//
// Na vrijgave door het bureau telt een bevestigd onderdeel ook als
// factureerbaar, ook zonder los klantakkoord op het onderdeel: de uitvoering
// is dan geweest of het bureau heeft bewust vrijgegeven.

export const INVOICING_RELEASED_COMPLETION_STATUSES = [
  "ready_for_invoice",
  "partially_invoiced",
  "fully_invoiced",
] as const;

export interface InvoicingRequestLike {
  terms_accepted_at?: string | null;
  completion_status?: string | null;
}

export interface InvoicingItemLike {
  status: string;
  invoiced_number?: string | null;
  customer_accepted_at?: string | null;
  customer_approved_at?: string | null;
}

/** Heeft het bureau het project vrijgegeven voor facturatie? */
export function isReleasedByBureau(req: InvoicingRequestLike | null | undefined): boolean {
  const s = req?.completion_status;
  return !!s && (INVOICING_RELEASED_COMPLETION_STATUSES as readonly string[]).includes(s);
}

/** Mogen partners op dit project factureren (klant getekend of bureau vrijgegeven)? */
export function isPartnerInvoicingReleased(req: InvoicingRequestLike | null | undefined): boolean {
  return !!req?.terms_accepted_at || isReleasedByBureau(req);
}

/** Effectieve status: 'confirmed' + klantakkoord op het onderdeel = 'accepted'. */
export function getPartnerEffectiveStatus(item: InvoicingItemLike): string {
  const hasCustomerAccepted = !!item.customer_accepted_at || !!item.customer_approved_at;
  return item.status === "confirmed" && hasCustomerAccepted ? "accepted" : item.status;
}

/** Staat het onderdeel in een status waarin het (na vrijgave) gefactureerd kan worden? */
export function hasInvoiceableStatus(
  item: InvoicingItemLike,
  req: InvoicingRequestLike | null | undefined,
): boolean {
  const eff = getPartnerEffectiveStatus(item);
  if (eff === "accepted" || eff === "executed") return true;
  return item.status === "confirmed" && isReleasedByBureau(req);
}

/** Kan de partner nu een factuur registreren voor dit onderdeel? */
export function canPartnerInvoiceItem(
  item: InvoicingItemLike,
  req: InvoicingRequestLike | null | undefined,
): boolean {
  return !item.invoiced_number && hasInvoiceableStatus(item, req) && isPartnerInvoicingReleased(req);
}

/** Onderdeel is klaar om te factureren, maar het project is nog niet vrijgegeven. */
export function isAwaitingInvoicingRelease(
  item: InvoicingItemLike,
  req: InvoicingRequestLike | null | undefined,
): boolean {
  return !item.invoiced_number && hasInvoiceableStatus(item, req) && !isPartnerInvoicingReleased(req);
}
