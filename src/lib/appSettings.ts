// Central business constants and settings utilities
import type { FeeTier, AppSettingsMap } from "@/types/appSettings";

// ============================================
// FALLBACK VALUES (used when DB is unavailable)
// ============================================

export const FALLBACK_FEE_TIERS: FeeTier[] = [
  { maxPeople: 10, fee: 50 },
  { maxPeople: 25, fee: 100 },
  { maxPeople: 100, fee: 250 },
  { maxPeople: 150, fee: 350 },
  { maxPeople: 999999, fee: 500 },
];

export const FALLBACK_SETTINGS: AppSettingsMap = {
  coordination_fee_tiers: FALLBACK_FEE_TIERS,
  default_vat_rate: 21,
  accommodation_vat_rate: 9,
  default_partner_commission: 15,
  default_accommodation_commission: 10,
  request_expiry_days: 90,
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Calculate coordination fee based on group size and fee tiers
 * @param numberOfPeople - The number of people in the group
 * @param feeTiers - Optional custom fee tiers (uses fallback if not provided)
 */
export function getCoordinationFee(
  numberOfPeople: number,
  feeTiers: FeeTier[] = FALLBACK_FEE_TIERS
): number {
  const sortedTiers = [...feeTiers].sort((a, b) => a.maxPeople - b.maxPeople);
  const tier = sortedTiers.find((t) => numberOfPeople <= t.maxPeople);
  return tier?.fee ?? 500;
}

/**
 * Get VAT rate for a given type
 */
export function getVatRate(
  type: "standard" | "accommodation",
  settings?: Partial<AppSettingsMap>
): number {
  if (type === "accommodation") {
    return settings?.accommodation_vat_rate ?? FALLBACK_SETTINGS.accommodation_vat_rate;
  }
  return settings?.default_vat_rate ?? FALLBACK_SETTINGS.default_vat_rate;
}

/**
 * Get commission rate for a given partner type
 */
export function getCommissionRate(
  type: "partner" | "accommodation",
  settings?: Partial<AppSettingsMap>
): number {
  if (type === "accommodation") {
    return settings?.default_accommodation_commission ?? FALLBACK_SETTINGS.default_accommodation_commission;
  }
  return settings?.default_partner_commission ?? FALLBACK_SETTINGS.default_partner_commission;
}

/**
 * Calculate amount excluding VAT from amount including VAT
 */
export function calculateExclVat(amountInclVat: number, vatRate: number): number {
  return amountInclVat / (1 + vatRate / 100);
}

/**
 * Calculate VAT amount from amount including VAT
 */
export function calculateVatAmount(amountInclVat: number, vatRate: number): number {
  return amountInclVat - calculateExclVat(amountInclVat, vatRate);
}

/**
 * Format fee tier for display
 */
export function formatFeeTierRange(tier: FeeTier, index: number, tiers: FeeTier[]): string {
  const prevMax = index > 0 ? tiers[index - 1].maxPeople + 1 : 1;
  const maxDisplay = tier.maxPeople >= 999999 ? "+" : tier.maxPeople;
  
  if (tier.maxPeople >= 999999) {
    return `${prevMax}+ personen`;
  }
  return `${prevMax}-${maxDisplay} personen`;
}

// ============================================
// DEFAULT GROUP SIZE (for initial state only)
// ============================================

export const DEFAULT_GROUP_SIZE = 20;
