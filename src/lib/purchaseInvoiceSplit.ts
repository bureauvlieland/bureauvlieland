/**
 * Verdeling van een bestaande inkoopfactuur over meerdere programma-onderdelen.
 *
 * Gebruikt door de koppel-dialoog wanneer één factuur (bv. catering op meerdere
 * dagen) bij meer dan één onderdeel hoort. Pure functies, gedekt door Vitest.
 */

export interface SplitTarget {
  id: string;
  /** Verwacht bedrag (verkoopprijs) om naar rato te verdelen; null = onbekend. */
  weight: number | null;
}

export interface AllocationAmount {
  item_id: string;
  amount_excl_vat: number;
}

export interface AllocationRowDraft extends AllocationAmount {
  invoice_id: string;
  vat_rate: number;
  vat_amount: number;
  amount_incl_vat: number;
  sort_order: number;
}

const round2 = (value: number) => Math.round(value * 100) / 100;

/**
 * Stelt een verdeling voor van `totalExcl` over de doelen, naar rato van hun
 * gewicht. Zonder bruikbare gewichten wordt gelijk verdeeld. De centen sluiten
 * altijd exact op het totaal: het afrondingsverschil landt op het grootste deel.
 */
export function proposeSplit(totalExcl: number, targets: SplitTarget[]): AllocationAmount[] {
  if (targets.length === 0) return [];
  const total = round2(Number(totalExcl) || 0);
  const weights = targets.map((t) => {
    const w = Number(t.weight);
    return Number.isFinite(w) && w > 0 ? w : 0;
  });
  const weightSum = weights.reduce((s, w) => s + w, 0);
  const shares = weightSum > 0
    ? weights.map((w) => (w / weightSum) * total)
    : targets.map(() => total / targets.length);

  const rounded = shares.map(round2);
  const diff = round2(total - rounded.reduce((s, v) => s + v, 0));
  if (diff !== 0) {
    let idx = 0;
    for (let i = 1; i < rounded.length; i++) if (rounded[i] > rounded[idx]) idx = i;
    rounded[idx] = round2(rounded[idx] + diff);
  }

  return targets.map((t, i) => ({ item_id: t.id, amount_excl_vat: rounded[i] }));
}

/** Som van de verdeelde bedragen en het verschil met het factuurtotaal. */
export function splitTotals(amounts: AllocationAmount[], totalExcl: number) {
  const sum = round2(amounts.reduce((s, a) => s + (Number(a.amount_excl_vat) || 0), 0));
  return { sum, diff: round2(sum - (Number(totalExcl) || 0)) };
}

/** Sluit de verdeling op de cent? */
export function isSplitBalanced(amounts: AllocationAmount[], totalExcl: number): boolean {
  return Math.abs(splitTotals(amounts, totalExcl).diff) <= 0.005;
}

/** Zet verdeelde bedragen om naar allocatieregels met btw op het factuurtarief. */
export function buildAllocationRows(
  invoiceId: string,
  vatRate: number,
  amounts: AllocationAmount[],
): AllocationRowDraft[] {
  const rate = Number(vatRate) || 0;
  return amounts
    .filter((a) => (Number(a.amount_excl_vat) || 0) > 0)
    .map((a, idx) => {
      const excl = round2(Number(a.amount_excl_vat));
      const vat = round2(excl * (rate / 100));
      return {
        invoice_id: invoiceId,
        item_id: a.item_id,
        amount_excl_vat: excl,
        vat_rate: rate,
        vat_amount: vat,
        amount_incl_vat: round2(excl + vat),
        sort_order: idx,
      };
    });
}
