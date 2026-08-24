/**
 * Eén waarheid voor de berekening van bureaufees (organisatiefee 2.0).
 *
 * De berekening werkt uitsluitend op een `FeeStructureSet`: normaal de snapshot
 * die bij aanmaak op het project is vastgelegd (`program_requests.fee_snapshot`),
 * met de actieve structuur als fallback voor projecten zonder snapshot.
 *
 * Toeristenbelasting en natuurbijdrage vallen hier bewust buiten: die logica
 * blijft ongewijzigd in `customerFeeTotals` / `adminInvoicingTotals`.
 */
import {
  DEFAULT_FEE_STRUCTURE,
  LEGACY_FEE_STRUCTURE,
  type FeeStructureSet,
  type PricingStructureRow,
} from "@/types/pricing";
import { isFeeExcluded } from "@/lib/excludedFees";

const round2 = (n: number) => Math.round(n * 100) / 100;

export interface FeeEngineArgs {
  structure: FeeStructureSet;
  numberOfPeople: number;
  /** Aantal programmadagen (uit de projectdatums). Minimaal 1. */
  numberOfDays: number;
  isBureauCentral: boolean;
  /** Totaal van de doorbelaste partnerkosten incl. logies (incl. BTW). */
  partnerCostsTotal: number;
  excludedFees?: string[] | null;
  /** Datum van de aanvraag (fallback: vandaag) — voor de spoedtoeslag. */
  requestDate?: string | Date | null;
  /** Eerste programmadag — voor de spoedtoeslag. */
  arrivalDate?: string | Date | null;
  /** Som van de aangevinkte wijzigingsrondes. */
  revisionFeesTotal?: number;
}

export interface FeeBreakdown {
  /** Basisbedrag van de gekozen staffel (dag 1). */
  coordinationBase: number;
  /** Bedrag voor de dagen ná dag 1. */
  coordinationExtraDays: number;
  /** Basis + extra dagen, vóór spoedtoeslag. */
  coordinationSubtotal: number;
  rushSurcharge: number;
  /** Volledige organisatiefee incl. spoedtoeslag (0 als uitgesloten). */
  coordinationFee: number;
  centralSurcharge: number;
  revisionFeesTotal: number;
  /** Bedragen tegen 21% BTW. */
  standardVatFeeTotal: number;
  tierLabel: string;
  numberOfDays: number;
  extraDayPct: number;
  rushApplies: boolean;
  rushPct: number;
  centralSurchargeMode: "percentage" | "per_person";
  centralSurchargePct: number;
  centralSurchargeMinimum: number;
  centralSurchargeRaw: number;
  /** Menselijke uitleg per post, voor het fee-overzicht in de admin. */
  explanations: { label: string; formula: string; amount: number }[];
}

