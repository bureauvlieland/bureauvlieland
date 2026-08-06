/**
 * Central pricing logic for the customer portal AND admin views.
 * All per-person multiplication, line totals, and VAT breakdown lives here.
 *
 * KEY RULE:
 * - `quoted_price` = always the TOTAL for the whole group (never multiply)
 * - `admin_price_override` = unit price for ADULTS, multiply by numberOfPeople only when price_type is per_person/per_person_per_day
 * - `override_people` on item = number of participants at the ADULT rate (falls back to the program total)
 * - `override_children` + `child_unit_price` = optional child tier on top of the adults
 */
import type { ProgramRequestItem } from "@/types/programRequest";

/** Get the effective number of people at the ADULT rate (override or program total) */
export function getEffectivePeople(
  item: { override_people?: number | null },
  programPeople: number,
): number {
  return item.override_people ?? programPeople;
}

/** Number of children at the child rate on this item (0 when not used). */
export function getEffectiveChildren(item: { override_children?: number | null }): number {
  const n = Number(item.override_children ?? 0);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.floor(n);
}

/** Child unit price, only meaningful when there are children on the item. */
export function getChildUnitPrice(item: {
  override_children?: number | null;
  child_unit_price?: number | null;
}): number | null {
  if (getEffectiveChildren(item) <= 0) return null;
  const price = item.child_unit_price;
  if (price === null || price === undefined) return null;
  const n = Number(price);
  return Number.isFinite(n) ? n : null;
}

/** Does this item use a separate child tier? */
export function hasChildTier(item: {
  override_children?: number | null;
  child_unit_price?: number | null;
}): boolean {
  return getChildUnitPrice(item) !== null;
}

/** Total headcount on the item: adults + children. */
export function getParticipantTotal(
  item: { override_people?: number | null; override_children?: number | null },
  programPeople: number,
): number {
  return getEffectivePeople(item, programPeople) + getEffectiveChildren(item);
}

type PricingItem = {
  quoted_price?: number | null;
  admin_price_override?: number | null;
  admin_price_override_updated_at?: string | null;
  partner_price_change_acknowledged_at?: string | null;
  quoted_at?: string | null;
  price_type?: string | null;
  override_people?: number | null;
  override_children?: number | null;
  child_unit_price?: number | null;
};

/**
 * Core multiplication for per-person items: adults × adult rate plus
 * children × child rate, times the number of days for p.p.p.d. items.
 * Non per-person items simply return the unit price (× days when applicable).
 */
export function multiplyUnitPrice(
  item: PricingItem,
  adultUnitPrice: number,
  programPeople: number,
  numberOfDays: number = 1,
): number {
  const dayMultiplier = isPerDayItem(item) ? Math.max(numberOfDays, 1) : 1;
  if (!isPerPersonItem(item)) return adultUnitPrice * dayMultiplier;
  const adults = getEffectivePeople(item, programPeople);
  const children = getEffectiveChildren(item);
  const childUnit = getChildUnitPrice(item);
  const base = adultUnitPrice * adults + (childUnit !== null ? childUnit * children : 0);
  return base * dayMultiplier;
}

export interface PriceComponent {
  /** "Volwassenen" / "Kinderen (4–12 jr)" */
  label: string;
  count: number;
  unitPrice: number;
  total: number;
  kind: "adult" | "child";
}

/** Human label for the child tier, including the age range when known. */
export function getChildTierLabel(item: {
  child_min_age?: number | null;
  child_max_age?: number | null;
}): string {
  const min = item.child_min_age;
  const max = item.child_max_age;
  if (min != null && max != null) return `Kinderen (${min}–${max} jr)`;
  if (max != null) return `Kinderen (t/m ${max} jr)`;
  if (min != null) return `Kinderen (vanaf ${min} jr)`;
  return "Kinderen";
}

/**
 * Breakdown of one item into its billable tiers (adults, children).
 * Returns an empty array when the item has no usable unit price or is not
 * priced per person — callers then fall back to the single line total.
 */
