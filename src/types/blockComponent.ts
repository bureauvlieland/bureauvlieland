export type BlockComponentQuantityMode =
  | "fixed"
  | "per_group"
  | "per_n_people"
  | "per_people_per_day";

export interface BlockComponent {
  id: string;
  parent_block_id: string;
  child_block_id: string;
  is_required: boolean;
  quantity_mode: BlockComponentQuantityMode;
  quantity_value: number;
  sort_order: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export const quantityModeLabels: Record<BlockComponentQuantityMode, string> = {
  fixed: "Vaste hoeveelheid",
  per_group: "Per groep (×1)",
  per_n_people: "Per N personen (afronden ↑)",
  per_people_per_day: "Per persoon per dag",
};

/**
 * Resolve the number of "units" (or people-equivalents) that this child
 * contributes, given group size and number of days.
 *
 * Returns an integer count. Pricing semantics depend on the *child block's*
 * price_type — we just compute a multiplier to feed into override_people
 * (for per_person blocks) or quoted_price (for total blocks).
 */
export function computeComponentQuantity(
  mode: BlockComponentQuantityMode,
  value: number,
  people: number,
  days: number,
): number {
  const safePeople = Math.max(1, Math.floor(people || 1));
  const safeDays = Math.max(1, Math.floor(days || 1));
  const safeValue = Math.max(1, Number(value) || 1);

  switch (mode) {
    case "fixed":
      return Math.max(1, Math.floor(safeValue));
    case "per_group":
      return 1;
    case "per_n_people":
      return Math.max(1, Math.ceil(safePeople / safeValue));
    case "per_people_per_day":
      return safePeople * safeDays;
    default:
      return 1;
  }
}
