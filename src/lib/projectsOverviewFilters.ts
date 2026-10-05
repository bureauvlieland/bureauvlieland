import type { OverviewRow } from "@/lib/getProjectsOverview";

/**
 * Doorverwezen projecten (bruiloft naar een partner) horen niet meer in het
 * werkoverzicht. Standaard vallen ze weg; met `onlyReferred` zie je juist alleen
 * die. Het archief-filter geldt dan niet: een doorverwijzing is geen afgerond project.
 */
export function splitReferred<T extends Pick<OverviewRow, "referral">>(
  rows: T[],
  onlyReferred: boolean,
): { visible: T[]; referredCount: number } {
  const referred = rows.filter(r => !!r.referral);
  return { visible: onlyReferred ? referred : rows.filter(r => !r.referral), referredCount: referred.length };
}