export function getPriceComponents(
  item: PricingItem & { child_min_age?: number | null; child_max_age?: number | null },
  programPeople: number,
  numberOfDays: number = 1,
): PriceComponent[] {
  if (!isPerPersonItem(item)) return [];
  const adultUnit = getDisplayUnitPrice(item, programPeople);
  if (adultUnit === null) return [];
  const dayMultiplier = isPerDayItem(item) ? Math.max(numberOfDays, 1) : 1;
  const adults = getEffectivePeople(item, programPeople);
  const childUnit = getChildUnitPrice(item);
  const children = getEffectiveChildren(item);
  const components: PriceComponent[] = [];
  if (adults > 0) {
    components.push({
      label: children > 0 ? "Volwassenen" : "Personen",
      count: adults,
      unitPrice: adultUnit,
      total: adultUnit * adults * dayMultiplier,
      kind: "adult",
    });
  }
  if (childUnit !== null && children > 0) {
    components.push({
      label: getChildTierLabel(item),
      count: children,
      unitPrice: childUnit,
      total: childUnit * children * dayMultiplier,
      kind: "child",
    });
  }
  return components;
}


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
 *   2. quoted_price (group total) − kindregels, ÷ volwassenen
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
      // Kindregels eerst van het groepstotaal af, de rest is het volwassenentarief.
      const childUnit = getChildUnitPrice(item);
      const childPart = childUnit !== null ? childUnit * getEffectiveChildren(item) : 0;
      return (item.quoted_price - childPart) / effectivePeople;
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
    return multiplyUnitPrice(item, item.admin_price_override!, programPeople, numberOfDays);
  }
  if (item.quoted_price != null) return item.quoted_price;
  if (item.admin_price_override != null) {
    return multiplyUnitPrice(item, item.admin_price_override, programPeople, numberOfDays);

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

  // Geen eerder ack-moment EN geen eerdere quoted_price om tegen af te zetten:
  // dit is per definitie de eerste prijsstelling door admin, geen wijziging.
  if (!ack && item.quoted_price == null) return false;

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

/**
 * Bepaalt of een openstaande admin-prijswijziging groot genoeg is om
 * opnieuw expliciet klant-akkoord te vragen. Prijsdalingen en kleine
 * correcties (onder zowel % als abs drempel) → false, zodat de facturatie-
 * flow niet onnodig wordt geblokkeerd.
 *
 * Vereist zowel programPeople als een bestaande `quoted_price` om te
 * kunnen vergelijken; ontbreekt één van beide → val terug op de brede
 * `hasOpenAdminPriceChange`-detectie (behoud oude gedrag).
 */
export function priceChangeRequiresReapproval(
  item: {
    admin_price_override_updated_at?: string | null;
    partner_price_change_acknowledged_at?: string | null;
    quoted_at?: string | null;
    admin_price_override?: number | null;
    quoted_price?: number | null;
    price_type?: string | null;
    override_people?: number | null;
  },
  programPeople: number,
  numberOfDays: number,
  thresholds?: { pct?: number; absEur?: number },
): boolean {
  if (!hasOpenAdminPriceChange(item, programPeople, numberOfDays)) return false;
  if (item.admin_price_override == null || item.quoted_price == null) {
    // Geen basis om delta te bepalen → conservatief: opnieuw vragen.
    return true;
  }
  const effectivePeople = getEffectivePeople(item, programPeople);
  const personMultiplier = isPerPersonItem(item) ? effectivePeople : 1;
  const dayMultiplier = isPerDayItem(item) ? numberOfDays : 1;
  const adminTotal = item.admin_price_override * personMultiplier * dayMultiplier;
  const delta = adminTotal - item.quoted_price;
  if (delta <= 0.01) return false; // gelijk of daling
  const pct = thresholds?.pct ?? 5;
  const abs = thresholds?.absEur ?? 25;
  const pctDelta = item.quoted_price > 0 ? (delta / item.quoted_price) * 100 : Infinity;
  return pctDelta >= pct || delta >= abs;
}

/** Whether this item should be multiplied by number of people */
export function isPerPersonItem(item: { price_type?: string | null }): boolean {
  return !item.price_type || item.price_type === "per_person" || item.price_type === "per_person_per_day";
}

/** Whether this item should also be multiplied by number of days */
export function isPerDayItem(item: { price_type?: string | null }): boolean {
  return item.price_type === "per_person_per_day";
}

/** Short suffix label for unit prices ("p.p.", "p.p.p.d.", "totaal"). */
export function getPriceTypeSuffix(priceType?: string | null): string {
  if (priceType === "per_person_per_day") return "p.p.p.d.";
  if (priceType === "total") return "totaal";
  if (priceType === "on_request") return "totaal";
  return "p.p.";
}

/**
 * Human-readable explanation for how a line total is built up.
 * E.g. "€29,50 p.p. × 12 personen × 3 dagen" or "Totaalprijs".
 */
export function getPriceBreakdownLabel(
  item: { price_type?: string | null; admin_price_override?: number | null; override_people?: number | null },
  programPeople: number,
  numberOfDays: number = 1,
): string {
  const unit = item.admin_price_override;
  if (unit == null) return "";
  const fmt = (n: number) =>
    n.toLocaleString("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (!isPerPersonItem(item)) return "Totaalprijs";
  const people = getEffectivePeople(item, programPeople);
  const suffix = getPriceTypeSuffix(item.price_type);
  if (isPerDayItem(item)) {
    return `€${fmt(unit)} ${suffix} × ${people} personen × ${numberOfDays} dagen`;
  }
  return `€${fmt(unit)} ${suffix} × ${people} personen`;
}

/**
 * Single source of truth for "hoeveel dagen telt dit programma".
 * Geeft altijd minimaal 1 terug — een leeg of ontbrekend `selected_dates`
 * mag nooit een p.p.p.d.-totaal naar €0 reduceren.
 * Accepteert zowel een Date[]/string[] als een hele request met `selected_dates`.
 */
export function getNumberOfDays(
  source:
    | { selected_dates?: unknown }
    | unknown[]
    | null
    | undefined,
): number {
  if (Array.isArray(source)) return Math.max(source.length, 1);
  if (source && typeof source === "object" && Array.isArray((source as { selected_dates?: unknown[] }).selected_dates)) {
    return Math.max((source as { selected_dates: unknown[] }).selected_dates.length, 1);
  }
  return 1;
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

/**
 * Resultaat van een aantal-mismatch tussen `quoted_price` (door partner bevestigd totaal)
 * en de afgeleide p.p.-prijs × huidige `effectivePeople`.
 *
 * Use case: partner bevestigde €32 p.p. × 14p = €448; klant verlaagt naar 13p.
 * `quoted_price` (448) past niet meer bij €32 × 13 = €416. De **p.p.-prijs blijft de afspraak**;
 * het totaal moet meebewegen en de partner krijgt een nette notificatie.
 *
 * Geeft `null` als er geen actie nodig is.
 */
export function getHeadcountMismatch(
  item: PricingItem,
  programPeople: number,
  numberOfDays: number = 1,
): { unitPrice: number; oldTotal: number; newTotal: number; peopleNow: number } | null {
  if (!isPerPersonItem(item)) return null;
  if (item.quoted_price == null) return null;
  if (item.admin_price_override == null) return null;
  const peopleNow = getEffectivePeople(item, programPeople);
  if (peopleNow < 1) return null;
  const dayMultiplier = isPerDayItem(item) ? Math.max(numberOfDays, 1) : 1;
  const unitPrice = item.admin_price_override;
  const newTotal = unitPrice * peopleNow * dayMultiplier;
  const oldTotal = item.quoted_price;
  if (Math.abs(newTotal - oldTotal) <= 0.01) return null;
  return { unitPrice, oldTotal, newTotal, peopleNow };
}
