import { describe, expect, it } from "vitest";
import {
  directDebitAmount,
  isAwaitingDirectDebit,
  withholdsCommission,
} from "@/lib/purchaseInvoiceDirectDebit";

const doeksen = { pays_by_direct_debit: true };

describe("directDebitAmount", () => {
  it("catering: geen ingehouden commissie, het brutobedrag wordt geïncasseerd", () => {
    const inv = { amount_incl_vat: 348.85, supplier_commission_excl_vat: 0, supplier_commission_vat: 0 };
    expect(directDebitAmount(inv)).toBe(348.85);
    expect(withholdsCommission(inv)).toBe(false);
  });

  it("overtochten: bruto minus ingehouden commissie", () => {
    const inv = { amount_incl_vat: 1000, supplier_commission_excl_vat: 80, supplier_commission_vat: 0 };
    expect(directDebitAmount(inv)).toBe(920);
    expect(withholdsCommission(inv)).toBe(true);
  });

  it("ontbrekende velden tellen als nul", () => {
    expect(directDebitAmount({ amount_incl_vat: 12.3 })).toBe(12.3);
    expect(directDebitAmount({})).toBe(0);
  });
});

describe("isAwaitingDirectDebit", () => {
  it("alleen doorgestuurde facturen van een incassopartner", () => {
    expect(isAwaitingDirectDebit({ status: "forwarded", partner: doeksen })).toBe(true);
    expect(isAwaitingDirectDebit({ status: "pending", partner: doeksen })).toBe(false);
    expect(isAwaitingDirectDebit({ status: "paid", partner: doeksen })).toBe(false);
    expect(isAwaitingDirectDebit({ status: "forwarded", partner: { pays_by_direct_debit: false } })).toBe(false);
    expect(isAwaitingDirectDebit({ status: "forwarded" })).toBe(false);
  });
});
