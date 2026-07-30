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
describe("shouldShowFullSpecification", () => {
  it("eindfactuur zonder eerdere termijnen toont volledige specificatie", () => {
    expect(
      shouldShowFullSpecification({
        resolvedType: "final",
        alreadyInvoicedInclVat: 0,
        invoiceAmountInclVat: 1226.84,
        projectTotalInclVat: 1226.84,
      }),
    ).toBe(true);
  });

  it("deelfactuur blijft compact", () => {
    expect(
      shouldShowFullSpecification({
        resolvedType: "partial",
        alreadyInvoicedInclVat: 0,
        invoiceAmountInclVat: 500,
        projectTotalInclVat: 1226.84,
      }),
    ).toBe(false);
  });

  it("slotfactuur na eerdere termijn blijft compact", () => {
    expect(
      shouldShowFullSpecification({
        resolvedType: "final",
        alreadyInvoicedInclVat: 1524.75,
        invoiceAmountInclVat: 407.4,
        projectTotalInclVat: 1932.15,
      }),
    ).toBe(false);
  });

  it("creditnota blijft compact", () => {
    expect(
      shouldShowFullSpecification({
        resolvedType: "credit",
        alreadyInvoicedInclVat: 0,
        invoiceAmountInclVat: 121,
        projectTotalInclVat: 121,
      }),
    ).toBe(false);
  });

  it("afwijkend bedrag t.o.v. specificatie valt terug op compacte regel", () => {
    expect(
      shouldShowFullSpecification({
        resolvedType: "final",
        alreadyInvoicedInclVat: 0,
        invoiceAmountInclVat: 1226.84,
        projectTotalInclVat: 1300,
      }),
    ).toBe(false);
  });

  it("zonder projecttotaal geen specificatie", () => {
    expect(
      shouldShowFullSpecification({
        resolvedType: "final",
        alreadyInvoicedInclVat: 0,
        invoiceAmountInclVat: 100,
        projectTotalInclVat: 0,
      }),
    ).toBe(false);
  });
});
