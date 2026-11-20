import { describe, it, expect } from "vitest";
import type { ProformaLine } from "@/lib/proforma";
import { isEmptyLegacyPlan, planLegacyConversion, type LegacyBillingLine } from "@/lib/proformaLegacy";

const line = (over: Partial<ProformaLine> & { id: string }): ProformaLine => ({
  proforma_id: "pf",
  sort_order: 0,
  kind: "item",
  section: "Excursies",
  item_id: null,
  description: "Regel",
  sub_description: null,
  quantity: 1,
  quantity_label: "1",
  unit_price_excl_vat: 0,
  unit_suffix: "",
  vat_rate: 9,
  amount_excl_vat: 0,
  vat_amount: 0,
  amount_incl_vat: 0,
  origin: "quote_item",
  line_status: "active",
  line_key: null,
  replaces_line_id: null,
  hidden_reason: null,
  purchase_invoice_line_id: null,
  purchase_invoice_id: null,
  accommodation_quote_id: null,
  fee_key: null,
  quote_amount_incl_vat: null,
  accepted_amount_incl_vat: null,
  created_at: "2026-11-20T10:00:00Z",
  updated_at: "2026-11-20T10:00:00Z",
  ...over,
});

const bl = (over: Partial<LegacyBillingLine> & { id: string; item_id: string }): LegacyBillingLine => ({
  description: "Factuurregel",
  quantity: 1,
  unit_price_excl_vat: 100,
  vat_rate: 9,
  amount_excl_vat: 100,
  vat_amount: 9,
  amount_incl_vat: 109,
  sort_order: 0,
  source: "manual",
  ...over,
});

const proforma = [
  line({ id: "q-a", item_id: "it-a", line_key: "item:it-a", description: "Rondleiding" }),
  line({ id: "q-b", item_id: "it-b", line_key: "item:it-b", description: "Lunch", section: "Catering" }),
  line({ id: "q-hidden", item_id: "it-h", line_key: "item:it-h", line_status: "hidden" }),
];
const purchaseLines = [
  { id: "pl-1", request_id: "req", invoice_id: "inv-1" },
  { id: "pl-2", request_id: "req", invoice_id: "inv-1" },
  { id: "pl-other", request_id: "other", invoice_id: "inv-2" },
  { id: "pl-gast", request_id: "req", invoice_id: "inv-3", billed_to: "customer" },
];

describe("planLegacyConversion", () => {
  it("maakt van klantregels uit inkoop een vervanging per offerteregel", () => {
    const plan = planLegacyConversion({
      requestId: "req",
      proformaLines: proforma,
      billingLines: [
        bl({ id: "b1", item_id: "it-a", source: "purchase_invoice", purchase_invoice_line_id: "pl-1", sort_order: 0 }),
        bl({ id: "b2", item_id: "it-a", source: "purchase_invoice", purchase_invoice_line_id: "pl-2", sort_order: 1 }),
      ],
      purchaseLines,
    });
    expect(plan.changes).toEqual([{ action: "replace", line_id: "q-a", purchase_line_ids: ["pl-1", "pl-2"] }]);
    expect(plan.manualInserts).toHaveLength(0);
    expect(plan.markReplaced).toEqual([]);
    expect(plan.convertedBillingLineIds).toEqual(["b1", "b2"]);
    expect(plan.skipped).toEqual([]);
  });

  it("maakt van een handmatige klantregel een handmatige proformaregel die de offerteregel vervangt", () => {
    const plan = planLegacyConversion({
      requestId: "req",
      proformaLines: proforma,
      billingLines: [bl({ id: "b1", item_id: "it-b", description: "Lunch werkelijk", quantity: 20, unit_price_excl_vat: 10, amount_excl_vat: 200, vat_amount: 18, amount_incl_vat: 218 })],
      purchaseLines,
    });
    expect(plan.changes).toEqual([]);
    expect(plan.manualInserts).toHaveLength(1);
    const ins = plan.manualInserts[0];
    expect(ins.replacesLineId).toBe("q-b");
    expect(ins.line.section).toBe("Catering");
    expect(ins.line.origin).toBe("manual");
    expect(ins.line.quantity_label).toBe("20");
    expect(ins.line.amount_incl_vat).toBe(218);
    expect(plan.markReplaced).toEqual(["q-b"]);
    expect(plan.convertedBillingLineIds).toEqual(["b1"]);
  });

  it("zet een offerteregel met inkoop én handmatig niet dubbel op replaced", () => {
    const plan = planLegacyConversion({
      requestId: "req",
      proformaLines: proforma,
      billingLines: [
        bl({ id: "b1", item_id: "it-a", source: "purchase_invoice", purchase_invoice_line_id: "pl-1" }),
        bl({ id: "b2", item_id: "it-a", sort_order: 1 }),
      ],
      purchaseLines,
    });
    expect(plan.changes).toHaveLength(1);
    expect(plan.manualInserts).toHaveLength(1);
    expect(plan.markReplaced).toEqual([]);
  });

  it("slaat klantregels over die niet mee kunnen, met reden", () => {
    const plan = planLegacyConversion({
      requestId: "req",
      proformaLines: proforma,
      billingLines: [
        bl({ id: "no-item", item_id: "it-x" }),
        bl({ id: "hidden", item_id: "it-h" }),
        bl({ id: "gone", item_id: "it-a", source: "purchase_invoice", purchase_invoice_line_id: "pl-missing" }),
        bl({ id: "other", item_id: "it-a", source: "purchase_invoice", purchase_invoice_line_id: "pl-other" }),
        bl({ id: "gast", item_id: "it-a", source: "purchase_invoice", purchase_invoice_line_id: "pl-gast" }),
      ],
      purchaseLines,
    });
    expect(plan.skipped.map((s) => s.billingLineId)).toEqual(["no-item", "hidden", "gone", "other", "gast"]);
    expect(plan.skipped.map((s) => s.reason)).toEqual([
      "onderdeel staat niet op de proforma",
      "onderdeel staat niet op de proforma",
      "inkoopregel bestaat niet meer",
      "inkoopregel hoort bij een ander project",
      "factuur door de gast betaald",
    ]);
    expect(isEmptyLegacyPlan(plan)).toBe(true);
  });

  it("laat een klantregel weg waarvan de inkoopregel al op de proforma staat", () => {
    const plan = planLegacyConversion({
      requestId: "req",
      proformaLines: [...proforma, line({ id: "p-1", origin: "purchase_line", purchase_invoice_line_id: "pl-1", replaces_line_id: "q-a", item_id: "it-a" })],
      billingLines: [bl({ id: "b1", item_id: "it-a", source: "purchase_invoice", purchase_invoice_line_id: "pl-1" })],
      purchaseLines,
    });
    expect(plan.changes).toEqual([]);
    expect(plan.convertedBillingLineIds).toEqual(["b1"]);
  });
});
