import { describe, it, expect } from "vitest";
import {
  buildLinesFromScan,
  lineItemsReconcile,
  type ScanResultLike,
} from "@/lib/purchaseInvoiceScanLines";

/**
 * De echte factuur waarop dit misging (Doeksen, 5 juni).
 *
 * Op de PDF staan drie regels die optellen tot het te betalen bedrag van
 * € 508,15 — dus inclusief btw — en een btw-overzicht van laag € 35,60 en hoog
 * € 13,37, samen € 48,97. Ex btw is dat € 459,18.
 *
 * De scanner las de kop goed uit maar gokte de tarieven per regel op 9/9/21 %.
 * Die regels leveren € 52,92 btw op in plaats van € 48,97, en daarmee een
 * factuurtotaal van € 512,11 — bijna vier euro te veel om aan de partner te betalen.
 */
const doeksen: ScanResultLike = {
  amount_excl_vat: 459.18,
  vat_rate: null,
  vat_amount: 48.97,
  amount_incl_vat: 508.15,
  line_items: [
    { description: "14 personen koffie, thee en appelgebak", quantity: 1, unit_price: 147.29, total_excl_vat: 147.29, vat_rate: 9 },
    { description: "14 diverse plates", quantity: 1, unit_price: 215.28, total_excl_vat: 215.28, vat_rate: 9 },
    { description: "Diverse drankjes", quantity: 1, unit_price: 96.61, total_excl_vat: 96.61, vat_rate: 21 },
  ],
  vat_breakdown: [
    { vat_rate: 9, amount_excl: 395.56, vat_amount: 35.6 },
    { vat_rate: 21, amount_excl: 63.67, vat_amount: 13.37 },
  ],
};

describe("kloppen de gescande regels met de kop?", () => {
  it("herkent dat de gegokte tarieven de btw van de factuur tegenspreken", () => {
    // De regels tellen op tot het juiste bedrag ex btw, maar leveren te veel btw op.
    const lineVat = 147.29 * 0.09 + 215.28 * 0.09 + 96.61 * 0.21;
    expect(lineVat).toBeCloseTo(52.92, 2);
    expect(doeksen.vat_amount).toBe(48.97);

    expect(lineItemsReconcile(doeksen.line_items, doeksen)).toBe(false);
  });

  it("accepteert regels die wél kloppen", () => {
    const clean: ScanResultLike = {
      amount_excl_vat: 1000,
      vat_rate: 21,
      vat_amount: 210,
      amount_incl_vat: 1210,
      line_items: [
        { description: "Zaalhuur", quantity: 1, unit_price: 700, total_excl_vat: 700, vat_rate: 21 },
        { description: "Techniek", quantity: 1, unit_price: 300, total_excl_vat: 300, vat_rate: 21 },
      ],
    };
    expect(lineItemsReconcile(clean.line_items, clean)).toBe(true);
  });

  it("laat centenafronding door", () => {
    const items = [
      { description: "a", quantity: 1, unit_price: 33.33, total_excl_vat: 33.33, vat_rate: 21 },
      { description: "b", quantity: 1, unit_price: 33.33, total_excl_vat: 33.33, vat_rate: 21 },
      { description: "c", quantity: 1, unit_price: 33.34, total_excl_vat: 33.34, vat_rate: 21 },
    ];
    expect(lineItemsReconcile(items, { amount_excl_vat: 100, vat_amount: 21, amount_incl_vat: 121 })).toBe(true);
  });

  it("zonder kop valt er niets tegen te spreken", () => {
    expect(
      lineItemsReconcile(
        [{ description: "a", quantity: 1, unit_price: 10, total_excl_vat: 10, vat_rate: 21 }],
        { amount_excl_vat: null, vat_amount: null, amount_incl_vat: null },
      ),
    ).toBe(true);
  });
});

