/**
 * Regels van een bureaufactuur, bevroren bij registreren of versturen
 * (tabel `bureau_invoice_lines`; docs/plan-inkoopfacturen-doorbelasten.md §3.4).
 *
 * Een eindfactuur die het hele project dekt krijgt de regels van de
 * specificatie (`projectInvoiceSpec`): per onderdeel een regel, met de
 * klantregels als subregels (`item_group` + `sub`). Een deel-, slot- of
 * creditfactuur krijgt één samenvattende regel per btw-tarief (`summary`).
 * PDF en UBL komen daarna uit deze regels; de kolommen op `bureau_invoices`
 * blijven de bron voor de bedragen.
 */

import type { ProjectInvoiceSpec, SpecLine, SpecVatGroup } from "@/lib/projectInvoiceSpec";
import { shouldShowFullSpecification } from "@/lib/bureauInvoiceType";
import { invoiceTypeLabels, type InvoiceType } from "@/types/bureauInvoice";

export type StoredLineKind =
  | "item"
  | "item_group"
  | "sub"
  | "cost"
  | "lodging"
  | "lodging_extra"
  | "fee"
  | "revision"
  | "summary";

export interface StoredInvoiceLineInput {
  sort_order: number;
  kind: StoredLineKind;
  section: string;
  item_id: string | null;
  description: string;
  sub_description: string | null;
  quantity: number;
  quantity_label: string | null;
  unit_price_excl_vat: number;
  unit_suffix: string;
  vat_rate: number;
  amount_excl_vat: number;
  vat_amount: number;
  amount_incl_vat: number;
}

export type StoredInvoiceLine = StoredInvoiceLineInput & { id: string; invoice_id: string };

const round2 = (n: number) => Math.round(n * 100) / 100;
const round4 = (n: number) => Math.round(n * 10000) / 10000;

const kindForSpecLine = (line: SpecLine): StoredLineKind => {
  switch (line.kind) {
    case "program":
      return line.subLines && line.subLines.length > 0 ? "item_group" : "item";
    case "extra_cost":
      return line.subLines && line.subLines.length > 0 ? "item_group" : "cost";
    case "lodging":
      return "lodging";
    case "lodging_extra":
      return "lodging_extra";
    case "revision":
      return "revision";
    default:
      return "fee";
  }
};

/** Alle regels van de specificatie, in factuurvolgorde (secties). */
export function specToStoredLines(spec: ProjectInvoiceSpec): StoredInvoiceLineInput[] {
  const rows: StoredInvoiceLineInput[] = [];
  for (const section of spec.sections) {
    for (const line of section.lines) {
      const quantity = line.quantity > 0 ? line.quantity : 1;
      rows.push({
        sort_order: rows.length,
        kind: kindForSpecLine(line),
        section: section.label,
        item_id: line.itemId ?? null,
        description: line.description,
        sub_description: line.subDescription ?? null,
        quantity,
        quantity_label: line.quantityLabel || null,
        unit_price_excl_vat: round4(line.amountExclVat / quantity),
        unit_suffix: line.unitSuffix,
        vat_rate: line.vatRate,
        amount_excl_vat: round2(line.amountExclVat),
        vat_amount: round2(line.vatAmount),
        amount_incl_vat: round2(line.amountInclVat),
      });
      for (const sub of line.subLines ?? []) {
        rows.push({
          sort_order: rows.length,
          kind: "sub",
          section: section.label,
          item_id: line.itemId ?? null,
          description: sub.description,
          sub_description: null,
          quantity: sub.quantity > 0 ? sub.quantity : 1,
          quantity_label: null,
          unit_price_excl_vat: round4(sub.unitPriceExclVat),
          unit_suffix: "",
          vat_rate: sub.vatRate,
          amount_excl_vat: round2(sub.amountExclVat),
          vat_amount: round2(sub.vatAmount),
          amount_incl_vat: round2(sub.amountInclVat),
        });
      }
    }
  }
  return rows;
}

export interface SummaryLineArgs {
  invoiceType: InvoiceType;
  invoiceNumber: string;
  /** Tekst onder de regel, bv. de eerder gefactureerde termijnen. */
  subDescription?: string | null;
  vatGroups: SpecVatGroup[];
}

