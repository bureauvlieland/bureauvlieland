import { describe, it, expect } from "vitest";
import {
  allocationsFromLineAssignments,
  summarizeLineAssignments,
  type AssignableLine,
  type LineTarget,
} from "@/lib/purchaseInvoiceLineAssignment";

const line = (description: string, amountExclVat: number, vatRate: number): AssignableLine => ({
  description,
  amountExclVat,
  vatRate,
  amountInclVat: amountExclVat * (1 + vatRate / 100),
});

/** Een hotelfactuur: overnachtingen, diner, drank en toeristenbelasting. */
const hotelLines: AssignableLine[] = [
  line("Overnachtingen 40 pers", 5000, 9),
  line("Diner", 1200, 9),
  line("Drank", 450, 21),
  line("Toeristenbelasting", 120, 0),
];

const toItem = (itemId: string): LineTarget => ({ kind: "item", itemId });
const touristTax: LineTarget = { kind: "tourist_tax" };
const unassigned: LineTarget = { kind: "unassigned" };

describe("overzicht van de toewijzing", () => {
  it("houdt toeristenbelasting buiten de doorbelasting", () => {
    const summary = summarizeLineAssignments(hotelLines, [
      toItem("logies"),
      toItem("diner"),
      toItem("diner"),
      touristTax,
    ]);

    expect(summary.assignedExclVat).toBe(6650);
    expect(summary.touristTaxExclVat).toBe(120);
    expect(summary.unassignedExclVat).toBe(0);
    expect(summary.isComplete).toBe(true);
  });

  it("laat zien wat er nog te verdelen is", () => {
    const summary = summarizeLineAssignments(hotelLines, [
      toItem("logies"),
      unassigned,
      unassigned,
      touristTax,
    ]);

    expect(summary.unassignedExclVat).toBe(1650);
    expect(summary.unassignedCount).toBe(2);
    expect(summary.isComplete).toBe(false);
  });

  it("telt regels zonder bestemming mee in het totaal", () => {
    const summary = summarizeLineAssignments(hotelLines, []);
    expect(summary.totalExclVat).toBe(6770);
    expect(summary.assignedExclVat).toBe(0);
    expect(summary.isComplete).toBe(false);
  });

  it("een factuur zonder regels is niet compleet", () => {
    expect(summarizeLineAssignments([], []).isComplete).toBe(false);
  });

  it("geeft de toeristenbelasting ook inclusief btw terug", () => {
    // Dit bedrag hoort wél in de factuur die we de partner betalen, maar niet in
    // de verdeling. Zonder dat onderscheid registreren we de factuur te laag en
    // krijgt de partner te weinig uitbetaald.
    const summary = summarizeLineAssignments(
      [line("Overnachtingen", 5000, 9), line("Toeristenbelasting", 120, 9)],
      [toItem("logies"), touristTax],
    );

    expect(summary.touristTaxExclVat).toBe(120);
    expect(summary.touristTaxInclVat).toBe(130.8);
    expect(summary.assignedExclVat).toBe(5000);
  });

  it("is nul zonder toeristenbelasting", () => {
    const summary = summarizeLineAssignments(
      [line("Zaalhuur", 1000, 21)],
      [toItem("zaal")],
    );
    expect(summary.touristTaxInclVat).toBe(0);
  });
});

describe("verdeelregels uit de toewijzing", () => {
  it("neemt regels met hetzelfde onderdeel en tarief samen", () => {
    // Diner (9 %) en drank (21 %) gaan naar hetzelfde onderdeel: twee regels.
    const allocations = allocationsFromLineAssignments(hotelLines, [
      toItem("logies"),
      toItem("diner"),
      toItem("diner"),
      touristTax,
    ]);

    expect(allocations).toHaveLength(3);
    expect(allocations).toContainEqual(
      expect.objectContaining({ item_id: "logies", vat_rate: 9, amount_excl_vat: 5000 }),
    );
    expect(allocations).toContainEqual(
      expect.objectContaining({ item_id: "diner", vat_rate: 9, amount_excl_vat: 1200 }),
    );
    expect(allocations).toContainEqual(
      expect.objectContaining({ item_id: "diner", vat_rate: 21, amount_excl_vat: 450 }),
    );
  });

  it("laat toeristenbelasting volledig weg", () => {
    const allocations = allocationsFromLineAssignments(hotelLines, [
      toItem("logies"),
      toItem("logies"),
      toItem("logies"),
      touristTax,
    ]);
    expect(allocations.every((a) => a.amount_excl_vat !== 120)).toBe(true);
    const total = allocations.reduce((s, a) => s + a.amount_excl_vat, 0);
    expect(total).toBe(6650);
  });

  it("telt vier gerechten op 9 % op tot één verdeelregel", () => {
    const catering: AssignableLine[] = [
      line("Soep", 120, 9),
      line("Hoofdgerecht", 480, 9),
      line("Nagerecht", 150, 9),
      line("Koffie", 60, 9),
      line("Wijn", 200, 21),
    ];
    const allocations = allocationsFromLineAssignments(
      catering,
      catering.map(() => toItem("diner")),
    );

    expect(allocations).toHaveLength(2);
    expect(allocations[0]).toMatchObject({ vat_rate: 9, amount_excl_vat: 810 });
    expect(allocations[1]).toMatchObject({ vat_rate: 21, amount_excl_vat: 200 });
    expect(allocations[0].notes).toBe("Soep, Hoofdgerecht, Nagerecht, Koffie");
  });

  it("berekent btw en inclusief bedrag per verdeelregel", () => {
    const allocations = allocationsFromLineAssignments(
      [line("Zaalhuur", 1000, 21)],
      [toItem("zaal")],
    );
    expect(allocations[0]).toMatchObject({
      amount_excl_vat: 1000,
      vat_amount: 210,
      amount_incl_vat: 1210,
    });
  });

  it("negeert regels zonder bestemming", () => {
    const allocations = allocationsFromLineAssignments(hotelLines, [toItem("logies")]);
    expect(allocations).toHaveLength(1);
    expect(allocations[0].amount_excl_vat).toBe(5000);
  });
});
