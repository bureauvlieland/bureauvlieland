/**
 * Commissie over logies, per component berekend.
 *
 * Achtergrond: `apply-purchase-invoice-to-lodging` zet de eindfactuur van de
 * partner 1-op-1 op de offerte — kamerregels overschrijven `price_total`, elke
 * extra-regel wordt een `accommodation_quote_extras`-rij mét eigen btw-tarief en
 * eigen commissiepercentage, en toeristenbelasting wordt bewust weggelaten omdat
 * die al in onze verkoopfactuur zit.
 *
 * Die zorgvuldigheid ging daarna verloren: de commissieberekening telde alles op
 * tot één bedrag, rekende dat terug tegen het btw-tarief van de kámer en paste er
 * één percentage op toe. Deze module rekent per component, met het tarief en het
 * percentage die bij dat component horen.
 */

/** Btw-tarief dat geldt als een logiesregel er zelf geen heeft staan. */
export const DEFAULT_LODGING_VAT_RATE = 9;

export const round2 = (value: number): number => Math.round(value * 100) / 100;

export interface LodgingAmountLike {
  /** Bedrag; inclusief btw tenzij `priceIncludesVat` expliciet false is. */
  amount: number | string | null | undefined;
  vatRate?: number | string | null;
  /** Databasedefault is `true`; alleen een expliciete `false` betekent "al ex btw". */
  priceIncludesVat?: boolean | null;
}

/**
 * Bedrag van een logiesregel, teruggerekend naar EX btw.
 *
 * Elke regel heeft een eigen tarief: F&B staat doorgaans op 21 % terwijl de
 * kamerprijs op 9 % staat. Bij € 2.000 aan F&B scheelde terugrekenen tegen het
 * kamertarief € 182 grondslag en € 18 commissie.
 */
export function amountExclVat(input: LodgingAmountLike): number {
  const amount = Number(input.amount) || 0;
  if (input.priceIncludesVat === false) return amount;
  const rate = input.vatRate == null
    ? DEFAULT_LODGING_VAT_RATE
    : Number(input.vatRate) || 0;
  return amount / (1 + rate / 100);
}

export interface LodgingExtraInput extends LodgingAmountLike {
  label?: string | null;
  /** Percentage dat bij déze extra hoort; leeg → het extra's-tarief van de partner. */
  commissionPercentage?: number | string | null;
}

export interface LodgingCommissionInput {
  /** De kamerprijs van de offerte (na toepassing van de inkoopfactuur: de kamerregels). */
  room: LodgingAmountLike & { label?: string | null };
  extras?: LodgingExtraInput[];
  /** Percentage over de kamerprijs. */
  lodgingRate: number;
  /** Percentage over extra's zonder eigen percentage. */
  extrasRate: number;
}

export interface LodgingCommissionComponent {
  kind: "room" | "extra";
  label: string;
  baseExclVat: number;
  commissionPct: number;
  commissionAmount: number;
}

export interface LodgingCommissionResult {
  components: LodgingCommissionComponent[];
  /** Totale grondslag ex btw. */
  baseExclVat: number;
  /** Totale commissie, som van de per component afgeronde bedragen. */
  commissionAmount: number;
  /**
   * Het percentage dat de totale commissie oplevert over de totale grondslag.
   * Alleen om te tonen; reken er niet mee — gebruik `commissionAmount`.
   */
  effectivePct: number;
  /** True als niet alle componenten hetzelfde percentage hebben. */
  hasMixedRates: boolean;
}

/**
 * Berekent de commissie over een logies-offerte, per component.
 *
 * Elk component wordt apart naar ex btw teruggerekend en tegen zijn eigen
 * percentage berekend; de bedragen worden per component op centen afgerond zodat
 * de som gelijk is aan wat er regel voor regel op de commissiefactuur komt.
 */
export function calculateLodgingCommission(
  input: LodgingCommissionInput,
): LodgingCommissionResult {
  const lodgingRate = Number(input.lodgingRate) || 0;
  const extrasRate = Number(input.extrasRate) || 0;

  const components: LodgingCommissionComponent[] = [];

  const roomBase = round2(amountExclVat(input.room));
  if (roomBase !== 0) {
    components.push({
      kind: "room",
      label: input.room.label || "Logies",
      baseExclVat: roomBase,
      commissionPct: lodgingRate,
      commissionAmount: round2((roomBase * lodgingRate) / 100),
    });
  }

  for (const extra of input.extras ?? []) {
    const base = round2(amountExclVat(extra));
    if (base === 0) continue;
    const pct = extra.commissionPercentage == null
      ? extrasRate
      : Number(extra.commissionPercentage) || 0;
    components.push({
      kind: "extra",
      label: extra.label || "Extra",
      baseExclVat: base,
      commissionPct: pct,
      commissionAmount: round2((base * pct) / 100),
    });
  }

  const baseExclVat = round2(components.reduce((sum, c) => sum + c.baseExclVat, 0));
  const commissionAmount = round2(
    components.reduce((sum, c) => sum + c.commissionAmount, 0),
  );
  const distinctRates = new Set(components.map((c) => c.commissionPct));

  return {
    components,
    baseExclVat,
    commissionAmount,
    effectivePct: baseExclVat === 0 ? 0 : round2((commissionAmount / baseExclVat) * 100),
    hasMixedRates: distinctRates.size > 1,
  };
}