/** Eén samenvattende regel per btw-tarief voor een deel-, slot- of creditfactuur. */
export function summaryStoredLines({ invoiceType, invoiceNumber, subDescription, vatGroups }: SummaryLineArgs): StoredInvoiceLineInput[] {
  const label = invoiceTypeLabels[invoiceType] ?? invoiceType;
  const groups = vatGroups.filter((g) => Math.abs(g.inclVat) > 0.005 || Math.abs(g.exclVat) > 0.005);
  return groups.map((g, idx) => ({
    sort_order: idx,
    kind: "summary" as const,
    section: label,
    item_id: null,
    description: groups.length > 1 ? `${label} ${invoiceNumber} — btw ${g.rate}%` : `${label} ${invoiceNumber}`,
    sub_description: subDescription ?? null,
    quantity: 1,
    quantity_label: "1",
    unit_price_excl_vat: round4(Math.abs(g.exclVat)),
    unit_suffix: "",
    vat_rate: g.rate,
    amount_excl_vat: round2(Math.abs(g.exclVat)),
    vat_amount: round2(Math.abs(g.vatAmount)),
    amount_incl_vat: round2(Math.abs(g.inclVat)),
  }));
}

export interface ChooseStoredLinesArgs {
  spec: ProjectInvoiceSpec | null | undefined;
  invoiceType: InvoiceType;
  invoiceNumber: string;
  amountInclVat: number;
  /** Eerder geregistreerd op dit project (netto), zonder deze factuur. */
  alreadyInvoicedInclVat: number;
  /** Btw-groepen van déze factuur (pro rata bij een deelbedrag). */
  vatGroups: SpecVatGroup[];
  subDescription?: string | null;
}

/**
 * Welke regels bij deze factuur horen: de volledige specificatie als de
 * factuur het hele project dekt, anders de samenvatting per btw-tarief.
 */
export function chooseStoredLines(args: ChooseStoredLinesArgs): StoredInvoiceLineInput[] {
  const { spec } = args;
  const full =
    spec != null &&
    shouldShowFullSpecification({
      resolvedType: args.invoiceType,
      alreadyInvoicedInclVat: args.alreadyInvoicedInclVat,
      invoiceAmountInclVat: args.amountInclVat,
      projectTotalInclVat: spec.totals.inclVat,
    });
  if (full && spec) return specToStoredLines(spec);
  return summaryStoredLines({
    invoiceType: args.invoiceType,
    invoiceNumber: args.invoiceNumber,
    subDescription: args.subDescription,
    vatGroups: args.vatGroups,
  });
}

/** Regels die meetellen in totalen en UBL: subregels dragen de btw, hun groep niet nog eens. */
export const countableStoredLines = <T extends { kind: string }>(rows: T[]): T[] =>
  rows.filter((r) => r.kind !== "item_group");

/** Btw-groepen en totalen uit opgeslagen regels. */
export function totalsFromStoredLines(rows: Array<Pick<StoredInvoiceLineInput, "kind" | "vat_rate" | "amount_excl_vat" | "vat_amount" | "amount_incl_vat">>) {
  const map = new Map<number, { exclVat: number; vatAmount: number; inclVat: number }>();
  for (const r of countableStoredLines(rows)) {
    const key = Number(r.vat_rate) || 0;
    const cur = map.get(key) ?? { exclVat: 0, vatAmount: 0, inclVat: 0 };
    cur.exclVat += Number(r.amount_excl_vat) || 0;
    cur.vatAmount += Number(r.vat_amount) || 0;
    cur.inclVat += Number(r.amount_incl_vat) || 0;
    map.set(key, cur);
  }
  const vatGroups: SpecVatGroup[] = [...map.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([rate, g]) => ({ rate, exclVat: round2(g.exclVat), vatAmount: round2(g.vatAmount), inclVat: round2(g.inclVat) }));
  return {
    vatGroups,
    exclVat: round2(vatGroups.reduce((s, g) => s + g.exclVat, 0)),
    vat: round2(vatGroups.reduce((s, g) => s + g.vatAmount, 0)),
    inclVat: round2(vatGroups.reduce((s, g) => s + g.inclVat, 0)),
  };
}
