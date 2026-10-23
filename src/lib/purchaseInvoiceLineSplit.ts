/**
 * Eén inkoopregel in delen knippen, elk deel op zijn eigen project.
 *
 * Partners als Jan van Vlieland factureren één verzamelregel ("Door u
 * geboekte reserveringen, arrangementen sept.") voor alle klanten van een
 * maand, plus één kortingsregel. Het werkblad Doorbelasten werkt per regel en
 * per project, dus zo'n regel moet eerst in delen uiteen: zoveel voor project
 * A, zoveel voor B, de rest voor C.
 *
 * De bedragen worden ingevoerd zoals ze in het scherm staan: inclusief btw.
 * Het laatste deel is het restant, zodat de delen samen altijd precies de
 * regel zijn — ook na afronding van de btw per deel. De btw-grondslag per deel
 * volgt uit het tarief van de regel; het restant draagt het afrondingsverschil.
 *
 * Dependency-vrij zodat dit in vitest laadt.
 */

export interface SplittableLine {
  description: string;
  amount_excl_vat: number;
  vat_rate: number;
  vat_amount: number;
  amount_incl_vat: number;
}

export interface SplitPartInput {
  /** Bedrag incl. btw; null voor het restant (alleen het laatste deel). */
  amount_incl_vat: number | null;
  request_id: string | null;
}

export interface SplitPart {
  description: string;
  quantity: 1;
  unit_price: number;
  amount_excl_vat: number;
  vat_rate: number;
  vat_amount: number;
  amount_incl_vat: number;
  request_id: string | null;
}

export type SplitResult =
  | { ok: true; parts: SplitPart[] }
  | { ok: false; error: string };

const round2 = (n: number) => Math.round(n * 100) / 100;

const partDescription = (description: string, index: number, count: number) =>
  `${description || "Regel"} (deel ${index + 1}/${count})`;

/**
 * Knipt een regel in delen. De ingevoerde bedragen zijn inclusief btw; het
 * laatste deel mag leeg zijn en wordt dan het restant. De som moet gelijk zijn
 * aan de regel, en elk deel moet dezelfde kant op wijzen als de regel (een
 * korting splitst in negatieve delen).
 */
export function splitLine(line: SplittableLine, inputs: SplitPartInput[]): SplitResult {
  if (inputs.length < 2) return { ok: false, error: "Een splitsing heeft minstens twee delen." };

  const lineIncl = round2(Number(line.amount_incl_vat) || 0);
  if (lineIncl === 0) return { ok: false, error: "Een regel van € 0,00 valt niet te splitsen." };
  const sign = Math.sign(lineIncl);

  const openIndexes = inputs.map((p, i) => (p.amount_incl_vat == null ? i : -1)).filter((i) => i >= 0);
  if (openIndexes.length > 1) return { ok: false, error: "Alleen het laatste deel mag leeg blijven als restant." };
  if (openIndexes.length === 1 && openIndexes[0] !== inputs.length - 1) {
    return { ok: false, error: "Alleen het laatste deel mag leeg blijven als restant." };
  }

  const fixed = inputs
    .map((p) => (p.amount_incl_vat == null ? null : round2(Number(p.amount_incl_vat))))
    .filter((n): n is number => n != null);
  if (fixed.some((n) => !Number.isFinite(n) || n === 0)) {
    return { ok: false, error: "Elk deel heeft een bedrag nodig." };
  }
  if (fixed.some((n) => Math.sign(n) !== sign)) {
    return {
      ok: false,
      error: sign < 0
        ? "Dit is een negatieve regel (korting); de delen moeten ook negatief zijn."
        : "De delen moeten positief zijn, net als de regel.",
    };
  }

  const fixedSum = round2(fixed.reduce((s, n) => s + n, 0));
  const inclAmounts = openIndexes.length === 1
    ? [...fixed, round2(lineIncl - fixedSum)]
    : fixed;

  const last = inclAmounts[inclAmounts.length - 1];
  if (openIndexes.length === 1 && (last === 0 || Math.sign(last) !== sign)) {
    return { ok: false, error: "De ingevulde delen zijn samen al de hele regel of meer; er blijft geen restant over." };
  }
  if (openIndexes.length === 0 && round2(inclAmounts.reduce((s, n) => s + n, 0)) !== lineIncl) {
    return { ok: false, error: "De delen tellen niet op tot het bedrag van de regel. Laat het laatste deel leeg voor het restant." };
  }

  const rate = Number(line.vat_rate) || 0;
  const factor = 1 + rate / 100;
  const lineExcl = round2(Number(line.amount_excl_vat) || 0);
  const lineVat = round2(Number(line.vat_amount) || 0);

  const parts: SplitPart[] = [];
  let exclSoFar = 0;
  let vatSoFar = 0;
  inclAmounts.forEach((incl, i) => {
    const isLast = i === inclAmounts.length - 1;
    // Het restant draagt het afrondingsverschil, zodat de delen samen exact de regel zijn.
    const excl = isLast ? round2(lineExcl - exclSoFar) : round2(incl / factor);
    const vat = isLast ? round2(lineVat - vatSoFar) : round2(incl - excl);
    exclSoFar = round2(exclSoFar + excl);
    vatSoFar = round2(vatSoFar + vat);
    parts.push({
      description: partDescription(line.description, i, inclAmounts.length),
      quantity: 1,
      unit_price: excl,
      amount_excl_vat: excl,
      vat_rate: rate,
      vat_amount: vat,
      amount_incl_vat: incl,
      request_id: inputs[i].request_id,
    });
  });

  return { ok: true, parts };
}

/**
 * Verdeelt een andere regel (meestal de korting) in dezelfde verhouding als
 * een al gesplitste regel, met dezelfde projecten. Het laatste deel is het
 * restant.
 */
export function splitLineProportionally(line: SplittableLine, model: SplitPart[]): SplitResult {
  const total = model.reduce((s, p) => s + p.amount_incl_vat, 0);
  if (model.length < 2 || total === 0) return { ok: false, error: "Geen verdeling om te volgen." };
  const lineIncl = round2(Number(line.amount_incl_vat) || 0);
  const inputs: SplitPartInput[] = model.map((p, i) => ({
    amount_incl_vat: i === model.length - 1 ? null : round2(lineIncl * (p.amount_incl_vat / total)),
    request_id: p.request_id,
  }));
  return splitLine(line, inputs);
}
