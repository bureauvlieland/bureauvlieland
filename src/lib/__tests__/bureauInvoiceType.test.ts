import { describe, expect, it } from "vitest";
import { resolveBureauInvoiceType } from "@/lib/bureauInvoiceType";

describe("resolveBureauInvoiceType", () => {
  it("kiest eindfactuur wanneer één factuur het volledige projecttotaal dekt", () => {
    expect(
      resolveBureauInvoiceType({
        storedType: "partial",
        invoiceAmountInclVat: 1689,
        projectTotalInclVat: 1689,
        outstandingAmountInclVat: 1689,
        alreadyInvoicedInclVat: 0,
      }),
    ).toBe("final");
  });

  it("laat een restant na eerdere facturen een deelfactuur blijven", () => {
    expect(
      resolveBureauInvoiceType({
        invoiceAmountInclVat: 407,
        projectTotalInclVat: 1689,
        outstandingAmountInclVat: 407,
        alreadyInvoicedInclVat: 1282,
      }),
    ).toBe("partial");
  });

  it("respecteert expliciete creditnota's", () => {
    expect(
      resolveBureauInvoiceType({
        storedType: "credit",
        invoiceAmountInclVat: 100,
        projectTotalInclVat: 100,
      }),
    ).toBe("credit");
  });
});