/**
 * Staffel voor de doorverwijsvergoeding van bruiloften
 * (docs/plan-bruiloftsdoorverwijzingen.md).
 *
 * Een staffel heeft een ingangsdatum en treden op aantal daggasten. Welke
 * staffel geldt, bepaalt de datum doorverwezen: een latere staffel raakt een
 * eerdere doorverwijzing niet. De uitkomst wordt bij "geboekt" op de
 * doorverwijzing vastgelegd; hier wordt alleen gerekend.
 */

export interface FeeTier {
  /** Bovengrens (inclusief) van deze trede; null = alles boven de vorige trede. */
  max_guests: number | null;
  /** Bedrag excl. btw. */
  fee: number;
}

export interface FeeScheduleLike {
  id: string;
  /** ISO-datum (yyyy-MM-dd). */
  effective_from: string;
  tiers: unknown;
  multi_day_surcharge: number;
}

export interface FeeCalculation {
  tier: FeeTier;
  base: number;
  surcharge: number;
  total: number;
}

export const DEFAULT_FEE_TIERS: FeeTier[] = [
  { max_guests: 50, fee: 350 },
  { max_guests: 100, fee: 550 },
  { max_guests: null, fee: 750 },
];

const toNumber = (v: unknown): number | null => {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v))) return Number(v);
  return null;
};

/**
 * Leest de treden uit de jsonb-kolom: ongeldige regels vallen weg, de
 * treden komen oplopend op grens te staan en de open trede (null) als laatste.
 */
export function normalizeTiers(raw: unknown): FeeTier[] {
  if (!Array.isArray(raw)) return [];
  const tiers: FeeTier[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const rec = item as Record<string, unknown>;
    const fee = toNumber(rec.fee);
    if (fee === null || fee < 0) continue;
    const max = rec.max_guests === null || rec.max_guests === undefined ? null : toNumber(rec.max_guests);
    if (max !== null && (max < 0 || !Number.isInteger(max))) continue;
    tiers.push({ max_guests: max, fee });
  }
  tiers.sort((a, b) => {
    if (a.max_guests === null) return b.max_guests === null ? 0 : 1;
    if (b.max_guests === null) return -1;
    return a.max_guests - b.max_guests;
  });
  return tiers;
}

/** Bevindingen bij het bewaren van een staffel; leeg = in orde. */
export function validateTiers(tiers: FeeTier[]): string[] {
  const problems: string[] = [];
  if (tiers.length === 0) problems.push("Minstens één trede is nodig.");
  const open = tiers.filter((t) => t.max_guests === null).length;
  if (open === 0) problems.push("De laatste trede moet open zijn (geen bovengrens), anders is er geen bedrag voor grote bruiloften.");
  if (open > 1) problems.push("Er kan maar één open trede zijn.");
  const grenzen = tiers.map((t) => t.max_guests).filter((g): g is number => g !== null);
  if (new Set(grenzen).size !== grenzen.length) problems.push("Twee treden hebben dezelfde bovengrens.");
  return problems;
}

/**
 * De staffel die geldt op een datum: de laatste met een ingangsdatum op of
 * vóór die dag. Null als er op die dag nog geen staffel bestond.
 */
export function pickFeeSchedule<T extends { effective_from: string }>(schedules: T[], onDate: string): T | null {
  let best: T | null = null;
  for (const s of schedules) {
    if (s.effective_from > onDate) continue;
    if (!best || s.effective_from > best.effective_from) best = s;
  }
  return best;
}

/** De trede waar een aantal daggasten in valt. */
export function pickTier(tiers: FeeTier[], dayGuests: number): FeeTier | null {
  for (const t of tiers) {
    if (t.max_guests === null || dayGuests <= t.max_guests) return t;
  }
  return null;
}

/**
 * De vergoeding voor een geboekte bruiloft volgens een staffel: trede op
 * aantal daggasten, plus de toeslag als de bruiloft meerdaags is.
 */
export function calculateReferralFee(
  input: { dayGuests: number; multiDay: boolean },
  schedule: Pick<FeeScheduleLike, "tiers" | "multi_day_surcharge">,
): FeeCalculation | null {
  if (!Number.isFinite(input.dayGuests) || input.dayGuests < 0) return null;
  const tier = pickTier(normalizeTiers(schedule.tiers), Math.floor(input.dayGuests));
  if (!tier) return null;
  const surcharge = input.multiDay ? Number(schedule.multi_day_surcharge) || 0 : 0;
  const base = tier.fee;
  return { tier, base, surcharge, total: round2(base + surcharge) };
}

/** Leesbare omschrijving van een trede: "t/m 50", "51 t/m 100", "meer dan 100". */
export function describeTier(tiers: FeeTier[], index: number): string {
  const t = tiers[index];
  if (!t) return "";
  const vorige = index > 0 ? tiers[index - 1].max_guests : null;
  if (t.max_guests === null) return vorige === null ? "alle aantallen" : `meer dan ${vorige}`;
  if (vorige === null) return `t/m ${t.max_guests}`;
  return `${vorige + 1} t/m ${t.max_guests}`;
}

export const round2 = (n: number) => Math.round(n * 100) / 100;
