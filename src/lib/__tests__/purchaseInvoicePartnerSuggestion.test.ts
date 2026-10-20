import { describe, expect, it } from "vitest";
import { suggestPartner, type SuggestablePartner } from "@/lib/purchaseInvoicePartnerSuggestion";

const partners: SuggestablePartner[] = [
  { id: "fiets", name: "Fietsverhuur Jan van Vlieland", iban: "NL91ABNA0417164300" },
  { id: "doeksen", name: "Rederij Doeksen", iban: null },
  { id: "badhotel", name: "Badhotel Bruin B.V.", iban: "NL02RABO0123456789, NL03INGB0001234567" },
  { id: "zuiver", name: "Zuiver Traiteur", iban: null },
];

describe("suggestPartner", () => {
  it("vindt de partner op dezelfde woorden in een andere volgorde", () => {
    // Zo stond het op de factuur van oktober 2026; de partner werd niet gevonden.
    expect(suggestPartner({ supplier_name: "Jan van Vlieland Fietsverhuur & Bagagevervoer" }, partners))
      .toEqual({ partnerId: "fiets", reason: "words" });
  });

  it("vindt de partner op het IBAN, ook als de naam heel anders is", () => {
    expect(suggestPartner({ supplier_name: "J. van Vlieland", supplier_iban: "NL91 ABNA 0417 1643 00" }, partners))
      .toEqual({ partnerId: "fiets", reason: "iban" });
    expect(suggestPartner({ supplier_name: "Hotel Bruin", supplier_iban: "NL03INGB0001234567" }, partners))
      .toEqual({ partnerId: "badhotel", reason: "iban" });
  });

  it("vindt de partner op een gelijke of omvattende naam", () => {
    expect(suggestPartner({ supplier_name: "B.V. Rederij G. Doeksen en Zonen" }, partners)?.partnerId).toBe("doeksen");
    expect(suggestPartner({ supplier_name: "Badhotel Bruin" }, partners)).toEqual({ partnerId: "badhotel", reason: "name" });
    expect(suggestPartner({ supplier_name: "ZUIVER TRAITEUR BV" }, partners)).toEqual({ partnerId: "zuiver", reason: "name" });
  });

  it("matcht niet op één los woord", () => {
    const los = [{ id: "v", name: "Vlieland Outdoor Center" }];
    expect(suggestPartner({ supplier_name: "Gemeente Vlieland" }, los)).toBeNull();
  });

  it("geeft geen suggestie bij gelijkspel tussen partners", () => {
    const twee = [
      { id: "a", name: "Fietsverhuur Vlieland" },
      { id: "b", name: "Vlieland Fietsverhuur" },
    ];
    expect(suggestPartner({ supplier_name: "Vlieland Noord Fietsverhuur" }, twee)).toBeNull();
  });

  it("geeft niets zonder naam en IBAN", () => {
    expect(suggestPartner({ supplier_name: null, supplier_iban: null }, partners)).toBeNull();
    expect(suggestPartner({ supplier_name: "" }, partners)).toBeNull();
  });
});
