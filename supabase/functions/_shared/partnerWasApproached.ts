/**
 * Deno-kopie van src/lib/partnerWasApproached.ts (edge functions kunnen niet uit src importeren).
 * Houd beide bestanden gelijk — src/lib/__tests__/partnerWasApproached.test.ts borgt de regels.
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

export function filterItemsSentToPartner<T extends PartnerApproachItem>(items: T[]): T[] {
  return items.filter(itemWasSentToPartner);
}

export function approachedPartnerIds(
  items: Array<PartnerApproachItem & { provider_id?: string | null }>,
): Set<string> {
  const ids = new Set<string>();
  for (const item of items) {
    if (item.provider_id && itemWasSentToPartner(item)) ids.add(item.provider_id);
  }
  return ids;
}
