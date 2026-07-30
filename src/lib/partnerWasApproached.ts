/**
 * Bepaalt of een partner voor een programma-onderdeel daadwerkelijk is benaderd.
 *
 * Een partner is benaderd zodra:
 *  - het onderdeel naar de partner is verstuurd (`skip_partner_notification === false`), OF
 *  - de partner al gereageerd heeft (offerte gegeven of prijswijziging bevestigd).
 *
 * Zolang dat niet zo is, weet de partner niets van dit project en mag er dus
 * ook geen annuleringsmelding uitgaan.
 */
export interface PartnerApproachItem {
  skip_partner_notification?: boolean | null;
  quoted_at?: string | null;
  partner_price_change_acknowledged_at?: string | null;
}

export function itemWasSentToPartner(item: PartnerApproachItem): boolean {
  if (item.skip_partner_notification === false) return true;
  if (item.quoted_at) return true;
  if (item.partner_price_change_acknowledged_at) return true;
  return false;
}

/** Filtert een lijst onderdelen tot alleen die waarvan de partner benaderd is. */
export function filterItemsSentToPartner<T extends PartnerApproachItem>(items: T[]): T[] {
  return items.filter(itemWasSentToPartner);
}

/** Set van provider_id's waarvan minstens één onderdeel naar de partner is gegaan. */
export function approachedPartnerIds(
  items: Array<PartnerApproachItem & { provider_id?: string | null }>,
): Set<string> {
  const ids = new Set<string>();
  for (const item of items) {
    if (item.provider_id && itemWasSentToPartner(item)) ids.add(item.provider_id);
  }
  return ids;
}
