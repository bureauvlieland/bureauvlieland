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
  customer_portal_enabled: boolean;
  reminder_days_partner_quote: number;
  reminder_days_customer_quote: number;
  reminder_days_customer_request: number;
  reminder_email_enabled: boolean;
  portal_beta_banner_enabled: boolean;
  bureau_central_surcharge_pp: number;
  tourist_tax_pp_per_day: number;
  nature_contribution_pp: number;
  // Bureau company details (used on invoices)
  bureau_legal_name: string;
  bureau_company_name: string;
  bureau_street: string;
  bureau_postal_code: string;
  bureau_city: string;
  bureau_phone: string;
  bureau_website: string;
  bureau_admin_email: string;
  bureau_iban: string;
  bureau_kvk_number: string;
  bureau_vat_number: string;
  bureau_payment_term_days: number;
}

// Setting categories for grouping in admin UI
export const SETTING_CATEGORIES = {
  features: "Functies",
  bureau: "Bedrijfsgegevens",
  pricing: "Prijzen",
  vat: "BTW Tarieven",
  commission: "Commissies",
  reminders: "Herinneringen",
  system: "Systeem",
} as const;

export type SettingCategory = keyof typeof SETTING_CATEGORIES;
