import { isFeeExcluded } from "@/lib/excludedFees";
import { computeProjectFees, type FeeBreakdown } from "@/lib/feeEngine";
import type { FeeStructureSet } from "@/types/pricing";

/**
 * Automatische kostenposten (toeslagen en heffingen) voor de klantweergave.
 *
 * Eén waarheid voor klantportaal en admin: posten die per project zijn uitgesloten
 * (`program_requests.excluded_fees`) worden op 0 gezet én niet getoond.
 */
export interface AutomaticFeeSettings {
  tourist_tax_pp_per_day: number;
  nature_contribution_pp: number;
  bureau_central_surcharge_pp: number;
}

export interface AutomaticFeeArgs {
  numberOfPeople: number;
  numberOfDays: number;
  isBureauCentral: boolean;
  /** Coördinatiefee zoals bepaald door de staffel in de app-instellingen. */
  coordinationFeeForPeople: number;
  settings: AutomaticFeeSettings;
  excludedFees?: string[] | null;
  /**
   * Vastgelegde/actieve feestructuur. Aanwezig → organisatiefee (incl. extra
   * dagen en spoedtoeslag) en de opslag centrale facturatie komen uit de
   * fee-engine; `coordinationFeeForPeople` wordt dan genegeerd.
   */
  feeStructure?: FeeStructureSet | null;
  /** Doorbelaste partnerkosten incl. logies — grondslag voor de opslag. */
  partnerCostsTotal?: number;
  requestDate?: string | null;
  arrivalDate?: string | null;
  revisionFeesTotal?: number;
}

export interface AutomaticFeeTotals {
  touristTax: number;
  natureContribution: number;
  coordinationFee: number;
  centralSurcharge: number;
  showTouristTax: boolean;
  showNatureContribution: boolean;
  showCoordinationFee: boolean;
  /** Som van de 21%-BTW-posten. */
  standardVatFeeTotal: number;
  /** Som van de 0%-BTW-heffingen. */
  zeroVatFeeTotal: number;
  /** Som van alle automatische posten incl. BTW. */
  totalInclVat: number;
  /** Gefactureerde wijzigingsrondes (21% BTW). */
  revisionFees: number;
  /** Onderbouwing per post wanneer de fee-engine is gebruikt. */
  feeBreakdown?: FeeBreakdown;
}

export function computeAutomaticFees({
  numberOfPeople,
  numberOfDays,
  isBureauCentral,
  coordinationFeeForPeople,
  settings,
  excludedFees,
  feeStructure,
  partnerCostsTotal = 0,
  requestDate,
  arrivalDate,
  revisionFeesTotal = 0,
}: AutomaticFeeArgs): AutomaticFeeTotals {
  const excludeTouristTax = isFeeExcluded(excludedFees, "tourist_tax");
  const excludeNature = isFeeExcluded(excludedFees, "nature_contribution");
  const excludeCoordination = isFeeExcluded(excludedFees, "coordination_fee");
  const excludeCentralSurcharge = isFeeExcluded(excludedFees, "central_surcharge");

  const people = Number(numberOfPeople || 0);
  const days = Number(numberOfDays || 0);

  const touristTax = excludeTouristTax
    ? 0
    : Number(settings.tourist_tax_pp_per_day || 0) * people * days;
  const natureContribution = excludeNature
    ? 0
    : Number(settings.nature_contribution_pp || 0) * people;
  const feeBreakdown = feeStructure
    ? computeProjectFees({
        structure: feeStructure,
        numberOfPeople: people,
        numberOfDays: days,
        isBureauCentral,
        partnerCostsTotal,
        excludedFees,
        requestDate,
        arrivalDate,
        revisionFeesTotal,
      })
    : undefined;

  const coordinationFee = feeBreakdown
    ? feeBreakdown.coordinationFee
    : excludeCoordination
      ? 0
      : Number(coordinationFeeForPeople || 0);
  const centralSurcharge = feeBreakdown
    ? feeBreakdown.centralSurcharge
    : isBureauCentral && !excludeCentralSurcharge
      ? Number(settings.bureau_central_surcharge_pp || 0) * people
      : 0;
  const revisionFees = feeBreakdown ? feeBreakdown.revisionFeesTotal : 0;

  const standardVatFeeTotal = coordinationFee + centralSurcharge + revisionFees;
  const zeroVatFeeTotal = touristTax + natureContribution;

  return {
    touristTax,
    natureContribution,
    coordinationFee,
    centralSurcharge,
    showTouristTax: !excludeTouristTax,
    showNatureContribution: !excludeNature,
    showCoordinationFee: !excludeCoordination,
    standardVatFeeTotal,
    zeroVatFeeTotal,
    totalInclVat: standardVatFeeTotal + zeroVatFeeTotal,
    revisionFees,
    feeBreakdown,
  };
}