const toDate = (value: string | Date | null | undefined): Date | null => {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

/** Bepaalt de staffel voor het aantal personen; valt terug op de hoogste staffel. */
export function resolveCoordinationBase(
  structure: FeeStructureSet,
  numberOfPeople: number,
): { base: number; label: string } {
  const people = Math.max(Number(numberOfPeople) || 0, 0);
  const cf = structure.coordination_fee ?? { extra_day_pct: 0 };

  if (Array.isArray(cf.tiers) && cf.tiers.length > 0) {
    const sorted = [...cf.tiers].sort((a, b) => a.min_people - b.min_people);
    const tier = sorted.find((t) => people >= t.min_people && people <= t.max_people)
      ?? (people > sorted[sorted.length - 1].max_people ? sorted[sorted.length - 1] : sorted[0]);
    const label = tier.max_people >= 999999
      ? `${tier.min_people}+ personen`
      : `${tier.min_people}–${tier.max_people} personen`;
    return { base: Number(tier.base) || 0, label };
  }

  if (Array.isArray(cf.legacy_tiers) && cf.legacy_tiers.length > 0) {
    const sorted = [...cf.legacy_tiers].sort((a, b) => a.maxPeople - b.maxPeople);
    const idx = sorted.findIndex((t) => people <= t.maxPeople);
    const tier = idx >= 0 ? sorted[idx] : sorted[sorted.length - 1];
    const min = idx > 0 ? sorted[idx - 1].maxPeople + 1 : 1;
    const label = tier.maxPeople >= 999999 ? `${min}+ personen` : `${min}–${tier.maxPeople} personen`;
    return { base: Number(tier.fee) || 0, label };
  }

  return { base: 0, label: "geen staffel" };
}

/** Valt de aanvraag binnen het spoedvenster voor aankomst? */
export function isRushRequest(
  weeks: number,
  requestDate: string | Date | null | undefined,
  arrivalDate: string | Date | null | undefined,
): boolean {
  const w = Number(weeks) || 0;
  if (w <= 0) return false;
  const arrival = toDate(arrivalDate);
  if (!arrival) return false;
  const requested = toDate(requestDate) ?? new Date();
  const diffDays = (arrival.getTime() - requested.getTime()) / 86_400_000;
  if (diffDays < 0) return false;
  return diffDays <= w * 7;
}

export function computeProjectFees({
  structure,
  numberOfPeople,
  numberOfDays,
  isBureauCentral,
  partnerCostsTotal,
  excludedFees,
  requestDate,
  arrivalDate,
  revisionFeesTotal = 0,
}: FeeEngineArgs): FeeBreakdown {
  const days = Math.max(Number(numberOfDays) || 0, 1);
  const cf = structure.coordination_fee ?? { extra_day_pct: 0 };
  const extraDayPct = Math.max(Number(cf.extra_day_pct) || 0, 0);
  const { base, label } = resolveCoordinationBase(structure, numberOfPeople);

  const coordinationExcluded = isFeeExcluded(excludedFees, "coordination_fee");
  const centralExcluded = isFeeExcluded(excludedFees, "central_surcharge");

  const coordinationBase = round2(base);
  const coordinationExtraDays = round2(base * (extraDayPct / 100) * (days - 1));
  const coordinationSubtotal = round2(coordinationBase + coordinationExtraDays);

  const rush = structure.rush_surcharge ?? { pct: 0, weeks: 0 };
  const rushPct = Math.max(Number(rush.pct) || 0, 0);
  const rushApplies = rushPct > 0
    && (typeof rush.applies === "boolean"
      ? rush.applies
      : isRushRequest(rush.weeks, requestDate, arrivalDate));
  const rushSurcharge = rushApplies ? round2(coordinationSubtotal * (rushPct / 100)) : 0;

  const coordinationFee = coordinationExcluded ? 0 : round2(coordinationSubtotal + rushSurcharge);

  const cs = structure.central_invoicing_surcharge ?? {};
  const mode: "percentage" | "per_person" = cs.mode === "per_person" ? "per_person" : "percentage";
  const csPct = Math.max(Number(cs.pct) || 0, 0);
  const csMinimum = Math.max(Number(cs.minimum) || 0, 0);
  const csPerPerson = Math.max(Number(cs.per_person) || 0, 0);
  const partnerCosts = Math.max(Number(partnerCostsTotal) || 0, 0);

  const centralSurchargeRaw = mode === "per_person"
    ? round2(csPerPerson * (Number(numberOfPeople) || 0))
    : round2(partnerCosts * (csPct / 100));
  const centralSurchargeApplied = mode === "per_person"
    ? centralSurchargeRaw
    : round2(Math.max(centralSurchargeRaw, partnerCosts > 0 ? csMinimum : 0));
  const centralSurcharge = isBureauCentral && !centralExcluded ? centralSurchargeApplied : 0;

  const revisions = round2(Math.max(Number(revisionFeesTotal) || 0, 0));

  const explanations: FeeBreakdown["explanations"] = [];
  if (!coordinationExcluded && coordinationSubtotal > 0) {
    explanations.push({
      label: `Organisatiefee — staffel ${label}`,
      formula: days > 1
        ? `€ ${coordinationBase.toFixed(2)} (dag 1) + ${days - 1} × ${extraDayPct}% = € ${coordinationExtraDays.toFixed(2)}`
        : `€ ${coordinationBase.toFixed(2)} (1 programmadag)`,
      amount: coordinationSubtotal,
    });
    if (rushSurcharge > 0) {
      explanations.push({
        label: "Spoedtoeslag",
        formula: `${rushPct}% over € ${coordinationSubtotal.toFixed(2)} (aanvraag binnen ${rush.weeks} weken voor aankomst)`,
        amount: rushSurcharge,
      });
    }
  }
  if (centralSurcharge > 0) {
    explanations.push({
      label: "Opslag centrale facturatie",
      formula: mode === "per_person"
        ? `€ ${csPerPerson.toFixed(2)} p.p. × ${numberOfPeople} personen (oude structuur)`
        : `${csPct}% over € ${partnerCosts.toFixed(2)} partnerkosten${centralSurchargeApplied > centralSurchargeRaw ? ` — minimum € ${csMinimum.toFixed(2)} toegepast` : ""}`,
      amount: centralSurcharge,
    });
  }
  if (revisions > 0) {
    explanations.push({
      label: "Programmawijzigingen",
      formula: "Aangevinkte wijzigingsrondes na klantakkoord",
      amount: revisions,
    });
  }

  return {
    coordinationBase,
    coordinationExtraDays,
    coordinationSubtotal,
    rushSurcharge,
    coordinationFee,
    centralSurcharge,
    revisionFeesTotal: revisions,
    standardVatFeeTotal: round2(coordinationFee + centralSurcharge + revisions),
    tierLabel: label,
    numberOfDays: days,
    extraDayPct,
    rushApplies,
    rushPct,
    centralSurchargeMode: mode,
    centralSurchargePct: csPct,
    centralSurchargeMinimum: csMinimum,
    centralSurchargeRaw,
    explanations,
  };
}

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};

