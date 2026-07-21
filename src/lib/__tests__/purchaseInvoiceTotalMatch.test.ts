import { describe, it, expect } from "vitest";
import {
  evaluateTotalMatch,
  evaluateSaveGuard,
  unitPriceInclusiveToBreakdown,
  unitPriceExclusiveToBreakdown,
} from "../purchaseInvoiceTotalMatch";

describe("evaluateTotalMatch", () => {
  it("match binnen 2 cent tolerantie", () => {
    const r = evaluateTotalMatch({ computedInclVat: 546.70, pdfInclVat: 546.71 });
    expect(r.status).toBe("match");
  });
  it("mismatch bij groter verschil", () => {
    const r = evaluateTotalMatch({ computedInclVat: 595.90, pdfInclVat: 546.70 });
    expect(r.status).toBe("mismatch");
    expect(r.difference).toBeCloseTo(49.20, 2);
    expect(r.absoluteDifference).toBeCloseTo(49.20, 2);
  });
  it("no_pdf_total wanneer geen PDF-totaal beschikbaar", () => {
    const r = evaluateTotalMatch({ computedInclVat: 100, pdfInclVat: null });
    expect(r.status).toBe("no_pdf_total");
  });
});

describe("evaluateSaveGuard", () => {
  it("blokkeert bij mismatch zonder reden", () => {
    const r = evaluateSaveGuard({ computedInclVat: 595.90, pdfInclVat: 546.70, mismatchReason: null });
    expect(r.canSave).toBe(false);
    expect(r.blockers[0]).toMatch(/49[.,]20/);
  });
  it("staat opslaan toe bij mismatch met reden", () => {
    const r = evaluateSaveGuard({
      computedInclVat: 595.90,
      pdfInclVat: 546.70,
      mismatchReason: "Partner heeft aparte correctiefactuur nagestuurd",
    });
    expect(r.canSave).toBe(true);
  });
  it("blokkeert bij no_pdf_total zonder handmatige bevestiging", () => {
    const r = evaluateSaveGuard({ computedInclVat: 100, pdfInclVat: null, mismatchReason: null });
    expect(r.canSave).toBe(false);
  });
  it("staat opslaan toe bij no_pdf_total mét handmatige bevestiging", () => {
    const r = evaluateSaveGuard({ computedInclVat: 100, pdfInclVat: null, mismatchReason: null, manuallyConfirmed: true });
    expect(r.canSave).toBe(true);
  });
  it("staat opslaan toe bij perfecte match", () => {
    const r = evaluateSaveGuard({ computedInclVat: 546.70, pdfInclVat: 546.70, mismatchReason: null });
    expect(r.canSave).toBe(true);
  });
});

describe("unit price incl vs excl helpers", () => {
  it("herrekent 11×€49,70 incl @9% BTW naar €546,70 incl / €501,56 excl", () => {
    const r = unitPriceInclusiveToBreakdown(49.70, 11, 9);
    expect(r.amount_incl_vat).toBeCloseTo(546.70, 2);
    expect(r.amount_excl_vat).toBeCloseTo(501.56, 2);
    expect(r.vat_amount).toBeCloseTo(45.14, 2);
  });
  it("herrekent 11×€49,70 excl @9% BTW naar €595,90 incl", () => {
    const r = unitPriceExclusiveToBreakdown(49.70, 11, 9);
    expect(r.amount_incl_vat).toBeCloseTo(595.90, 2);
    expect(r.amount_excl_vat).toBeCloseTo(546.70, 2);
    expect(r.vat_amount).toBeCloseTo(49.20, 2);
  });
});
