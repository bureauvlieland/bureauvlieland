import { describe, expect, it } from "vitest";
import {
  costPrefillFromInvoice,
  costVatRateFor,
  invoiceAmountIncl,
  invoiceCoverage,
  sortInvoicesForCost,
  summarizeExtraCosts,
  unlinkedInvoices,
  type CostInvoiceLike,
  type ExtraCostLike,
} from "@/lib/extraCostLinks";

const invoice = (overrides: Partial<CostInvoiceLike> & { id: string }): CostInvoiceLike => ({
  invoice_number: `F-${overrides.id}`,
  invoice_date: "2026-09-14",
  amount_excl_vat: 100,
  vat_amount: 21,
  amount_incl_vat: 121,
  vat_rate: 21,
  description: null,
  partner: { name: "Kampeerterrein Stortemelk" },
  ...overrides,
});

const cost = (overrides: Partial<ExtraCostLike> & { id: string }): ExtraCostLike => ({
  block_name: `Kosten ${overrides.id}`,
  admin_price_override: 121,
  purchase_invoice_id: null,
  ...overrides,
});

describe("invoiceAmountIncl en costVatRateFor", () => {
  it("neemt het bedrag incl. btw, of telt excl. en btw op", () => {
    expect(invoiceAmountIncl(invoice({ id: "a" }))).toBe(121);
    expect(invoiceAmountIncl(invoice({ id: "b", amount_incl_vat: null, amount_excl_vat: 10, vat_amount: 0.9 }))).toBe(10.9);
    expect(invoiceAmountIncl(invoice({ id: "c", amount_incl_vat: 2479.6000000000004 }))).toBe(2479.6);
  });

  it("brengt het btw-tarief terug tot de keuzes in het sheet", () => {
    expect(costVatRateFor({ vat_rate: 9 })).toBe(9);
    expect(costVatRateFor({ vat_rate: 0 })).toBe(0);
    expect(costVatRateFor({ vat_rate: 6 })).toBe(21);
    expect(costVatRateFor({ vat_rate: null })).toBe(21);
  });
});

describe("costPrefillFromInvoice", () => {
  it("vult omschrijving, bedrag, btw en toelichting vanuit de factuur", () => {
    const prefill = costPrefillFromInvoice(
      invoice({ id: "inv1", invoice_number: "26013731", description: "Reserveringsfactuur verblijf", amount_incl_vat: 6346.34, vat_rate: 9 }),
    );
    expect(prefill).toEqual({
      description: "Kampeerterrein Stortemelk: Reserveringsfactuur verblijf",
      amount: 6346.34,
      vatRate: 9,
      notes: "Inkoopfactuur 26013731 van Kampeerterrein Stortemelk",
      providerName: "Kampeerterrein Stortemelk",
      purchaseInvoiceId: "inv1",
    });
  });

  it("valt terug op de leveranciersnaam zonder omschrijving", () => {
    expect(costPrefillFromInvoice(invoice({ id: "x", description: "  " })).description).toBe("Kampeerterrein Stortemelk");
    expect(costPrefillFromInvoice(invoice({ id: "y", partner: null })).description).toBe("Leverancier");
  });
});

describe("invoiceCoverage en summarizeExtraCosts", () => {
  const invoices = [
    invoice({ id: "stortemelk", amount_incl_vat: 6346.34 }),
    invoice({ id: "bagage", amount_incl_vat: 765, partner: { name: "Bagagevervoer Vlieland" } }),
    invoice({ id: "los", amount_incl_vat: 89.34 }),
  ];
  const costs = [
    cost({ id: "staplaats", admin_price_override: 1497, purchase_invoice_id: "stortemelk" }),
    cost({ id: "terrein", admin_price_override: 1351.6, purchase_invoice_id: "stortemelk" }),
    cost({ id: "bagage", admin_price_override: 765, purchase_invoice_id: "bagage" }),
    cost({ id: "uren", admin_price_override: 500 }),
    cost({ id: "verdwenen", admin_price_override: 10, purchase_invoice_id: "bestaat-niet" }),
  ];

  it("telt per factuur de gekoppelde regels op en meldt een tekort", () => {
    const coverage = invoiceCoverage(costs, invoices);
    expect(coverage.get("stortemelk")).toMatchObject({ sale: 2848.6, purchase: 6346.34, shortfall: 3497.74 });
    expect(coverage.get("stortemelk")?.costs.map((c) => c.id)).toEqual(["staplaats", "terrein"]);
    expect(coverage.get("bagage")).toMatchObject({ sale: 765, purchase: 765, shortfall: 0 });
    expect(coverage.has("los")).toBe(false);
    expect(coverage.has("bestaat-niet")).toBe(false);
  });

  it("rekent verkoop, inkoop en marge met elke factuur één keer", () => {
    expect(summarizeExtraCosts(costs, invoices)).toEqual({
      sale: 4123.6,
      linkedSale: 3613.6,
      purchase: 7111.34,
      margin: -3497.74,
      linkedCostCount: 3,
    });
  });

  it("laat facturen zonder kostenregel of in creditering buiten de knop", () => {
    const all = [...invoices, invoice({ id: "credit", refund_pending_at: "2026-10-01T00:00:00Z" })];
    expect(unlinkedInvoices(all, costs).map((i) => i.id)).toEqual(["los"]);
  });
});

describe("sortInvoicesForCost", () => {
  const invoices = [
    invoice({ id: "oud", amount_incl_vat: 500, invoice_date: "2026-05-01" }),
    invoice({ id: "nieuw", amount_incl_vat: 500, invoice_date: "2026-09-01" }),
    invoice({ id: "bijna", amount_incl_vat: 770, invoice_date: "2026-01-01" }),
    invoice({ id: "precies", amount_incl_vat: 765, invoice_date: "2026-01-01" }),
  ];

  it("zet een passend bedrag bovenaan en sorteert de rest op datum", () => {
    expect(sortInvoicesForCost(invoices, 765).map((i) => i.id)).toEqual(["precies", "bijna", "nieuw", "oud"]);
  });

  it("sorteert zonder bedrag alleen op datum, nieuwste eerst", () => {
    expect(sortInvoicesForCost(invoices, null).map((i) => i.id)).toEqual(["nieuw", "oud", "bijna", "precies"]);
  });
});
