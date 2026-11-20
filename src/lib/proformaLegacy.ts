/**
 * Fase 4 van docs/plan-proforma-factuur.md: klantregels van het oude
 * werkblad (`program_item_billing_lines`) overzetten naar de proforma.
 *
 * Een klantregel uit een inkoopregel wordt "vervang de offerteregel van dat
 * onderdeel door die inkoopregel" (`apply_proforma_changes`, dus met de
 * commissieverdeling erbij). Een handmatige klantregel wordt een handmatige
 * proformaregel die de offerteregel vervangt. Klantregels van een onderdeel
 * dat niet op de proforma staat (geannuleerd, zonder prijs, buiten de
 * factuur) kunnen niet mee en worden gemeld. Deze module plant alleen;
 * `convertLegacyChargesToProforma` in `useProforma` voert uit.
 */

import type { ProformaLine, ProformaLineInput } from "@/lib/proforma";
import type { ProformaChange } from "@/lib/proformaWorksheet";

export interface LegacyBillingLine {
  id: string;
  item_id: string;
  description: string;
  quantity: number;
  unit_price_excl_vat: number;
  vat_rate: number;
  amount_excl_vat: number;
  vat_amount: number;
  amount_incl_vat: number;
  sort_order: number;
  source?: string | null;
  purchase_invoice_line_id?: string | null;
  purchase_invoice_id?: string | null;
}

export interface LegacyPurchaseLine {
  id: string;
  request_id: string | null;
  invoice_id: string;
  billed_to?: string | null;
}

export interface ManualInsert {
  replacesLineId: string;
  itemId: string;
  line: Omit<ProformaLineInput, "sort_order">;
}

export interface LegacyConversionPlan {
  /** Vervangingen door inkoopregels, gebundeld per offerteregel. */
  changes: ProformaChange[];
  /** Handmatige klantregels als handmatige proformaregels. */
  manualInserts: ManualInsert[];
  /** Offerteregels die door handmatige regels vervangen worden (zonder inkoopregel erbij). */
  markReplaced: string[];
  /** Klantregels die mee zijn en daarna weg kunnen. */
  convertedBillingLineIds: string[];
  /** Klantregels die niet mee konden, met reden. */
  skipped: Array<{ billingLineId: string; reason: string }>;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export function planLegacyConversion(args: {
  requestId: string;
  proformaLines: ProformaLine[];
  billingLines: LegacyBillingLine[];
  purchaseLines: LegacyPurchaseLine[];
}): LegacyConversionPlan {
  const { requestId, proformaLines, billingLines, purchaseLines } = args;
  const quoteLineByItem = new Map<string, ProformaLine>();
  for (const line of proformaLines) {
    if (line.origin === "quote_item" && line.item_id && line.kind !== "sub" && line.line_status !== "hidden") {
      if (!quoteLineByItem.has(line.item_id)) quoteLineByItem.set(line.item_id, line);
    }
  }
  const onProforma = new Set(proformaLines.map((l) => l.purchase_invoice_line_id).filter(Boolean));
  const purchaseById = new Map(purchaseLines.map((p) => [p.id, p]));

  const replaceByLine = new Map<string, string[]>();
  const manualInserts: ManualInsert[] = [];
  const markReplaced = new Set<string>();
  const converted: string[] = [];
  const skipped: LegacyConversionPlan["skipped"] = [];

  for (const bl of [...billingLines].sort((a, b) => a.sort_order - b.sort_order)) {
    const quoteLine = quoteLineByItem.get(bl.item_id);
    if (!quoteLine) {
      skipped.push({ billingLineId: bl.id, reason: "onderdeel staat niet op de proforma" });
      continue;
    }
    const purchaseLineId = bl.source === "purchase_invoice" ? bl.purchase_invoice_line_id ?? null : null;
    if (purchaseLineId) {
      const pl = purchaseById.get(purchaseLineId);
      if (!pl) {
        skipped.push({ billingLineId: bl.id, reason: "inkoopregel bestaat niet meer" });
        continue;
      }
      if (pl.request_id !== requestId) {
        skipped.push({ billingLineId: bl.id, reason: "inkoopregel hoort bij een ander project" });
        continue;
      }
      if (pl.billed_to === "customer") {
        skipped.push({ billingLineId: bl.id, reason: "factuur door de gast betaald" });
        continue;
      }
      if (onProforma.has(purchaseLineId) || (replaceByLine.get(quoteLine.id) ?? []).includes(purchaseLineId)) {
        // Al op de proforma: de klantregel is dubbel en kan gewoon weg.
        converted.push(bl.id);
        continue;
      }
      const arr = replaceByLine.get(quoteLine.id) ?? [];
      arr.push(purchaseLineId);
      replaceByLine.set(quoteLine.id, arr);
      converted.push(bl.id);
      continue;
    }

    const quantity = Number(bl.quantity) || 1;
    manualInserts.push({
      replacesLineId: quoteLine.id,
      itemId: bl.item_id,
      line: {
        kind: "item",
        section: quoteLine.section,
        item_id: bl.item_id,
        description: bl.description || "Regel",
        sub_description: null,
        quantity,
        quantity_label: quantity === 1 ? "1" : String(quantity),
        unit_price_excl_vat: Number(bl.unit_price_excl_vat) || 0,
        unit_suffix: "",
        vat_rate: Number(bl.vat_rate) || 0,
        amount_excl_vat: round2(Number(bl.amount_excl_vat) || 0),
        vat_amount: round2(Number(bl.vat_amount) || 0),
        amount_incl_vat: round2(Number(bl.amount_incl_vat) || 0),
        origin: "manual",
        line_status: "active",
        line_key: null,
        replaces_line_id: quoteLine.id,
        hidden_reason: null,
        purchase_invoice_line_id: null,
        purchase_invoice_id: null,
        accommodation_quote_id: null,
        fee_key: null,
        quote_amount_incl_vat: null,
        accepted_amount_incl_vat: null,
      },
    });
    markReplaced.add(quoteLine.id);
    converted.push(bl.id);
  }

  const changes: ProformaChange[] = [];
  for (const [lineId, ids] of replaceByLine) changes.push({ action: "replace", line_id: lineId, purchase_line_ids: ids });
  // Een offerteregel die ook door inkoopregels vervangen wordt, zet de
  // databasefunctie al op "replaced"; alleen de rest hoeft apart.
  const onlyManual = [...markReplaced].filter((id) => !replaceByLine.has(id));

  return { changes, manualInserts, markReplaced: onlyManual, convertedBillingLineIds: converted, skipped };
}

export const isEmptyLegacyPlan = (plan: LegacyConversionPlan): boolean =>
  plan.changes.length === 0 && plan.manualInserts.length === 0 && plan.convertedBillingLineIds.length === 0;
