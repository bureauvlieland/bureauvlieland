/**
 * Helper voor commissiepercentages per partner.
 * - 'activity' → `partner.commission_percentage` (default 10)
 * - 'lodging'  → `partner.accommodation_commission_percentage` ?? 10
 * - 'extras'   → `partner.extras_commission_percentage` ?? accommodation ?? 10
 *
 * Achtergrond: hotels rekenen vaak een ander percentage over extras (F&B,
 * faciliteiten) dan over kamerprijs. Bv. Badhotel Bruin = 10% kamer / 0% extras,
 * Zeezicht = 10% / 10%.
 */
export type CommissionKind = "activity" | "lodging" | "extras";

export interface CommissionPartner {
  commission_percentage?: number | null;
  accommodation_commission_percentage?: number | null;
  extras_commission_percentage?: number | null;
}

const DEFAULT_RATE = 10;

export function getCommissionRate(
  partner: CommissionPartner | null | undefined,
  kind: CommissionKind,
): number {
  if (!partner) return DEFAULT_RATE;
  if (kind === "activity") {
    return Number(partner.commission_percentage ?? DEFAULT_RATE);
  }
  if (kind === "lodging") {
    return Number(partner.accommodation_commission_percentage ?? DEFAULT_RATE);
  }
  // extras
  if (partner.extras_commission_percentage != null) {
    return Number(partner.extras_commission_percentage);
  }
  if (partner.accommodation_commission_percentage != null) {
    return Number(partner.accommodation_commission_percentage);
  }
  return DEFAULT_RATE;
}

export const EXTRA_CATEGORY_LABELS: Record<string, string> = {
  fb: "F&B (eten & drinken)",
  facilities: "Faciliteiten",
  transport: "Transport",
  other: "Overig",
};

export type ExtraCategory = keyof typeof EXTRA_CATEGORY_LABELS;
