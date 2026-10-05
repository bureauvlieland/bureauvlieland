import { describe, expect, it } from "vitest";
import {
  checkPartnerInvoiceDetails,
  commissionInvoiceActions,
  commissionInvoiceLabel,
  commissionInvoicePdfPath,
  countsTowardsTotal,
} from "@/lib/commissionInvoiceStatus";

describe("commissionInvoiceActions", () => {
  it("een concept mag bewerkt, verwijderd en definitief gemaakt worden, maar niet verstuurd", () => {
    const a = commissionInvoiceActions("draft");
    expect(a.edit).toBe(true);
    expect(a.delete).toBe(true);
    expect(a.finalize).toBe(true);
    expect(a.send).toBe(false);
    expect(a.forward).toBe(false);
    expect(a.markPaid).toBe(false);
  });

  it("een definitieve factuur mag alleen verstuurd worden", () => {
    const a = commissionInvoiceActions("final");
    expect(a.edit).toBe(false);
    expect(a.delete).toBe(false);
    expect(a.finalize).toBe(false);
    expect(a.send).toBe(true);
    expect(a.forward).toBe(false);
    expect(a.markPaid).toBe(false);
  });

  it("een verstuurde factuur mag opnieuw verstuurd, doorgestuurd en betaald gemarkeerd worden", () => {
    const a = commissionInvoiceActions("sent");
    expect(a.send).toBe(true);
    expect(a.forward).toBe(true);
    expect(a.markPaid).toBe(true);
    expect(a.edit).toBe(false);
    expect(a.delete).toBe(false);
  });

  it("doorgestuurd: alleen nog betaald markeren", () => {
    const a = commissionInvoiceActions("forwarded");
    expect(a.markPaid).toBe(true);
    expect(a.send).toBe(false);
    expect(a.forward).toBe(false);
  });

  it("betaald en gecrediteerd: niets meer", () => {
    for (const status of ["paid", "credited"]) {
      const a = commissionInvoiceActions(status);
      expect(Object.values(a).some(Boolean)).toBe(false);
    }
  });
});

describe("commissionInvoiceLabel en totalen", () => {
  it("toont 'Concept' zolang er geen nummer is", () => {
    expect(commissionInvoiceLabel({ invoice_number: null, status: "draft" })).toBe("Concept");
    expect(commissionInvoiceLabel({ invoice_number: "BVC-2610-0001", status: "final" })).toBe(
      "BVC-2610-0001",
    );
  });

  it("concepten en creditnota's tellen niet mee in het totaal", () => {
    expect(countsTowardsTotal("draft")).toBe(false);
    expect(countsTowardsTotal("credited")).toBe(false);
    expect(countsTowardsTotal("final")).toBe(true);
    expect(countsTowardsTotal("paid")).toBe(true);
  });

  it("de PDF staat onder de partner, op factuurnummer", () => {
    expect(commissionInvoicePdfPath("zeezicht", "BVC-2610-0001")).toBe("zeezicht/BVC-2610-0001.pdf");
  });
});

describe("checkPartnerInvoiceDetails", () => {
  const complete = {
    name: "Hotel Zeezicht",
    email: "info@zeezicht.nl",
    contact_email: null,
    address_street: "Dorpsstraat 1",
    address_postal: "8899 AA",
    address_city: "Vlieland",
    kvk_number: "12345678",
  };

  it("volledige gegevens: niets blokkeert", () => {
    expect(checkPartnerInvoiceDetails(complete)).toEqual({ blocking: [], warnings: [] });
  });

  it("zonder e-mail, straat of plaats kan de factuur niet definitief", () => {
    const result = checkPartnerInvoiceDetails({
      ...complete,
      email: "",
      address_street: null,
      address_city: "  ",
    });
    expect(result.blocking).toEqual(["e-mailadres", "straat", "plaats"]);
  });

  it("het contactadres telt als e-mailadres", () => {
    const result = checkPartnerInvoiceDetails({ ...complete, email: null, contact_email: "boek@zeezicht.nl" });
    expect(result.blocking).toEqual([]);
  });

  it("postcode en KvK zijn waarschuwingen", () => {
    const result = checkPartnerInvoiceDetails({ ...complete, address_postal: null, kvk_number: null });
    expect(result.blocking).toEqual([]);
    expect(result.warnings).toEqual(["postcode", "KvK-nummer"]);
  });

  it("zonder partner blokkeert alles", () => {
    expect(checkPartnerInvoiceDetails(null).blocking).toEqual(["partner"]);
  });
});
