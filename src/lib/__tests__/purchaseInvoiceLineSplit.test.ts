import { describe, expect, it } from "vitest";
import { splitLine, splitLineProportionally } from "@/lib/purchaseInvoiceLineSplit";

/** Factuur 2026151 van Fietsverhuur Jan van Vlieland: één regel voor alle arrangementen van september. */
const arrangementen = {
  description: "Door u geboekte reserveringen (arrangementen sept. 26)",
  amount_excl_vat: 3641.28,
  vat_rate: 9,
  vat_amount: 327.72,
  amount_incl_vat: 3969,
};

const korting = {
  description: "Korting 25%",
  amount_excl_vat: -910.32,
  vat_rate: 9,
  vat_amount: -81.93,
  amount_incl_vat: -992.25,
};

const sum = (parts: { amount_incl_vat: number; amount_excl_vat: number; vat_amount: number }[]) => ({
  incl: Math.round(parts.reduce((s, p) => s + p.amount_incl_vat, 0) * 100) / 100,
  excl: Math.round(parts.reduce((s, p) => s + p.amount_excl_vat, 0) * 100) / 100,
  vat: Math.round(parts.reduce((s, p) => s + p.vat_amount, 0) * 100) / 100,
});

describe("splitLine", () => {
  it("knipt een regel in delen die samen precies de regel zijn", () => {
    const r = splitLine(arrangementen, [
      { amount_incl_vat: 1500, request_id: "p-a" },
      { amount_incl_vat: 1200.5, request_id: "p-b" },
      { amount_incl_vat: null, request_id: "p-c" },
    ]);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.parts.map((p) => p.amount_incl_vat)).toEqual([1500, 1200.5, 1268.5]);
    expect(r.parts.map((p) => p.request_id)).toEqual(["p-a", "p-b", "p-c"]);
    expect(sum(r.parts)).toEqual({ incl: 3969, excl: 3641.28, vat: 327.72 });
    // Per deel klopt de btw bij het tarief; het restant draagt de afronding.
    expect(r.parts[0]).toMatchObject({ amount_excl_vat: 1376.15, vat_amount: 123.85, vat_rate: 9, unit_price: 1376.15, quantity: 1 });
    expect(r.parts[0].description).toBe("Door u geboekte reserveringen (arrangementen sept. 26) (deel 1/3)");
  });

  it("accepteert ook alle delen ingevuld, als ze precies optellen", () => {
    const r = splitLine(arrangementen, [
      { amount_incl_vat: 2000, request_id: "p-a" },
      { amount_incl_vat: 1969, request_id: null },
    ]);
    expect(r.ok).toBe(true);
    if (r.ok) expect(sum(r.parts).incl).toBe(3969);
  });

  it("weigert delen die niet optellen tot de regel", () => {
    const r = splitLine(arrangementen, [
      { amount_incl_vat: 2000, request_id: "p-a" },
      { amount_incl_vat: 1000, request_id: "p-b" },
    ]);
    expect(r).toMatchObject({ ok: false });
  });

  it("weigert als er geen restant overblijft", () => {
    const r = splitLine(arrangementen, [
      { amount_incl_vat: 3969, request_id: "p-a" },
      { amount_incl_vat: null, request_id: "p-b" },
    ]);
    expect(r).toMatchObject({ ok: false });
    const teveel = splitLine(arrangementen, [
      { amount_incl_vat: 4000, request_id: "p-a" },
      { amount_incl_vat: null, request_id: "p-b" },
    ]);
    expect(teveel).toMatchObject({ ok: false });
  });

  it("splitst een korting in negatieve delen", () => {
    const r = splitLine(korting, [
      { amount_incl_vat: -375, request_id: "p-a" },
      { amount_incl_vat: null, request_id: "p-b" },
    ]);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.parts.map((p) => p.amount_incl_vat)).toEqual([-375, -617.25]);
    expect(sum(r.parts)).toEqual({ incl: -992.25, excl: -910.32, vat: -81.93 });
  });

  it("weigert positieve delen op een korting", () => {
    expect(splitLine(korting, [
      { amount_incl_vat: 375, request_id: "p-a" },
      { amount_incl_vat: null, request_id: "p-b" },
    ])).toMatchObject({ ok: false });
  });

  it("vraagt minstens twee delen, elk met een bedrag", () => {
    expect(splitLine(arrangementen, [{ amount_incl_vat: null, request_id: null }])).toMatchObject({ ok: false });
    expect(splitLine(arrangementen, [
      { amount_incl_vat: 0, request_id: null },
      { amount_incl_vat: null, request_id: null },
    ])).toMatchObject({ ok: false });
    expect(splitLine(arrangementen, [
      { amount_incl_vat: null, request_id: null },
      { amount_incl_vat: 100, request_id: null },
    ])).toMatchObject({ ok: false });
  });
});

describe("splitLineProportionally", () => {
  it("laat de korting naar rato meelopen met dezelfde projecten", () => {
    const model = splitLine(arrangementen, [
      { amount_incl_vat: 1500, request_id: "p-a" },
      { amount_incl_vat: 1200.5, request_id: "p-b" },
      { amount_incl_vat: null, request_id: "p-c" },
    ]);
    expect(model.ok).toBe(true);
    if (!model.ok) return;
    const r = splitLineProportionally(korting, model.parts);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    // 1500/3969 van −992,25 = −375,00; 1200,5/3969 = −300,125 → −300,12; rest −317,13.
    expect(r.parts.map((p) => p.amount_incl_vat)).toEqual([-375, -300.12, -317.13]);
    expect(r.parts.map((p) => p.request_id)).toEqual(["p-a", "p-b", "p-c"]);
    expect(sum(r.parts)).toEqual({ incl: -992.25, excl: -910.32, vat: -81.93 });
  });
});
