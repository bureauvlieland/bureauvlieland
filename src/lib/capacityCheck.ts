// Centrale helper voor capaciteits-controle op programma-onderdelen.
// Elk bouwblok kan een min_people / max_people hebben. Als het effectieve
// aantal deelnemers (override_people of het projectbrede aantal) daarbuiten
// valt, moeten we de admin/klant expliciet waarschuwen: veel activiteiten
// (bijv. Watertaxi Vlieland-Harlingen, max 12) kunnen simpelweg geen grotere
// groep aan. Voorheen ging dit stilzwijgend voorbij.
//
// Deze module is bewust puur: geen React, geen supabase. Zo kunnen we hem
// zowel in UI-componenten als in edge functions / tests hergebruiken.

export interface CapacityItem {
  itemId: string;
  itemName: string;
  minPeople?: number | null;
  maxPeople?: number | null;
  overridePeople?: number | null;
  status?: string | null;
}

export type CapacityStatus = "ok" | "over" | "under" | "unknown";

export interface CapacityResult {
  itemId: string;
  itemName: string;
  effectivePeople: number;
  min: number | null;
  max: number | null;
  status: CapacityStatus;
  overBy: number;
  underBy: number;
}

/**
 * Geeft het effectieve aantal deelnemers voor een item:
 * - override_people wanneer > 0 gezet (item heeft eigen aantal, bv. workshop met beperkte plekken)
 * - anders het projectbrede aantal
 */
export const getEffectivePeople = (
  item: Pick<CapacityItem, "overridePeople">,
  numberOfPeople: number,
): number => {
  const override = item.overridePeople;
  if (override != null && Number.isFinite(override) && override > 0) return override;
  return Math.max(1, numberOfPeople);
};

const normalizeBound = (v: number | null | undefined): number | null => {
  if (v == null) return null;
  if (!Number.isFinite(v)) return null;
  if (v <= 0) return null; // 0 of negatief interpreteren we als "geen limiet"
  return v;
};

/** Check capaciteit voor één item tegen een gegeven aantal deelnemers. */
export const checkCapacity = (
  item: CapacityItem,
  numberOfPeople: number,
): CapacityResult => {
  const effective = getEffectivePeople(item, numberOfPeople);
  const min = normalizeBound(item.minPeople);
  const max = normalizeBound(item.maxPeople);

  let status: CapacityStatus = "ok";
  let overBy = 0;
  let underBy = 0;

  if (min == null && max == null) {
    status = "unknown";
  } else if (max != null && effective > max) {
    status = "over";
    overBy = effective - max;
  } else if (min != null && effective < min) {
    status = "under";
    underBy = min - effective;
  }

  return {
    itemId: item.itemId,
    itemName: item.itemName,
    effectivePeople: effective,
    min,
    max,
    status,
    overBy,
    underBy,
  };
};

/** Alleen items die daadwerkelijk een probleem hebben. Cancelled items worden overgeslagen. */
export const findCapacityIssues = (
  items: CapacityItem[],
  numberOfPeople: number,
): CapacityResult[] =>
  items
    .filter((i) => (i.status ?? "").toLowerCase() !== "cancelled")
    .map((i) => checkCapacity(i, numberOfPeople))
    .filter((r) => r.status === "over" || r.status === "under");

/** Menselijke uitleg per issue, klaar voor toast/banner. */
export const describeCapacityIssue = (r: CapacityResult): string => {
  if (r.status === "over" && r.max != null) {
    return `${r.itemName}: ${r.effectivePeople} personen overschrijdt maximum van ${r.max}`;
  }
  if (r.status === "under" && r.min != null) {
    return `${r.itemName}: ${r.effectivePeople} personen ligt onder minimum van ${r.min}`;
  }
  return r.itemName;
};