describe("voor te vullen factuurregels", () => {
  it("gebruikt het btw-overzicht als de regels de kop tegenspreken", () => {
    const rows = buildLinesFromScan(doeksen);

    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ vat_rate: "9", unit_price: "395.56", vat_amount_override: "35.6" });
    expect(rows[1]).toMatchObject({ vat_rate: "21", unit_price: "63.67", vat_amount_override: "13.37" });

    // En daarmee komt het factuurtotaal weer bij de € 508,15 van de PDF in de buurt,
    // in plaats van de € 512,11 die eruit kwam toen de gegokte tarieven wonnen.
    const totalIncl = rows.reduce((s, r) => s + Number(r.amount_incl_override), 0);
    expect(totalIncl).toBeCloseTo(508.2, 2);
    expect(Math.abs(totalIncl - 512.11)).toBeGreaterThan(3);
  });

  it("houdt de gescande regels als ze wél kloppen", () => {
    const clean: ScanResultLike = {
      amount_excl_vat: 1000,
      vat_rate: 21,
      vat_amount: 210,
      amount_incl_vat: 1210,
      line_items: [
        { description: "Zaalhuur", quantity: 1, unit_price: 700, total_excl_vat: 700, vat_rate: 21 },
        { description: "Techniek", quantity: 1, unit_price: 300, total_excl_vat: 300, vat_rate: 21 },
      ],
      vat_breakdown: [{ vat_rate: 21, amount_excl: 1000, vat_amount: 210 }],
    };
    const rows = buildLinesFromScan(clean);
    expect(rows.map((r) => r.description)).toEqual(["Zaalhuur", "Techniek"]);
  });

  it("verdeelt de btw van de kop over regels zonder eigen tarief", () => {
    const rows = buildLinesFromScan({
      amount_excl_vat: 300,
      vat_rate: 9,
      vat_amount: 27,
      amount_incl_vat: 327,
      line_items: [
        { description: "a", quantity: 1, unit_price: 100, total_excl_vat: 100, vat_rate: null },
        { description: "b", quantity: 1, unit_price: 200, total_excl_vat: 200, vat_rate: null },
      ],
    });
    expect(rows.map((r) => r.vat_amount_override)).toEqual(["9", "18"]);
  });

  it("levert niets op zonder scanresultaat", () => {
    expect(buildLinesFromScan(null)).toEqual([]);
  });
});

describe("wat er op de factuur staat wint van wat de scanner erbij verzint", () => {
  it("valt door de mand op het totaal, ook als de scanner zijn btw uit dezelfde gok afleidde", () => {
    // Ergste geval: de scanner rekent zijn eigen btw-totaal uit de gegokte tarieven,
    // zodat kop en regels met elkaar meebewegen. Alleen het te betalen totaal — dat
    // groot op de factuur staat — verraadt dan nog dat er iets niet klopt.
    const zelfconsistent = {
      ...doeksen,
      vat_amount: 52.92,
      amount_excl_vat: 459.18,
      amount_incl_vat: 508.15,
    };
    expect(lineItemsReconcile(zelfconsistent.line_items, zelfconsistent)).toBe(false);
  });

  it("leidt de grondslag af uit het btw-bedrag als de opgegeven grondslag niet past", () => {
    const rows = buildLinesFromScan({
      ...doeksen,
      // Scanner geeft een grondslag die niet bij het btw-bedrag hoort.
      vat_breakdown: [
        { vat_rate: 9, amount_excl: 362.57, vat_amount: 35.6 },
        { vat_rate: 21, amount_excl: 96.61, vat_amount: 13.37 },
      ],
    });

    // 35,60 / 0,09 = 395,56 en 13,37 / 0,21 = 63,67 — het btw-bedrag is leidend.
    expect(rows[0].unit_price).toBe("395.56");
    expect(rows[1].unit_price).toBe("63.67");
  });

  it("geeft liever geen regels dan verkeerde als er niets is om op terug te vallen", () => {
    const rows = buildLinesFromScan({ ...doeksen, vat_breakdown: undefined });
    expect(rows).toEqual([]);
  });
});
