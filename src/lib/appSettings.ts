// Central business constants and settings utilities
import type { FeeTier, AppSettingsMap, TodoAgeThreshold, TodoAgeThresholdsConfig } from "@/types/appSettings";

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
  default_partner_commission: 10,
  default_accommodation_commission: 10,
  request_expiry_days: 90,
  customer_portal_enabled: false,
  reminder_days_partner_quote: 5,
  reminder_days_customer_quote: 7,
  reminder_days_customer_request: 14,
  reminder_email_enabled: true,
  portal_beta_banner_enabled: false,
  bureau_central_surcharge_pp: 2.50,
  tourist_tax_pp_per_day: 2.58,
  nature_contribution_pp: 1.00,
  // Bureau company details (defaults)
  bureau_legal_name: "Bureau Vlieland B.V.",
  bureau_company_name: "Bureau Vlieland",
  bureau_street: "Sikkelduin 11",
  bureau_postal_code: "8899 CG",
  bureau_city: "Vlieland",
  bureau_phone: "+31 562 700 208",
  bureau_website: "bureauvlieland.nl",
  bureau_admin_email: "administratie@bureauvlieland.nl",
  bureau_iban: "NL68 INGB 0774 1221 37",
  bureau_kvk_number: "",
  bureau_vat_number: "",
  bureau_payment_term_days: 14,
  todo_age_thresholds: {
    default: { amber: 3, red: 7 },
    byType: {},
  },
  todo_due_soon_days: 3,
};

/** Veilige clamp voor de "actie nodig" drempel: integer tussen 1 en 30 dagen. */
export function getTodoDueSoonDays(value: number | undefined | null): number {
  const fallback = FALLBACK_SETTINGS.todo_due_soon_days;
  if (value === null || value === undefined) return fallback;
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  const intVal = Math.round(n);
  if (intVal < 1) return 1;
  if (intVal > 30) return 30;
  return intVal;
}

/**
 * Resolve the active threshold (amber/red days) for a given todo auto_type.
 * Falls back to `default` when the type has no specific override.
 */
export function getTodoAgeThreshold(
  autoType: string | null | undefined,
  config: TodoAgeThresholdsConfig | undefined,
): TodoAgeThreshold {
  const cfg = config ?? FALLBACK_SETTINGS.todo_age_thresholds;
  if (autoType && cfg.byType?.[autoType]) {
    return cfg.byType[autoType];
  }
  return cfg.default;
}

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
