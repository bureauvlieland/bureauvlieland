import { describe, it, expect } from "vitest";
import {
  computeProjectFees,
  resolveCoordinationBase,
  isRushRequest,
  resolveFeeStructure,
  sumBillableRevisions,
  buildActiveStructure,
} from "@/lib/feeEngine";
import { DEFAULT_FEE_STRUCTURE, LEGACY_FEE_STRUCTURE, type PricingStructureRow } from "@/types/pricing";

const base = (over: Partial<Parameters<typeof computeProjectFees>[0]> = {}) =>
  computeProjectFees({
    structure: DEFAULT_FEE_STRUCTURE,
    numberOfPeople: 45,
    numberOfDays: 1,
    isBureauCentral: true,
    partnerCostsTotal: 5000,
    ...over,
  });

describe("resolveCoordinationBase", () => {
  it("kiest de staffel op groepsgrootte", () => {
    expect(resolveCoordinationBase(DEFAULT_FEE_STRUCTURE, 8).base).toBe(175);
    expect(resolveCoordinationBase(DEFAULT_FEE_STRUCTURE, 45).base).toBe(395);
    expect(resolveCoordinationBase(DEFAULT_FEE_STRUCTURE, 500).base).toBe(1250);
  });

  it("gebruikt legacy staffels voor oude snapshots", () => {
    expect(resolveCoordinationBase(LEGACY_FEE_STRUCTURE, 45).base).toBe(250);
  });
});

describe("computeProjectFees", () => {
  it("rekent extra dagen tegen het ingestelde percentage", () => {
    const r = base({ numberOfDays: 3 });
    expect(r.coordinationBase).toBe(395);
    expect(r.coordinationExtraDays).toBe(474); // 2 × 60% × 395
    expect(r.coordinationSubtotal).toBe(869);
  });

  it("telt de spoedtoeslag over de organisatiefee", () => {
    const r = base({
      requestDate: "2026-06-01",
      arrivalDate: "2026-06-15",
    });
    expect(r.rushApplies).toBe(true);
    expect(r.rushSurcharge).toBe(98.75);
    expect(r.coordinationFee).toBe(493.75);
  });

  it("past het minimum op de opslag centrale facturatie toe", () => {
    expect(base({ partnerCostsTotal: 1000 }).centralSurcharge).toBe(75); // 3% = 30 → min 75
    expect(base({ partnerCostsTotal: 5000 }).centralSurcharge).toBe(150);
  });

  it("rekent geen opslag zonder centrale facturatie of partnerkosten", () => {
    expect(base({ isBureauCentral: false }).centralSurcharge).toBe(0);
    expect(base({ partnerCostsTotal: 0 }).centralSurcharge).toBe(0);
  });

  it("respecteert uitgesloten kostenposten", () => {
    const r = base({ excludedFees: ["coordination_fee", "central_surcharge"] });
    expect(r.coordinationFee).toBe(0);
    expect(r.centralSurcharge).toBe(0);
    expect(r.standardVatFeeTotal).toBe(0);
  });

  it("telt wijzigingsrondes mee in het 21%-totaal", () => {
    const r = base({ revisionFeesTotal: 190 });
    expect(r.revisionFeesTotal).toBe(190);
    expect(r.standardVatFeeTotal).toBe(395 + 150 + 190);
  });

  it("houdt legacy-projecten op hun oude bedragen", () => {
    const r = base({ structure: LEGACY_FEE_STRUCTURE, numberOfDays: 3, numberOfPeople: 45 });
    expect(r.coordinationFee).toBe(250); // geen extra-dagopslag
    expect(r.rushSurcharge).toBe(0);
    expect(r.centralSurcharge).toBe(112.5); // 45 × € 2,50 p.p.
  });
});

describe("isRushRequest", () => {
  it("kijkt naar het venster tot aankomst", () => {
    expect(isRushRequest(4, "2026-06-01", "2026-06-15")).toBe(true);
    expect(isRushRequest(4, "2026-01-01", "2026-06-15")).toBe(false);
    expect(isRushRequest(0, "2026-06-01", "2026-06-15")).toBe(false);
    expect(isRushRequest(4, "2026-06-01", null)).toBe(false);
  });
});

describe("resolveFeeStructure", () => {
  it("laat de snapshot altijd voorgaan op de actieve structuur", () => {
    const snap = { model: "legacy", coordination_fee: LEGACY_FEE_STRUCTURE.coordination_fee };
    const r = resolveFeeStructure(snap, DEFAULT_FEE_STRUCTURE);
    expect(r.model).toBe("legacy");
    expect(resolveCoordinationBase(r, 45).base).toBe(250);
  });

  it("valt terug op de actieve structuur zonder snapshot", () => {
    expect(resolveFeeStructure(null, DEFAULT_FEE_STRUCTURE).model).toBe("tiered_v2");
  });

  it("valt terug op legacy als er geen actieve structuur is", () => {
    expect(resolveFeeStructure(null, null).model).toBe("legacy");
  });
});

describe("buildActiveStructure", () => {
  it("kiest per key de nieuwste versie die al is ingegaan", () => {
    const rows = [
      { key: "coordination_fee", value: { tiers: [{ min_people: 1, max_people: 999999, base: 500 }], extra_day_pct: 50 }, effective_from: "2026-01-01" },
      { key: "coordination_fee", value: { tiers: [{ min_people: 1, max_people: 999999, base: 999 }], extra_day_pct: 50 }, effective_from: "2099-01-01" },
    ] as unknown as PricingStructureRow[];
    const s = buildActiveStructure(rows, new Date("2026-06-01"));
    expect(resolveCoordinationBase(s, 30).base).toBe(500);
  });
});

describe("sumBillableRevisions", () => {
  it("telt alleen aangevinkte rondes", () => {
    expect(
      sumBillableRevisions([
        { billable: true, amount: 95 },
        { billable: false, amount: 95 },
        { billable: true, amount: 95 },
      ]),
    ).toBe(190);
    expect(sumBillableRevisions(null)).toBe(0);
  });
});
