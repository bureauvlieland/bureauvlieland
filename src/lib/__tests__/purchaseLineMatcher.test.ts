import { describe, it, expect } from "vitest";
import {
  datesInText,
  keywords,
  matchPurchaseLines,
  type MatchableInvoice,
  type MatchableItem,
  type MatchableLine,
} from "@/lib/purchaseLineMatcher";

const line = (over: Partial<MatchableLine> & { id: string; description: string; amountInclVat: number }): MatchableLine => ({
  invoiceId: "inv-bolder",
  quantity: 1,
  amountExclVat: over.amountInclVat / 1.09,
  vatRate: 9,
  ...over,
});

const item = (over: Partial<MatchableItem> & { id: string; name: string }): MatchableItem => ({
  providerId: "de-bolder",
  dayIndex: 0,
  status: "confirmed",
  quotedInclVat: null,
  people: 153,
  date: null,
  ...over,
});

const bolder: MatchableInvoice = {
  id: "inv-bolder",
  partnerId: "de-bolder",
  partnerName: "De Bolder",
  invoiceNumber: "26.000018",
  amountInclVat: 2866.5,
};

describe("tekstherkenning", () => {
  it("haalt kernwoorden uit een omschrijving", () => {
    expect([...keywords("15-9 Vega maaltijd met toetje voor 91 personen")]).toEqual(["vega", "maaltijd", "toetje"]);
  });

  it("leest datums in drie schrijfwijzen", () => {
    expect(datesInText("15-9 Vega maaltijd")).toEqual([{ month: 9, day: 15 }]);
    expect(datesInText("Lunch 12/08")).toEqual([{ month: 8, day: 12 }]);
    expect(datesInText("Diner 3 aug jl.")).toEqual([{ month: 8, day: 3 }]);
  });
});

describe("voorstellen per regel", () => {
  it("koppelt een maaltijd per dag aan het onderdeel van die dag", () => {
    const items = [
      item({ id: "maaltijd-1", name: "Vega maaltijd", date: "2026-09-15" }),
      item({ id: "maaltijd-2", name: "Vega maaltijd", date: "2026-09-16" }),
      item({ id: "maaltijd-3", name: "Vega maaltijd", date: "2026-09-17" }),
    ];
    const lines = [
      line({ id: "l1", description: "15-9 Vega maaltijd met toetje", amountInclVat: 955.5, quantity: 91 }),
      line({ id: "l2", description: "16-9 Vega maaltijd met toetje", amountInclVat: 955.5, quantity: 91 }),
    ];
    const [m1, m2] = matchPurchaseLines({ lines, invoices: [bolder], items });

    expect(m1.proposal.kind).toBe("item");
    expect(m2.proposal.kind).toBe("item");
    if (m1.proposal.kind === "item" && m2.proposal.kind === "item") {
      expect(m1.proposal.itemId).toBe("maaltijd-1");
      expect(m2.proposal.itemId).toBe("maaltijd-2");
      expect(m1.proposal.reasons.join(" ")).toContain("uitvoeringsdag");
    }
  });

  it("is zeker bij het enige onderdeel van de partner met hetzelfde bedrag", () => {
    const items = [item({ id: "zeehonden", name: "Zeehondentocht", providerId: "zeehonden", quotedInclVat: 562 })];
    const invoice: MatchableInvoice = { ...bolder, id: "inv-z", partnerId: "zeehonden", partnerName: "Zeehondentochten" };
    const [m] = matchPurchaseLines({
      lines: [line({ id: "l", invoiceId: "inv-z", description: "Rondvaart 2 juli", amountInclVat: 562 })],
      invoices: [invoice],
      items,
    });
    expect(m.proposal.kind).toBe("item");
    if (m.proposal.kind === "item") {
      expect(m.proposal.confidence).toBe("sure");
      expect(m.proposal.reasons).toContain("enige onderdeel van deze partner");
      expect(m.proposal.reasons).toContain("bedrag gelijk aan de offerte");
    }
  });

  it("zet toeristenbelasting op niet doorbelasten", () => {
    const [m] = matchPurchaseLines({
      lines: [line({ id: "tt", description: "Toeristenbelasting", amountInclVat: 704.34, vatRate: 0 })],
      invoices: [bolder],
      items: [item({ id: "x", name: "Kampeerplaats" })],
    });
    expect(m.proposal.kind).toBe("skip");
  });

  it("maakt een kostenpost op naam van de partner als er geen onderdelen zijn", () => {
    const [m] = matchPurchaseLines({
      lines: [line({ id: "l", description: "Verblijfskosten", amountInclVat: 4219.8 })],
      invoices: [bolder],
      items: [],
    });
    expect(m.proposal.kind).toBe("new_cost");
    if (m.proposal.kind === "new_cost") {
      expect(m.proposal.costName).toBe("De Bolder");
      expect(m.proposal.costKey).toBe("de-bolder");
    }
  });

  it("houdt bijkomende kosten weg van een waarschijnlijk onderdeel", () => {
    const items = [item({ id: "kamp", name: "Kampeerplaats groep", quotedInclVat: 4219.8 })];
    const [kamp, reservering] = matchPurchaseLines({
      lines: [
        line({ id: "a", description: "Verblijfskosten", amountInclVat: 4219.8 }),
        line({ id: "b", description: "Reserveringskosten", amountInclVat: 16.2, vatRate: 21 }),
      ],
      invoices: [bolder],
      items,
    });
    expect(kamp.proposal.kind).toBe("item");
    expect(reservering.proposal.kind).toBe("new_cost");
  });

  it("geeft voorrang aan een onderdeel waar de partner de factuur al aan hing", () => {
    const items = [
      item({ id: "a", name: "Lunch", quotedInclVat: 500 }),
      item({ id: "b", name: "Diner", quotedInclVat: 500 }),
    ];
    const [m] = matchPurchaseLines({
      lines: [line({ id: "l", description: "Catering", amountInclVat: 500 })],
      invoices: [{ ...bolder, allocatedItemIds: ["b"] }],
      items,
    });
    expect(m.proposal.kind).toBe("item");
    if (m.proposal.kind === "item") expect(m.proposal.itemId).toBe("b");
  });

  it("stelt een nieuwe kostenpost voor bij een onderdeel van een andere partner", () => {
    const [m] = matchPurchaseLines({
      lines: [line({ id: "l", description: "Bagagevervoer groepstarief", amountInclVat: 765 })],
      invoices: [{ ...bolder, partnerId: "bagage", partnerName: "Bagagevervoer Vlieland" }],
      items: [item({ id: "x", name: "Bagagevervoer", providerId: "iemand-anders" })],
    });
    expect(m.proposal.kind).toBe("new_cost");
    if (m.proposal.kind === "new_cost") expect(m.proposal.reason).toContain("geen onderdeel van deze partner");
  });
});

describe("categorie van een logies-extra", () => {
  it("herkent eten en drinken, faciliteiten en vervoer", async () => {
    const { lodgingExtraCategory } = await import("@/lib/purchaseLineMatcher");
    expect(lodgingExtraCategory("Ontbijtbuffet 40 personen")).toBe("fb");
    expect(lodgingExtraCategory("Zaalhuur vergaderruimte")).toBe("facilities");
    expect(lodgingExtraCategory("Transfer naar de haven")).toBe("transport");
    expect(lodgingExtraCategory("Servicekosten")).toBe("other");
  });
});
