/**
 * Btw-tarief van een programma-onderdeel.
 *
 * Een onderdeel uit een bouwsteen erft het tarief van die bouwsteen. Een
 * onderdeel zonder bouwsteen (overige kosten, nacalculatie, een post uit een
 * verzamelfactuur) heeft een eigen `vat_rate`; die werd tot 16 oktober 2026
 * overal genegeerd, waardoor zo'n post altijd als 21 % meetelde — ook als er
 * bewust 9 of 0 % was gekozen.
 */

export interface ItemForVatRate {
  block_id?: string | null;
  vat_rate?: number | null;
}

export function resolveItemVatRate(
  item: ItemForVatRate,
  blockVatRates: Record<string, number>,
  fallback = 21,
): number {
  if (item.block_id && blockVatRates[item.block_id] !== undefined) {
    return blockVatRates[item.block_id];
  }
  if (item.vat_rate != null && Number.isFinite(Number(item.vat_rate))) {
    return Number(item.vat_rate);
  }
  return fallback;
}
