import { describe, expect, it } from "vitest";
import { isPendingCommission, pendingCommissionAmount, sumPendingCommission, type PendingCommissionSource } from "@/lib/partnerPendingCommission";

const source = (overrides: Partial<PendingCommissionSource> = {}): PendingCommissionSource => ({
  invoiced_number: "F-2026-001",
  invoiced_amount: 500,
  commission_percentage: 10,
  commission_amount: 50,
  commission_status: "pending",
  ...overrides,
});

describe("verwachte commissie over wat de partner al factureerde", () => {
  it("telt alleen gefactureerde bronnen waarvoor het bureau nog geen commissiefactuur maakte", () => {
    expect(isPendingCommission(source())).toBe(true);
    expect(isPendingCommission(source({ invoiced_number: null }))).toBe(false);
    expect(isPendingCommission(source({ commission_status: "invoiced" }))).toBe(false);
    expect(isPendingCommission(source({ commission_status: "paid" }))).toBe(false);
    expect(isPendingCommission(source({ commission_status: "not_applicable" }))).toBe(false);
    expect(isPendingCommission(source({ commission_status: null }))).toBe(false);
  });

  it("gebruikt de momentopname van de registratie", () => {
    expect(pendingCommissionAmount(source({ commission_amount: 48.35 }), 10)).toBe(48.35);
    expect(pendingCommissionAmount(source({ commission_status: "invoiced" }), 10)).toBe(0);
  });

  it("valt terug op grondslag × percentage als de momentopname ontbreekt", () => {
    expect(pendingCommissionAmount(source({ commission_amount: null, invoiced_amount: 400, commission_percentage: 12 }), 10)).toBe(48);
    expect(pendingCommissionAmount(source({ commission_amount: null, invoiced_amount: 400, commission_percentage: null }), 10)).toBe(40);
    expect(pendingCommissionAmount(source({ commission_amount: null, invoiced_amount: null }), 10)).toBe(0);
  });

  it("telt over meerdere bronnen op en slaat afgehandelde over", () => {
    const total = sumPendingCommission([source({ commission_amount: 48.35 }), source({ commission_amount: 31.56 }), source({ commission_status: "paid", commission_amount: 99 })], 10);
    expect(total).toBeCloseTo(79.91, 2);
    expect(sumPendingCommission([], 10)).toBe(0);
  });
});