/**
 * Bouwt de actieve structuur op uit de rijen van `pricing_structures`
 * (hoogste `effective_from <= referentiedatum` per key).
 */
export function buildActiveStructure(
  rows: PricingStructureRow[] | null | undefined,
  referenceDate: Date = new Date(),
): FeeStructureSet {
  if (!rows || rows.length === 0) return DEFAULT_FEE_STRUCTURE;
  const ref = referenceDate.toISOString().slice(0, 10);
  const pick = (key: string) =>
    rows
      .filter((r) => r.key === key && r.effective_from <= ref)
      .sort((a, b) => (a.effective_from < b.effective_from ? 1 : -1))[0]?.value;

  const coordination = asRecord(pick("coordination_fee"));
  const revision = asRecord(pick("revision_fee"));
  const rush = asRecord(pick("rush_surcharge"));
  const central = asRecord(pick("central_invoicing_surcharge"));

  return {
    model: "tiered_v2",
    coordination_fee: Object.keys(coordination).length
      ? (coordination as unknown as FeeStructureSet["coordination_fee"])
      : DEFAULT_FEE_STRUCTURE.coordination_fee,
    revision_fee: Object.keys(revision).length
      ? (revision as unknown as FeeStructureSet["revision_fee"])
      : DEFAULT_FEE_STRUCTURE.revision_fee,
    rush_surcharge: Object.keys(rush).length
      ? (rush as unknown as FeeStructureSet["rush_surcharge"])
      : DEFAULT_FEE_STRUCTURE.rush_surcharge,
    central_invoicing_surcharge: Object.keys(central).length
      ? (central as unknown as FeeStructureSet["central_invoicing_surcharge"])
      : DEFAULT_FEE_STRUCTURE.central_invoicing_surcharge,
  };
}

/**
 * Kiest de structuur voor een project: de vastgelegde snapshot wint altijd,
 * zodat bestaande offertes en facturen niet van bedrag veranderen.
 */
export function resolveFeeStructure(
  snapshot: unknown,
  activeStructure?: FeeStructureSet | null,
): FeeStructureSet {
  const snap = asRecord(snapshot);
  if (snap.coordination_fee) {
    return {
      model: snap.model === "legacy" ? "legacy" : "tiered_v2",
      snapshot_at: typeof snap.snapshot_at === "string" ? snap.snapshot_at : undefined,
      coordination_fee: snap.coordination_fee as FeeStructureSet["coordination_fee"],
      revision_fee: (asRecord(snap.revision_fee) as unknown as FeeStructureSet["revision_fee"]) ?? { amount: 0 },
      rush_surcharge: (asRecord(snap.rush_surcharge) as unknown as FeeStructureSet["rush_surcharge"]) ?? { pct: 0, weeks: 0 },
      central_invoicing_surcharge:
        asRecord(snap.central_invoicing_surcharge) as unknown as FeeStructureSet["central_invoicing_surcharge"],
    };
  }
  return activeStructure ?? LEGACY_FEE_STRUCTURE;
}

/** Som van de wijzigingsrondes die daadwerkelijk gefactureerd worden. */
export function sumBillableRevisions(
  charges: { billable: boolean; amount: number }[] | null | undefined,
): number {
  if (!Array.isArray(charges)) return 0;
  return round2(charges.filter((c) => c.billable).reduce((s, c) => s + (Number(c.amount) || 0), 0));
}

/** Factuurregel-omschrijving voor een wijzigingsronde. */
export function revisionFeeDescription(round: number, publishedAt: string | Date): string {
  const d = toDate(publishedAt) ?? new Date();
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `Programmawijziging ronde ${round} — ${dd}-${mm}`;
}
