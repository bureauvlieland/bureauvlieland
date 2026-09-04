import { describe, it, expect } from "vitest";
import {
  COMMISSION_VAT_RATE,
  calculateCommissionInvoiceTotals,
  commissionAmountForLine,
} from "@/lib/commissionInvoiceTotals";

/**
 * Deze tests leggen de eigenschap vast waar het om gaat: wat er op de factuur
 * staat, telt op tot wat eronder staat. Ze zijn geschreven vanuit het concrete
 * geval dat eerder misging.
 */
describe("commissionInvoiceTotals", () => {
  const line = (baseAmountExclVat: number, commissionPct = 10) => ({
    baseAmountExclVat,
    commissionPct,
  });

  it("telt de afgeronde regels op, niet de onafgeronde (de twee cent uit de doorlichting)", () => {
    // Precies het voorbeeld uit de doorlichting: vijf regels van 10 %.
    // Oude berekening: som van onafgerond, daarna afgerond → 67,69.
    // De regels zoals ze op de PDF staan tellen op tot 67,71.
    const totals = calculateCommissionInvoiceTotals([
      line(123.45),
      line(67.89),
      line(45.67),
      line(289.35),
      line(150.55),
    ]);

    expect(totals.lines.map((l) => l.commissionAmount)).toEqual([
      12.35, 6.79, 4.57, 28.94, 15.06,
    ]);
    expect(totals.totalExclVat).toBe(67.71);
  });

  it("subtotaal is altijd exact de som van de regelbedragen", () => {
    const bases = [123.45, 67.89, 45.67, 289.35, 150.55, 0.05, 19.995, 1234.56];
    for (const pct of [0, 5, 9, 10, 12.5, 15, 21]) {
      const totals = calculateCommissionInvoiceTotals(bases.map((b) => line(b, pct)));
      const sumOfLines = totals.lines.reduce((s, l) => s + l.commissionAmount, 0);
      expect(totals.totalExclVat).toBeCloseTo(sumOfLines, 10);
    }
  });

  it("subtotaal plus btw is exact het totaal inclusief", () => {
    // Grondslagen die op een halve cent uitkomen — daar ging de voet eerder mis.
    for (let cents = 1; cents <= 4000; cents++) {
      const totals = calculateCommissionInvoiceTotals([line(cents / 10 + 0.05, 10)]);
      expect(totals.totalExclVat + totals.totalVat).toBeCloseTo(totals.totalInclVat, 10);
    }
  });

  it("rondt een enkele regel af op centen", () => {
    expect(commissionAmountForLine(line(123.45))).toBe(12.35);
    expect(commissionAmountForLine(line(100, 21))).toBe(21);
    expect(commissionAmountForLine(line(0, 10))).toBe(0);
  });

  it("gaat om met ontbrekende of onzinnige waarden zonder NaN", () => {
    const totals = calculateCommissionInvoiceTotals([
      { baseAmountExclVat: Number.NaN, commissionPct: 10 },
      { baseAmountExclVat: 100, commissionPct: Number.NaN },
    ]);
    expect(totals.totalExclVat).toBe(0);
    expect(totals.totalVat).toBe(0);
    expect(totals.totalInclVat).toBe(0);
  });

  it("gebruikt 21 % als btw-tarief over commissie", () => {
    const totals = calculateCommissionInvoiceTotals([line(1000)]);
    expect(totals.vatRate).toBe(COMMISSION_VAT_RATE);
    expect(totals.totalExclVat).toBe(100);
    expect(totals.totalVat).toBe(21);
    expect(totals.totalInclVat).toBe(121);
  });

  it("een lege factuur is nul, niet NaN", () => {
    const totals = calculateCommissionInvoiceTotals([]);
    expect(totals).toMatchObject({ totalExclVat: 0, totalVat: 0, totalInclVat: 0 });
  });
});
