import { describe, it, expect } from "vitest";

/**
 * Regression test — vervolgfactuur (slot-mode) mag alleen het RESTANT
 * registreren, niet nogmaals het volledige projecttotaal.
 *
 * Achtergrond: bij project BV-2605-0001 werd na een eerste deelfactuur
 * van €1.524,75 (op grandTotal €1.932,15) een tweede factuur aangemaakt
 * die per abuis het volledige projecttotaal opnieuw bevatte in plaats
 * van het restant van €407,40. Deze test spiegelt de slot-mode-berekening
 * uit AdminInvoicePreview.tsx en borgt dat de nieuwe deelfactuur netjes
 * pro-rata over de bestaande VAT-groepen wordt verdeeld.
 */

interface VatLine { rate: number; exclVat: number; vatAmount: number }

function computeSlotTotals(
  grandTotalInclVat: number,
  vatLines: VatLine[],
  priorInvoicedInclVat: number,
) {
  const netDueIncl = Math.max(0, grandTotalInclVat - priorInvoicedInclVat);
  if (grandTotalInclVat <= 0 || netDueIncl <= 0) {
    return { totalExclVat: 0, totalVat: 0, totalInclVat: 0, vatLines: [] as VatLine[] };
  }
  const factor = netDueIncl / grandTotalInclVat;
  let runningExcl = 0;
  let runningVat = 0;
  const lines = vatLines.map((l) => {
    const exclVat = Math.round(l.exclVat * factor * 100) / 100;
    const vatAmount = Math.round(l.vatAmount * factor * 100) / 100;
    runningExcl += exclVat;
    runningVat += vatAmount;
    return { rate: l.rate, exclVat, vatAmount };
  });
  const diff = netDueIncl - (runningExcl + runningVat);
  const idx = lines.findIndex((l) => l.rate > 0) === -1 ? 0 : lines.findIndex((l) => l.rate > 0);
  if (lines.length > 0 && Math.abs(diff) > 0.001) {
    const rate = lines[idx].rate;
    lines[idx].exclVat = Math.round((lines[idx].exclVat + diff / (1 + rate / 100)) * 100) / 100;
    lines[idx].vatAmount = Math.round((lines[idx].vatAmount + diff - diff / (1 + rate / 100)) * 100) / 100;
  }
  const totalExclVat = lines.reduce((s, l) => s + l.exclVat, 0);
  const totalVat = lines.reduce((s, l) => s + l.vatAmount, 0);
  return {
    totalExclVat: Math.round(totalExclVat * 100) / 100,
    totalVat: Math.round(totalVat * 100) / 100,
    totalInclVat: Math.round((totalExclVat + totalVat) * 100) / 100,
    vatLines: lines,
  };
}

describe("Vervolgfactuur registreert alleen het restant", () => {
  it("BV-2605-0001 scenario: FV-002 na FV-001 mag alleen €407,40 zijn", () => {
    // Projecttotaal volgens Financieel Overzicht
    const vatLines: VatLine[] = [
      { rate: 0, exclVat: 53.04, vatAmount: 0 },      // toeristenbelasting + natuurbijdrage
      { rate: 9, exclVat: 1068.45, vatAmount: 96.16 },
      { rate: 21, exclVat: 590.50, vatAmount: 124.00 },
    ];
    const grandTotal =
      vatLines.reduce((s, l) => s + l.exclVat + l.vatAmount, 0);
    expect(grandTotal).toBeCloseTo(1932.15, 2);

    const priorInvoiced = 1524.75; // FV-BV-2605-0001-001
    const slot = computeSlotTotals(grandTotal, vatLines, priorInvoiced);

    // Restant moet exact €407,40 zijn — niet nogmaals het projecttotaal
    expect(slot.totalInclVat).toBeCloseTo(407.40, 2);
    expect(slot.totalInclVat).not.toBeCloseTo(1932.15, 2);
    expect(slot.totalExclVat + slot.totalVat).toBeCloseTo(slot.totalInclVat, 2);

    // Pro-rata verdeling houdt BTW-groepen sluitend
    for (const line of slot.vatLines) {
      if (line.rate === 0) {
        expect(line.vatAmount).toBeCloseTo(0, 2);
      } else {
        // BTW moet ongeveer rate% van excl zijn (±1ct tolerantie voor de correctie-regel)
        const expectedVat = Math.round(line.exclVat * line.rate) / 100;
        expect(Math.abs(line.vatAmount - expectedVat)).toBeLessThan(0.05);
      }
    }
  });

  it("Zonder eerdere facturen: volledig projecttotaal wordt gefactureerd", () => {
    const vatLines: VatLine[] = [
      { rate: 21, exclVat: 1000, vatAmount: 210 },
    ];
    const slot = computeSlotTotals(1210, vatLines, 0);
    expect(slot.totalInclVat).toBeCloseTo(1210, 2);
  });

  it("Volledig gefactureerd: restant = 0, geen negatieve waarden", () => {
    const vatLines: VatLine[] = [
      { rate: 21, exclVat: 1000, vatAmount: 210 },
    ];
    const slot = computeSlotTotals(1210, vatLines, 1210);
    expect(slot.totalInclVat).toBe(0);
    expect(slot.totalExclVat).toBe(0);
    expect(slot.totalVat).toBe(0);
  });

  it("Meerdere BTW-groepen blijven pro-rata sluitend", () => {
    const vatLines: VatLine[] = [
      { rate: 9, exclVat: 200, vatAmount: 18 },
      { rate: 21, exclVat: 100, vatAmount: 21 },
    ];
    const grand = 200 + 18 + 100 + 21; // 339
    const slot = computeSlotTotals(grand, vatLines, 200);
    expect(slot.totalInclVat).toBeCloseTo(139, 2);
    // Som van regels moet gelijk zijn aan totaal
    const sum = slot.vatLines.reduce((s, l) => s + l.exclVat + l.vatAmount, 0);
    expect(Math.round(sum * 100) / 100).toBeCloseTo(139, 2);
  });
});
