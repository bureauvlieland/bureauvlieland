/**
 * Zet een inkoopfactuur om in verkoopregels op de programma-onderdelen.
 *
 * Huisregel van het bureau: alles wat niet toeristenbelasting is en aan een
 * programma-onderdeel gekoppeld wordt, vervángt de geoffreerde prijs van dat
 * onderdeel en wordt zo aan de klant doorbelast.
 *
 * Eerder werkte dat alleen als de hele factuur aan precies één onderdeel hing.
 * Verdeelde je hem over meerdere onderdelen — wat bij catering en vervoer
 * voorkomt — dan viel de doorbelasting stilzwijgend weg: geen regels, geen
 * melding, en de klant kreeg de oude geoffreerde prijs gefactureerd.
 */

export interface BillingSourceAllocation {
  item_id: string;
  amount_excl_vat: number;
  vat_rate: number;
  vat_amount: number;
  amount_incl_vat: number;
  notes?: string | null;
}

export interface BillingSourceLine {
  description: string;
  quantity: number;
  amount_excl_vat: number;
  vat_rate: number;
  vat_amount: number;
  amount_incl_vat: number;
}

export interface BillingLineRow {
  item_id: string;
  description: string;
  quantity: number;
  unit_price_excl_vat: number;
  vat_rate: number;
  vat_amount: number;
  amount_excl_vat: number;
  amount_incl_vat: number;
  sort_order: number;
}

export interface BuildBillingLinesInput {
  allocations: BillingSourceAllocation[];
  /** De gescande factuurregels; rijker dan de verdeling, dus bij één onderdeel leidend. */
  lines: BillingSourceLine[];
  /** Onderdeel op de factuurkop, gebruikt als er geen verdeling is. */
  headerItemId?: string | null;
  header: { amount_excl_vat: number; vat_rate: number; vat_amount: number; amount_incl_vat: number };
  description?: string | null;
  invoiceNumber?: string | null;
}

const fallbackDescription = (description?: string | null, invoiceNumber?: string | null) =>
  description || `Factuur ${invoiceNumber ?? ""}`.trim();

/**
 * Bepaalt per programma-onderdeel welke verkoopregels eruit moeten volgen.
 *
 * - Geen verdeling, wél een onderdeel op de kop → de gescande regels, anders het
 *   totaal van de factuur, op dat ene onderdeel.
 * - Eén onderdeel in de verdeling → de gescande regels (die hebben omschrijvingen
 *   en tarieven per regel), en anders de verdeelregels.
 * - Meerdere onderdelen → per onderdeel zijn eigen verdeelregels. Alleen zo krijgt
 *   elk onderdeel het deel dat er werkelijk bij hoort.
 */
export function buildBillingLineRowsByItem(
  input: BuildBillingLinesInput,
): Map<string, BillingLineRow[]> {
  const result = new Map<string, BillingLineRow[]>();

  const byItem = new Map<string, BillingSourceAllocation[]>();
  for (const alloc of input.allocations) {
    if (!alloc.item_id) continue;
    const list = byItem.get(alloc.item_id) ?? [];
    list.push(alloc);
    byItem.set(alloc.item_id, list);
  }

  const rowsFromLines = (itemId: string): BillingLineRow[] =>
    input.lines.map((line, idx) => ({
      item_id: itemId,
      description: line.description,
      quantity: line.quantity,
      unit_price_excl_vat: line.amount_excl_vat / (line.quantity || 1),
      vat_rate: line.vat_rate,
      vat_amount: line.vat_amount,
      amount_excl_vat: line.amount_excl_vat,
      amount_incl_vat: line.amount_incl_vat,
      sort_order: idx,
    }));

  const rowsFromAllocations = (
    itemId: string,
    allocs: BillingSourceAllocation[],
  ): BillingLineRow[] =>
    allocs.map((alloc, idx) => ({
      item_id: itemId,
      description:
        alloc.notes ||
        `${fallbackDescription(input.description, input.invoiceNumber)} (BTW ${alloc.vat_rate}%)`,
      quantity: 1,
      unit_price_excl_vat: alloc.amount_excl_vat,
      vat_rate: alloc.vat_rate,
      vat_amount: alloc.vat_amount,
      amount_excl_vat: alloc.amount_excl_vat,
      amount_incl_vat: alloc.amount_incl_vat,
      sort_order: idx,
    }));

  // Geen verdeling: de hele factuur hoort bij het onderdeel op de kop.
  if (byItem.size === 0) {
    if (!input.headerItemId) return result;
    const rows = input.lines.length > 0
      ? rowsFromLines(input.headerItemId)
      : [{
        item_id: input.headerItemId,
        description: fallbackDescription(input.description, input.invoiceNumber),
        quantity: 1,
        unit_price_excl_vat: input.header.amount_excl_vat,
        vat_rate: input.header.vat_rate,
        vat_amount: input.header.vat_amount,
        amount_excl_vat: input.header.amount_excl_vat,
        amount_incl_vat: input.header.amount_incl_vat,
        sort_order: 0,
      }];
    result.set(input.headerItemId, rows);
    return result;
  }

  // Eén onderdeel: de gescande regels zijn rijker dan de verdeling, dus die winnen.
  if (byItem.size === 1) {
    const [itemId, allocs] = [...byItem.entries()][0];
    const useLines = input.lines.length > 0 && allocs.length <= 1;
    result.set(itemId, useLines ? rowsFromLines(itemId) : rowsFromAllocations(itemId, allocs));
    return result;
  }

  // Meerdere onderdelen: ieder krijgt zijn eigen deel.
  for (const [itemId, allocs] of byItem) {
    result.set(itemId, rowsFromAllocations(itemId, allocs));
  }
  return result;
}
