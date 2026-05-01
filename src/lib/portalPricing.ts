/**
 * Central pricing logic for the customer portal AND admin views.
 * All per-person multiplication, line totals, and VAT breakdown lives here.
 *
 * KEY RULE:
 * - `quoted_price` = always the TOTAL for the whole group (never multiply)
 * - `admin_price_override` = unit price, multiply by numberOfPeople when price_type is per_person/on_request
 * - `override_people` on item = use instead of program-wide numberOfPeople when set
 */
import type { ProgramRequestItem } from "@/types/programRequest";

/** Get the effective number of people for an item (override or program total) */
export function getEffectivePeople(
  item: { override_people?: number | null },
  programPeople: number,
): number {
  return item.override_people ?? programPeople;
}

/**
 * Single source of truth for the per-person UNIT price shown on every portal
 * (admin, partner, customer). Always derived from the same hierarchy:
 *   1. quoted_price (group total) ÷ effective people  → wins when present
 *   2. admin_price_override (already a unit price for per_person variants)
 *   3. null when nothing is known yet
 */
export function getDisplayUnitPrice(
  item: {
    quoted_price?: number | null;
    admin_price_override?: number | null;
    price_type?: string | null;
    override_people?: number | null;
  },
  programPeople: number,
): number | null {
  const effectivePeople = getEffectivePeople(item, programPeople);
  if (item.quoted_price != null) {
    if (isPerPersonItem(item) && effectivePeople > 0) {
      return item.quoted_price / effectivePeople;
    }
    return item.quoted_price;
  }
  if (item.admin_price_override != null) {
    return item.admin_price_override;
  }
  return null;
}

/**
 * Single source of truth for the GROUP total of one item.
 * Identical to getItemLineTotal but exposed under a clearer name so callers in
 * partner/admin code do not reach for raw fields.
 */
export function getDisplayLineTotal(
  item: {
    quoted_price?: number | null;
    admin_price_override?: number | null;
    price_type?: string | null;
    override_people?: number | null;
  },
  programPeople: number,
  numberOfDays: number = 1,
): number | null {
  if (item.quoted_price != null) return item.quoted_price;
  if (item.admin_price_override != null) {
    const effectivePeople = getEffectivePeople(item, programPeople);
    const personMultiplier = isPerPersonItem(item) ? effectivePeople : 1;
    const dayMultiplier = isPerDayItem(item) ? numberOfDays : 1;
    return item.admin_price_override * personMultiplier * dayMultiplier;
  }
  return null;
}

/** Whether the admin has a newer price-override than the last partner confirmation. */
export function hasOpenAdminPriceChange(item: {
  admin_price_override_updated_at?: string | null;
  partner_price_change_acknowledged_at?: string | null;
  quoted_at?: string | null;
  admin_price_override?: number | null;
}): boolean {
  if (item.admin_price_override == null || !item.admin_price_override_updated_at) return false;
  const ack = item.partner_price_change_acknowledged_at ?? item.quoted_at;
  if (!ack) return true;
  return new Date(item.admin_price_override_updated_at).getTime() > new Date(ack).getTime();
}

/** Whether this item should be multiplied by number of people */
export function isPerPersonItem(item: { price_type?: string | null }): boolean {
  return !item.price_type || item.price_type === "per_person" || item.price_type === "on_request" || item.price_type === "per_person_per_day";
}

/** Whether this item should also be multiplied by number of days */
export function isPerDayItem(item: { price_type?: string | null }): boolean {
  return item.price_type === "per_person_per_day";
}

/**
 * Get the unit price for display (e.g. "€30,00 p.p.")
 * For quoted_price items this is the per-person breakdown.
 * For admin_price_override items this is the raw override value.
 */
export function getItemUnitPrice(
  item: ProgramRequestItem,
  numberOfPeople: number,
): number | null {
  const effectivePeople = getEffectivePeople(item, numberOfPeople);
  if (item.quoted_price != null) {
    // quoted_price is already a group total; derive unit price
    return isPerPersonItem(item) && effectivePeople > 0
      ? item.quoted_price / effectivePeople
      : item.quoted_price;
  }
  if (item.admin_price_override != null) {
    return item.admin_price_override;
  }
  return null;
}

/**
 * Calculate the effective GROUP total for a single program item.
 * - quoted_price → use directly (it IS the group total)
 * - admin_price_override → multiply by effectivePeople when per_person
 */
export function getItemLineTotal(
  item: ProgramRequestItem,
  numberOfPeople: number,
  numberOfDays: number = 1,
): number | null {
  if (item.quoted_price != null) {
    return item.quoted_price;
  }
  if (item.admin_price_override != null) {
    const effectivePeople = getEffectivePeople(item, numberOfPeople);
    const personMultiplier = isPerPersonItem(item) ? effectivePeople : 1;
    const dayMultiplier = isPerDayItem(item) ? numberOfDays : 1;
    return item.admin_price_override * personMultiplier * dayMultiplier;
  }
  return null;
}

/**
 * Legacy helper — returns a number (0 when no price).
 * Used by components that need a guaranteed number.
 */
export function getItemEffectivePrice(
  item: ProgramRequestItem,
  numberOfPeople: number,
  numberOfDays: number = 1,
): number {
  return getItemLineTotal(item, numberOfPeople, numberOfDays) ?? 0;
}

/**
 * Calculate a day total (incl VAT) for a list of items.
 */
export function calculateDayTotal(
  items: ProgramRequestItem[],
  numberOfPeople: number,
  numberOfDays: number = 1,
): number {
  return items
    .filter((i) => i.status !== "cancelled" && (i.quoted_price != null || i.admin_price_override != null))
    .reduce((sum, item) => sum + getItemEffectivePrice(item, numberOfPeople, numberOfDays), 0);
}
