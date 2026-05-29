/**
 * Per-project uitsluitbare automatische kostenposten op de factuur.
 * Worden opgeslagen als text[] kolom `excluded_fees` op program_requests.
 */
export type ExcludableFeeKey =
  | "tourist_tax"
  | "nature_contribution"
  | "central_surcharge"
  | "coordination_fee";

export const EXCLUDABLE_FEE_LABELS: Record<ExcludableFeeKey, string> = {
  tourist_tax: "Toeristenbelasting",
  nature_contribution: "Natuurbijdrage",
  central_surcharge: "Opslag centrale facturatie",
  coordination_fee: "Coördinatiefee",
};

export function isFeeExcluded(
  excluded: string[] | null | undefined,
  key: ExcludableFeeKey,
): boolean {
  if (!Array.isArray(excluded)) return false;
  return excluded.includes(key);
}
