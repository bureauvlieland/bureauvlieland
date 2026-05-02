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

type PricingItem = {
  quoted_price?: number | null;
  admin_price_override?: number | null;
  admin_price_override_updated_at?: string | null;
  partner_price_change_acknowledged_at?: string | null;
  quoted_at?: string | null;
  price_type?: string | null;
  override_people?: number | null;
};

/**
 * When the admin has issued a NEW price after the last partner ack (or after
 * the original quote), that price is leading on every customer-facing surface
 * — even before the partner acknowledges. Otherwise the partner's
 * `quoted_price` (= group total) wins.
 */
function adminOverrideIsLeading(
  item: PricingItem,
  programPeople?: number,
  numberOfDays: number = 1,
): boolean {
  return hasOpenAdminPriceChange(item, programPeople, numberOfDays);
}

/**
 * Single source of truth for the per-person UNIT price shown on every portal
 * (admin, partner, customer). Hierarchy:
 *   1. open admin override (price_type=total → ÷ people for unit)  → wins
 *   2. quoted_price (group total) ÷ effective people
 *   3. admin_price_override (already a unit price for per_person variants)
 *   4. null when nothing is known yet
 */
export function getDisplayUnitPrice(
  item: PricingItem,
  programPeople: number,
): number | null {
  const effectivePeople = getEffectivePeople(item, programPeople);
  if (adminOverrideIsLeading(item, programPeople)) {
    // admin_price_override is always present here
    if (isPerPersonItem(item)) {
      return item.admin_price_override!;
    }
    // total → derive per-person view if multiple people
    return effectivePeople > 0 ? item.admin_price_override! / effectivePeople : item.admin_price_override!;
  }
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
 */
export function getDisplayLineTotal(
  item: PricingItem,
  programPeople: number,
  numberOfDays: number = 1,
): number | null {
  if (adminOverrideIsLeading(item, programPeople, numberOfDays)) {
    const effectivePeople = getEffectivePeople(item, programPeople);
    const personMultiplier = isPerPersonItem(item) ? effectivePeople : 1;
    const dayMultiplier = isPerDayItem(item) ? numberOfDays : 1;
    return item.admin_price_override! * personMultiplier * dayMultiplier;
  }
  if (item.quoted_price != null) return item.quoted_price;
  if (item.admin_price_override != null) {
    const effectivePeople = getEffectivePeople(item, programPeople);
    const personMultiplier = isPerPersonItem(item) ? effectivePeople : 1;
    const dayMultiplier = isPerDayItem(item) ? numberOfDays : 1;
    return item.admin_price_override * personMultiplier * dayMultiplier;
  }
  return null;
}

/**
 * Whether the admin has a newer price-override than the last partner confirmation
 * AND the resulting effective total materially differs from `quoted_price`.
 *
 * When `programPeople` (and optionally `numberOfDays`) is provided, the helper
 * computes the effective admin total and compares it to `quoted_price`. If they
 * are within €0.01, there is no real open change — even when timestamps suggest
 * otherwise (e.g. after a "Synchroniseer"-action that only refreshed the
 * timestamp). Without these args we fall back to pure timestamp comparison
 * (legacy behavior, kept for backwards compatibility).
 */
export function hasOpenAdminPriceChange(
  item: {
    admin_price_override_updated_at?: string | null;
    partner_price_change_acknowledged_at?: string | null;
    quoted_at?: string | null;
    admin_price_override?: number | null;
    quoted_price?: number | null;
    price_type?: string | null;
    override_people?: number | null;
  },
  programPeople?: number,
  numberOfDays: number = 1,
): boolean {
  if (item.admin_price_override == null || !item.admin_price_override_updated_at) return false;
  const ack = item.partner_price_change_acknowledged_at ?? item.quoted_at;
  const timestampOpen = !ack
    ? true
    : new Date(item.admin_price_override_updated_at).getTime() > new Date(ack).getTime();
  if (!timestampOpen) return false;

  // Materiele bedragvergelijking — alleen mogelijk wanneer caller people-context geeft
  // én er een quoted_price is om tegen af te zetten.
  if (programPeople != null && item.quoted_price != null) {
    const effectivePeople = getEffectivePeople(item, programPeople);
    const personMultiplier = isPerPersonItem(item) ? effectivePeople : 1;
    const dayMultiplier = isPerDayItem(item) ? numberOfDays : 1;
    const adminTotal = item.admin_price_override * personMultiplier * dayMultiplier;
    if (Math.abs(adminTotal - item.quoted_price) <= 0.01) return false;
  }

  return true;
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
