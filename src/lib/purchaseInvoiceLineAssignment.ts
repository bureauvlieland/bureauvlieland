/**
 * Toewijzing van gescande factuurregels aan programma-onderdelen.
 *
 * De scanner leest elke regel van een inkoopfactuur uit, mét het btw-tarief van
 * díe regel. Tot nu toe werd dat alleen bij logies gebruikt; bij activiteiten en
 * catering typte je de verdeling met de hand over, los van wat er gescand was.
 *
 * Huisregel van het bureau: alles wat geen toeristenbelasting is, hoort bij een
 * programma-onderdeel en wordt aan de klant doorbelast. Toeristenbelasting regelt
 * het bureau zelf en telt dus niet mee — niet in de doorbelasting en niet in de
 * commissiegrondslag.
 *
 * Deze module rekent alleen; het scherm eromheen kiest de bestemmingen.
 */

export const round2 = (value: number): number => Math.round(value * 100) / 100;

/** Waar een factuurregel heen gaat. */
export type LineTargetKind = "item" | "tourist_tax" | "unassigned";

export interface LineTarget {
  kind: LineTargetKind;
  /** Alleen bij kind "item": het programma-onderdeel. */
  itemId?: string | null;
}

/** Een gescande factuurregel, al doorgerekend naar bedragen. */
export interface AssignableLine {
  description: string;
  amountExclVat: number;
  vatRate: number;
  amountInclVat: number;
}

export interface AssignmentSummary {
  /** Totaal ex btw van alle regels. */
  totalExclVat: number;
  /** Ex btw dat aan onderdelen is toegewezen — dit wordt de commissiegrondslag. */
  assignedExclVat: number;
  /** Ex btw dat als toeristenbelasting buiten de doorbelasting blijft. */
  touristTaxExclVat: number;
  /**
   * Inclusief btw van diezelfde toeristenbelasting. Dit bedrag hoort wél in het
   * factuurtotaal dat we de partner betalen, maar niet in de verdeling over de
   * onderdelen — anders zou de factuur te laag geregistreerd worden.
   */
  touristTaxInclVat: number;
  /** Ex btw dat nog nergens heen gaat. */
  unassignedExclVat: number;
  /** Aantal regels dat nog een bestemming moet krijgen. */
  unassignedCount: number;
  /** True als elke regel een bestemming heeft. */
  isComplete: boolean;
}

/** Eén verdeelregel: per onderdeel en per btw-tarief één rij. */
export interface AllocationDraft {
  item_id: string;
  amount_excl_vat: number;
  vat_rate: number;
  vat_amount: number;
  amount_incl_vat: number;
  /** Omschrijvingen van de regels die hierin zijn samengenomen. */
  notes: string;
}

const targetFor = (targets: LineTarget[], index: number): LineTarget =>
  targets[index] ?? { kind: "unassigned" };

/** Telt op wat er waar naartoe gaat, zodat het scherm een restbedrag kan tonen. */
export function summarizeLineAssignments(
  lines: AssignableLine[],
  targets: LineTarget[],
): AssignmentSummary {
  let assigned = 0;
  let touristTax = 0;
  let touristTaxIncl = 0;
  let unassigned = 0;
  let unassignedCount = 0;

  lines.forEach((line, index) => {
    const target = targetFor(targets, index);
    const amount = Number(line.amountExclVat) || 0;
    if (target.kind === "item" && target.itemId) {
      assigned += amount;
    } else if (target.kind === "tourist_tax") {
      touristTax += amount;
      touristTaxIncl += Number(line.amountInclVat) || 0;
    } else {
      unassigned += amount;
      unassignedCount += 1;
    }
  });

  return {
    totalExclVat: round2(assigned + touristTax + unassigned),
    assignedExclVat: round2(assigned),
    touristTaxExclVat: round2(touristTax),
    touristTaxInclVat: round2(touristTaxIncl),
    unassignedExclVat: round2(unassigned),
    unassignedCount,
    isComplete: unassignedCount === 0 && lines.length > 0,
  };
}

/**
 * Zet de toewijzingen om in verdeelregels.
 *
 * Regels met hetzelfde onderdeel én hetzelfde btw-tarief worden samengenomen —
 * een cateringfactuur met vier gerechten op 9 % levert dus één regel van 9 % op,
 * en een aparte regel voor de drank op 21 %. Toeristenbelasting en niet
 * toegewezen regels vallen weg.
 */
export function allocationsFromLineAssignments(
  lines: AssignableLine[],
  targets: LineTarget[],
): AllocationDraft[] {
  const grouped = new Map<string, { itemId: string; vatRate: number; excl: number; notes: string[] }>();

  lines.forEach((line, index) => {
    const target = targetFor(targets, index);
    if (target.kind !== "item" || !target.itemId) return;
    const vatRate = Number(line.vatRate) || 0;
    const key = `${target.itemId}::${vatRate}`;
    const entry = grouped.get(key)
      ?? { itemId: target.itemId, vatRate, excl: 0, notes: [] };
    entry.excl += Number(line.amountExclVat) || 0;
    if (line.description) entry.notes.push(line.description);
    grouped.set(key, entry);
  });

  return [...grouped.values()].map((entry) => {
    const excl = round2(entry.excl);
    const vat = round2(excl * (entry.vatRate / 100));
    return {
      item_id: entry.itemId,
      amount_excl_vat: excl,
      vat_rate: entry.vatRate,
      vat_amount: vat,
      amount_incl_vat: round2(excl + vat),
      notes: entry.notes.join(", "),
    };
  });
}
