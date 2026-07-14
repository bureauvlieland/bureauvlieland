/**
 * Bepaalt of een partner een aantal-wijziging-mail moet ontvangen voor een
 * program_request_item. Regel: alleen na klantgoedkeuring. Zolang het item
 * nog "in offerte" is bij de partner (customer_approved_at én
 * customer_accepted_at leeg), heeft de klant het programma nog niet
 * definitief gemaakt en is een aantal-wijziging niet relevant.
 *
 * Cancelled items en bureau-managed items krijgen sowieso geen partner-mail.
 */
export interface HeadcountNotifyItem {
  status?: string | null;
  customer_approved_at?: string | null;
  customer_accepted_at?: string | null;
  block_type?: string | null;
  block_category?: string | null;
  provider_id?: string | null;
}

const BUREAU_PROVIDER_IDS = new Set([
  "bureau",
  "rederij",
  "fietsverhuur",
  "bagagevervoer-vlieland",
]);

export function shouldNotifyPartnerOfHeadcountChange(
  item: HeadcountNotifyItem,
): boolean {
  if (!item) return false;
  if (item.status === "cancelled") return false;
  if (item.block_type === "bureau") return false;
  if (item.provider_id && BUREAU_PROVIDER_IDS.has(item.provider_id)) return false;
  return !!(item.customer_approved_at || item.customer_accepted_at);
}
