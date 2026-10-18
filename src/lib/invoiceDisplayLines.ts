/**
 * Factuurregels voor scherm en PDF, uit de specificatie of uit opgeslagen
 * regels, in de vorm die `renderInvoicePdf` verwacht (`InvoiceCategory`).
 */

import type { InvoiceCategory, InvoiceLineRow } from "@/lib/invoicePdfRenderer";
import type { ProjectInvoiceSpec } from "@/lib/projectInvoiceSpec";
import type { StoredInvoiceLineInput } from "@/lib/bureauInvoiceLines";

export const formatInvoiceAmount = (n: number) =>
  new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(n);

/** Secties en regels van de specificatie (nieuwe factuur met regels). */
export function specToCategories(spec: ProjectInvoiceSpec, fmt = formatInvoiceAmount): InvoiceCategory[] {
  return spec.sections.map((section) => ({
    label: section.label,
    rows: section.lines.flatMap((line): InvoiceLineRow[] => {
      if (line.subLines && line.subLines.length > 0) {
        return [
          {
            description: line.description,
            subDescription: line.subDescription,
            qty: "",
            unitPrice: "",
            amount: fmt(line.amountInclVat),
            bold: true,
          },
          ...line.subLines.map((sub) => ({
            description: sub.description || "Regel",
            qty: String(sub.quantity),
            unitPrice: fmt(sub.unitPriceExclVat),
            unitPriceSuffix: `${sub.vatRate}%`,
            amount: fmt(sub.amountInclVat),
            isSubRow: true,
          })),
        ];
      }
      return [
        {
          description: line.description,
          subDescription: line.subDescription,
          qty: line.quantityLabel,
          unitPrice: fmt(line.unitPriceInclVat),
          unitPriceSuffix: line.unitSuffix || undefined,
          amount: fmt(line.amountInclVat),
        },
      ];
    }),
  }));
}

/** Opgeslagen regels van een geregistreerde factuur; creditnota's met teken −1. */
export function storedLinesToCategories(
  rows: StoredInvoiceLineInput[],
  fmt = formatInvoiceAmount,
  sign = 1,
): InvoiceCategory[] {
  const sections = new Map<string, InvoiceLineRow[]>();
  for (const row of [...rows].sort((a, b) => a.sort_order - b.sort_order)) {
    const list = sections.get(row.section) ?? [];
    if (row.kind === "item_group") {
      list.push({
        description: row.description,
        subDescription: row.sub_description ?? undefined,
        qty: "",
        unitPrice: "",
        amount: fmt(sign * row.amount_incl_vat),
        bold: true,
      });
    } else if (row.kind === "sub") {
      list.push({
        description: row.description || "Regel",
        qty: String(row.quantity),
        unitPrice: fmt(row.unit_price_excl_vat),
        unitPriceSuffix: `${row.vat_rate}%`,
        amount: fmt(sign * row.amount_incl_vat),
        isSubRow: true,
      });
    } else {
      const unitIncl = row.quantity > 0 ? row.amount_incl_vat / row.quantity : row.amount_incl_vat;
      list.push({
        description: row.description,
        subDescription: row.sub_description ?? undefined,
        qty: row.quantity_label ?? String(row.quantity),
        unitPrice: fmt(sign * unitIncl),
        unitPriceSuffix: row.unit_suffix || undefined,
        amount: fmt(sign * row.amount_incl_vat),
      });
    }
    sections.set(row.section, list);
  }
  return [...sections.entries()].map(([label, list]) => ({ label, rows: list }));
}

/** Eén samenvattende regel (slotfactuur, of oude factuur zonder regels). */
export function summaryCategory(
  args: { label: string; description: string; subDescription?: string | null; amountInclVat: number },
  fmt = formatInvoiceAmount,
): InvoiceCategory {
  return {
    label: args.label,
    rows: [
      {
        description: args.description,
        subDescription: args.subDescription ?? undefined,
        qty: "1",
        unitPrice: fmt(args.amountInclVat),
        amount: fmt(args.amountInclVat),
      },
    ],
  };
}
