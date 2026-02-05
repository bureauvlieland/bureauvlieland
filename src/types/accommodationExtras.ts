export type ExtraCategory = 'fb' | 'facilities' | 'transport' | 'other';
export type ExtraPricingType = 'per_person' | 'fixed';

export interface AccommodationQuoteExtra {
  id: string;
  quote_id: string;
  name: string;
  description: string | null;
  quantity: number;
  unit_price: number;
  pricing_type: ExtraPricingType;
  price_includes_vat: boolean;
  vat_rate: number;
  category: ExtraCategory | null;
  notes: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface AccommodationQuoteExtraInsert {
  quote_id: string;
  name: string;
  description?: string | null;
  quantity?: number;
  unit_price: number;
  pricing_type?: ExtraPricingType;
  price_includes_vat?: boolean;
  vat_rate?: number;
  category?: ExtraCategory | null;
  notes?: string | null;
  sort_order?: number;
}

export interface AccommodationQuoteExtraUpdate {
  name?: string;
  description?: string | null;
  quantity?: number;
  unit_price?: number;
  pricing_type?: ExtraPricingType;
  price_includes_vat?: boolean;
  vat_rate?: number;
  category?: ExtraCategory | null;
  notes?: string | null;
  sort_order?: number;
}

export const EXTRA_CATEGORY_LABELS: Record<ExtraCategory, string> = {
  fb: 'F&B',
  facilities: 'Faciliteiten',
  transport: 'Transport',
  other: 'Overig',
};

export const EXTRA_CATEGORY_ICONS: Record<ExtraCategory, string> = {
  fb: '🍽️',
  facilities: '🏢',
  transport: '🚗',
  other: '📦',
};

export function calculateExtraTotal(extra: AccommodationQuoteExtra): number {
  if (extra.pricing_type === 'fixed') {
    return extra.unit_price;
  }
  return extra.unit_price * extra.quantity;
}

export function calculateExtrasTotal(extras: AccommodationQuoteExtra[]): number {
  return extras.reduce((sum, extra) => sum + calculateExtraTotal(extra), 0);
}
