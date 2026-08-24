/**
 * Prijsstructuur-types voor de organisatiefee 2.0.
 *
 * De actieve structuur staat in `public.pricing_structures` (per `key` de versie
 * met de hoogste `effective_from <= vandaag`). Elk project legt bij aanmaak de
 * gebruikte structuur vast in `program_requests.fee_snapshot`, zodat lopende
 * offertes en facturen nooit van bedrag veranderen.
 */

export type PricingStructureKey =
  | "coordination_fee"
  | "revision_fee"
  | "rush_surcharge"
  | "central_invoicing_surcharge";

export const PRICING_STRUCTURE_KEYS: PricingStructureKey[] = [
  "coordination_fee",
  "revision_fee",
  "rush_surcharge",
  "central_invoicing_surcharge",
];

export const PRICING_STRUCTURE_LABELS: Record<PricingStructureKey, string> = {
  coordination_fee: "Organisatiefee staffels",
  revision_fee: "Wijzigingsfee per ronde",
  rush_surcharge: "Spoedtoeslag",
  central_invoicing_surcharge: "Opslag centrale facturatie",
};

export const PRICING_STRUCTURE_DESCRIPTIONS: Record<PricingStructureKey, string> = {
  coordination_fee:
    "Basisbedrag per groepsgrootte. Extra programmadagen worden doorgerekend tegen het ingestelde percentage.",
  revision_fee:
    "Vast bedrag per wijzigingsronde nadat de klant akkoord heeft gegeven. Per ronde bepaal je of het gefactureerd wordt.",
  rush_surcharge:
    "Percentage over de organisatiefee wanneer de aanvraag binnen het ingestelde aantal weken voor aankomst valt.",
  central_invoicing_surcharge:
    "Percentage over de partnerkosten op de factuur, met een minimumbedrag per project.",
};

/** Staffel op groepsgrootte met basisbedrag (incl. BTW) voor dag 1. */
export interface CoordinationTier {
  min_people: number;
  max_people: number;
  base: number;
}

/** Oude, vlakke staffel (alleen nog voor legacy-snapshots). */
export interface LegacyCoordinationTier {
  maxPeople: number;
  fee: number;
}

export interface CoordinationFeeStructure {
  tiers?: CoordinationTier[];
  /** Percentage van het basisbedrag dat elke dag ná dag 1 kost (0-100). */
  extra_day_pct: number;
  /** Alleen aanwezig op legacy-snapshots. */
  legacy_tiers?: LegacyCoordinationTier[];
}

export interface RevisionFeeStructure {
  amount: number;
}

export interface RushSurchargeStructure {
  pct: number;
  weeks: number;
  /** Vastgelegd bij aanmaak: gold de spoedtoeslag voor dit project? */
  applies?: boolean;
}

export interface CentralInvoicingSurchargeStructure {
  /** "percentage" (nieuw) of "per_person" (legacy). */
  mode?: "percentage" | "per_person";
  pct?: number;
  minimum?: number;
  per_person?: number;
}

export interface FeeStructureSet {
  model: "tiered_v2" | "legacy";
  snapshot_at?: string;
  coordination_fee: CoordinationFeeStructure;
  revision_fee: RevisionFeeStructure;
  rush_surcharge: RushSurchargeStructure;
  central_invoicing_surcharge: CentralInvoicingSurchargeStructure;
}

export interface PricingStructureRow {
  id: string;
  key: string;
  label: string;
  value: unknown;
  effective_from: string;
  created_at: string;
  updated_at: string;
  updated_by: string | null;
}

export interface ProgramRevisionCharge {
  id: string;
  request_id: string;
  round: number;
  published_at: string;
  billable: boolean;
  amount: number;
  description: string | null;
  created_at: string;
  updated_at: string;
}

/** Actuele standaardstructuur — fallback als de database niet bereikbaar is. */
export const DEFAULT_FEE_STRUCTURE: FeeStructureSet = {
  model: "tiered_v2",
  coordination_fee: {
    tiers: [
      { min_people: 1, max_people: 10, base: 175 },
      { min_people: 11, max_people: 25, base: 250 },
      { min_people: 26, max_people: 50, base: 395 },
      { min_people: 51, max_people: 100, base: 595 },
      { min_people: 101, max_people: 150, base: 895 },
      { min_people: 151, max_people: 999999, base: 1250 },
    ],
    extra_day_pct: 60,
  },
  revision_fee: { amount: 95 },
  rush_surcharge: { pct: 25, weeks: 4 },
  central_invoicing_surcharge: { mode: "percentage", pct: 3, minimum: 75 },
};

/** Structuur zoals die vóór de herziening gold (voor projecten zonder snapshot). */
export const LEGACY_FEE_STRUCTURE: FeeStructureSet = {
  model: "legacy",
  coordination_fee: {
    extra_day_pct: 0,
    legacy_tiers: [
      { maxPeople: 10, fee: 150 },
      { maxPeople: 25, fee: 200 },
      { maxPeople: 100, fee: 250 },
      { maxPeople: 150, fee: 400 },
      { maxPeople: 999999, fee: 500 },
    ],
  },
  revision_fee: { amount: 0 },
  rush_surcharge: { pct: 0, weeks: 0, applies: false },
  central_invoicing_surcharge: { mode: "per_person", per_person: 2.5 },
};
