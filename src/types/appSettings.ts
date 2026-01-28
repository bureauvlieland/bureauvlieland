// App Settings types

export interface FeeTier {
  maxPeople: number;
  fee: number;
}

export type SettingValueType = "number" | "text" | "json" | "boolean";

export interface AppSetting {
  id: string;
  category: string;
  label: string;
  description: string | null;
  value_type: SettingValueType;
  value: unknown;
  updated_at: string;
  updated_by: string | null;
}

export interface AppSettingsMap {
  coordination_fee_tiers: FeeTier[];
  default_vat_rate: number;
  accommodation_vat_rate: number;
  default_partner_commission: number;
  default_accommodation_commission: number;
  request_expiry_days: number;
}

// Setting categories for grouping in admin UI
export const SETTING_CATEGORIES = {
  pricing: "Prijzen",
  vat: "BTW Tarieven",
  commission: "Commissies",
  system: "Systeem",
} as const;

export type SettingCategory = keyof typeof SETTING_CATEGORIES;
