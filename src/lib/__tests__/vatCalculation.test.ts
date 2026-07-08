import { describe, it, expect } from "vitest";
import {
  calculateVatAmounts,
  calculateFromInclVat,
  calculateFromExclAndVat,
} from "@/lib/vatCalculation";

describe("vatCalculation", () => {
  it("calculateVatAmounts: 100 excl + 21% = 21 VAT, 121 incl", () => {
    const r = calculateVatAmounts(100, 21);
    expect(r.amountExclVat).toBe(100);
    expect(r.vatRate).toBe(21);
    expect(r.vatAmount).toBe(21);
    expect(r.amountInclVat).toBe(121);
  });

  it("calculateVatAmounts: 0 excl geeft 0", () => {
    const r = calculateVatAmounts(0, 21);
    expect(r.vatAmount).toBe(0);
    expect(r.amountInclVat).toBe(0);
  });

  it("calculateVatAmounts: 0% rate geeft excl = incl", () => {
    const r = calculateVatAmounts(250, 0);
    expect(r.vatAmount).toBe(0);
    expect(r.amountInclVat).toBe(250);
  });

  it("calculateVatAmounts: 9% rate geeft correcte afronding", () => {
    const r = calculateVatAmounts(100, 9);
    expect(r.vatAmount).toBe(9);
    expect(r.amountInclVat).toBe(109);
  });

  it("calculateFromInclVat: 121 incl / 1.21 = 100 excl, 21 VAT", () => {
    const r = calculateFromInclVat(121, 21);
    expect(r.amountExclVat).toBe(100);
    expect(r.vatAmount).toBe(21);
    expect(r.amountInclVat).toBe(121);
  });

  it("calculateFromInclVat: 0 incl geeft 0", () => {
    const r = calculateFromInclVat(0, 21);
    expect(r.amountExclVat).toBe(0);
    expect(r.vatAmount).toBe(0);
  });

  it("calculateFromExclAndVat: exacte leverancierswaarden worden overgenomen", () => {
    const r = calculateFromExclAndVat(99.99, 20.99, 21);
    expect(r.amountExclVat).toBe(99.99);
    expect(r.vatAmount).toBe(20.99);
    expect(r.amountInclVat).toBe(120.98);
  });

  it("coherency: excl→incl en incl→excl zijn consistent voor 21%", () => {
    const excl = 123.45;
    const fromExcl = calculateVatAmounts(excl, 21);
    const fromIncl = calculateFromInclVat(fromExcl.amountInclVat, 21);
    expect(fromIncl.amountExclVat).toBe(excl);
  });
});
