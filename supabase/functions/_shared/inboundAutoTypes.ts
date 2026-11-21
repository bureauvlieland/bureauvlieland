/**
 * Werkbank-taaktypen in het cluster "Binnengekomen": gebeurtenissen van
 * buiten (partner reageert, klant geeft akkoord, mail of factuur komt binnen).
 * Spiegelt het inbound-deel van CLUSTER_MAP in src/lib/projectActivity.ts;
 * houd beide gelijk. Gebruikt door de dagelijkse samenvatting.
 */
export const INBOUND_AUTO_TYPES: ReadonlySet<string> = new Set([
  "inbound_email",
  "sales_inbox",
  "purchase_invoice_inbox",
  "purchase_invoice_pending",
  "quote_review",
  "quote_headcount_review",
  "partner_status_update",
  "accommodation_selected",
  "all_partners_responded",
  "commission_invoice_reply",
  "partner_item_executed",
  "customer_quote_accepted",
  "customer_terms_signed",
]);
