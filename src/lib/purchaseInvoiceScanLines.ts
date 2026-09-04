/**
 * Van scanresultaat naar factuurregels.
 *
 * De scanner leest drie dingen uit: de kop (totaal ex btw, btw, totaal incl), het
 * btw-overzicht per tarief dat onderaan vrijwel elke factuur staat, en de losse
 * regels. Van die drie is het btw-overzicht het betrouwbaarst: dat staat er
 * letterlijk, terwijl het tarief per regel vaak niet op de factuur genoemd wordt
 * en de scanner het dan invult op basis van de omschrijving.
 *
 * Dat gokken ging mis op een Doeksen-factuur: koffie, plates en "diverse
 * drankjes" kregen 9/9/21 %, terwijl het btw-overzicht (laag € 35,60, hoog
 * € 13,37) zegt dat er maar € 63,67 tegen het hoge tarief gaat. De regels werden
 * toch gevolgd, de kop werd eruit hérberekend, en het factuurtotaal kwam op
 * € 512,11 uit terwijl er € 508,15 op de factuur stond.
 *
 * Daarom: regels met een eigen tarief worden alleen gebruikt als ze kloppen met
 * wat de kop en het btw-overzicht zeggen. Doen ze dat niet, dan is het
 * btw-overzicht leidend.
 */

export interface ScanLineItem {
  description: string;
  quantity: number | null;
  unit_price: number | null;
  total_excl_vat: number | null;
  vat_rate?: number | null;
}

export interface ScanVatBreakdownEntry {
  vat_rate: number;
  amount_excl: number;
  vat_amount: number;
}

export interface ScanResultLike {
  amount_excl_vat: number | null;
  vat_rate: number | null;
  vat_amount: number | null;
  amount_incl_vat: number | null;
  line_items: ScanLineItem[];
  vat_breakdown?: ScanVatBreakdownEntry[];
}

export interface ScanLineRow {
  description: string;
  quantity: string;
  unit_price: string;
  vat_rate: string;
  /** Exacte btw van de PDF, zodat we niet herrekenen. */
  vat_amount_override?: string;
  amount_incl_override?: string;
  unit_price_is_inclusive?: boolean;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Bedrag ex btw van één gescande regel. */
export function lineExclVat(item: ScanLineItem): number {
  if (item.unit_price != null && item.quantity) {
    return Number(item.unit_price) * Number(item.quantity);
  }
  if (item.total_excl_vat != null) return Number(item.total_excl_vat);
  if (item.unit_price != null) return Number(item.unit_price);
  return 0;
}

/**
 * Kloppen de regels met de kop van de factuur?
 *
 * We rekenen de regels door met hun eigen tarief en leggen het resultaat naast
 * wat de scanner als totaal ex btw en totaal btw uit de factuur haalde. Wijkt dat
 * af, dan zijn de tarieven per regel niet te vertrouwen.
 */
export function lineItemsReconcile(
  items: ScanLineItem[],
  result: Pick<ScanResultLike, "amount_excl_vat" | "vat_amount">,
): boolean {
  if (items.length === 0) return false;

  const headerExcl = result.amount_excl_vat == null ? null : Number(result.amount_excl_vat);
  const headerVat = result.vat_amount == null ? null : Number(result.vat_amount);
  // Zonder kop valt er niets tegen te spreken; dan zijn de regels wat we hebben.
  if (headerExcl == null && headerVat == null) return true;

  // Eén cent per regel speling, met een ondergrens en een plafond.
  const tolerance = Math.min(0.1, Math.max(0.02, 0.01 * items.length));

  const totalExcl = round2(items.reduce((sum, li) => sum + lineExclVat(li), 0));
  const totalVat = round2(
    items.reduce((sum, li) => sum + lineExclVat(li) * ((Number(li.vat_rate) || 0) / 100), 0),
  );

  if (headerExcl != null && Math.abs(totalExcl - headerExcl) > tolerance) return false;
  if (headerVat != null && Math.abs(totalVat - headerVat) > tolerance) return false;
  return true;
}

const rowsFromBreakdown = (breakdown: ScanVatBreakdownEntry[]): ScanLineRow[] =>
  breakdown
    .filter((b) => b.amount_excl > 0 || b.vat_amount > 0)
    .map((b) => ({
      description: `BTW ${b.vat_rate}%`,
      quantity: "1",
      unit_price: String(b.amount_excl),
      vat_rate: String(b.vat_rate),
      vat_amount_override: b.vat_amount != null ? String(b.vat_amount) : undefined,
      amount_incl_override:
        b.amount_excl != null && b.vat_amount != null
          ? String(round2(b.amount_excl + b.vat_amount))
          : undefined,
    }));

const rowsFromItems = (
  items: ScanLineItem[],
  result: ScanResultLike,
  spreadHeaderVat: boolean,
): ScanLineRow[] => {
  const headerVat = result.vat_amount != null ? Number(result.vat_amount) : null;
  const headerExcl = result.amount_excl_vat != null ? Number(result.amount_excl_vat) : null;
  const canSpread = spreadHeaderVat && headerVat != null && headerExcl != null && headerExcl > 0;

  return items.map((li, idx, arr) => {
    const excl = lineExclVat(li);
    let vatOverride: string | undefined;
    let inclOverride: string | undefined;

    if (canSpread) {
      // De laatste regel vangt het afrondingsrestje op, zodat de som exact de
      // btw van de factuur is.
      const share = idx === arr.length - 1
        ? round2(
          headerVat! -
            arr.slice(0, idx).reduce(
              (s, x) => s + round2(headerVat! * (lineExclVat(x) / headerExcl!)),
              0,
            ),
        )
        : round2(headerVat! * (excl / headerExcl!));
      vatOverride = String(share);
      inclOverride = String(round2(excl + share));
    }

    return {
      description: li.description || "",
      quantity: li.quantity != null ? String(li.quantity) : "1",
      unit_price: li.unit_price != null
        ? String(li.unit_price)
        : li.total_excl_vat != null && li.quantity
          ? String(li.total_excl_vat / li.quantity)
          : li.total_excl_vat != null
            ? String(li.total_excl_vat)
            : "",
      vat_rate: String(li.vat_rate ?? result.vat_rate ?? 21),
      vat_amount_override: vatOverride,
      amount_incl_override: inclOverride,
    };
  });
};

/**
 * Bouwt de voor te vullen factuurregels uit een scanresultaat.
 *
 * Volgorde:
 * 1. Regels met elk een eigen tarief — maar alleen als ze kloppen met de kop.
 * 2. Anders het btw-overzicht, één regel per tarief. Dat staat letterlijk op de
 *    factuur en is dus leidend zodra de regels het tegenspreken.
 * 3. Anders de regels zonder eigen tarief, met de btw van de kop verdeeld.
 */
export function buildLinesFromScan(result: ScanResultLike | null): ScanLineRow[] {
  if (!result) return [];

  const breakdown = result.vat_breakdown || [];
  const items = result.line_items || [];
  const itemsAllHaveRate = items.length > 0 && items.every((li) => li.vat_rate != null);

  if (itemsAllHaveRate && lineItemsReconcile(items, result)) {
    return rowsFromItems(items, result, false);
  }

  if (breakdown.length > 1) return rowsFromBreakdown(breakdown);

  // Eén tarief in het overzicht en regels die de kop tegenspreken: dan is dat ene
  // tarief nog altijd betrouwbaarder dan wat er per regel is ingevuld.
  if (breakdown.length === 1 && itemsAllHaveRate) return rowsFromBreakdown(breakdown);

  if (items.length > 0) return rowsFromItems(items, result, true);

  return [];
}
