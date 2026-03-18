/**
 * Central pricing logic for the customer portal.
 * All per-person multiplication, line totals, and VAT breakdown lives here.
 */
import type { ProgramRequestItem } from "@/types/programRequest";

/**
 * Calculate the effective total for a single program item,
 * taking into account price_type === "per_person".
 */
export function getItemEffectivePrice(
  item: ProgramRequestItem,
  numberOfPeople: number,
): number {
  const raw = item.quoted_price ?? 0;
  const multiplier = item.price_type === "per_person" ? numberOfPeople : 1;
  return raw * multiplier;
}

/**
 * Calculate a day total (incl VAT) for a list of items,
 * correctly multiplying per-person items.
 */
export function calculateDayTotal(
  items: ProgramRequestItem[],
  numberOfPeople: number,
): number {
  return items
    .filter((i) => i.status !== "cancelled" && i.quoted_price)
    .reduce((sum, item) => sum + getItemEffectivePrice(item, numberOfPeople), 0);
}
