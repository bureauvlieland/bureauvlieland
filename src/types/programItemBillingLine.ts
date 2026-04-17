export interface ProgramItemBillingLine {
  id: string;
  item_id: string;
  description: string;
  quantity: number;
  unit_price_excl_vat: number;
  vat_rate: number;
  amount_excl_vat: number;
  vat_amount: number;
  amount_incl_vat: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface ProgramItemBillingLineInput {
  description: string;
  quantity: number;
  unit_price_excl_vat: number;
  vat_rate: number;
  sort_order: number;
}

export const VAT_RATE_OPTIONS = [
  { value: 0, label: "0%" },
  { value: 9, label: "9%" },
  { value: 21, label: "21%" },
];

const round2 = (n: number) => Math.round(n * 100) / 100;

export function computeBillingLineAmounts(
  quantity: number,
  unitPriceExclVat: number,
  vatRate: number,
) {
  const amount_excl_vat = round2(quantity * unitPriceExclVat);
  const vat_amount = round2(amount_excl_vat * (vatRate / 100));
  const amount_incl_vat = round2(amount_excl_vat + vat_amount);
  return { amount_excl_vat, vat_amount, amount_incl_vat };
}
