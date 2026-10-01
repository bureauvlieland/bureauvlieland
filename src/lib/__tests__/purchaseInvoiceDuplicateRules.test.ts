import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  findDuplicateGroupsInSelection,
  findItemsAlreadyInvoiced,
  findLikelyDuplicate,
  isAmountDuplicate,
  looksLikeProjectReference,
  normalizeInvoiceNumber,
  type DuplicateCandidate,
} from "@/lib/purchaseInvoiceDuplicateRules";

const inv = (over: Partial<DuplicateCandidate> & { id: string }): DuplicateCandidate => ({
  invoice_number: null,
  invoice_date: null,
  amount_incl_vat: null,
  request_id: null,
  ...over,
});

describe("looksLikeProjectReference", () => {
  it("herkent onze projectreferenties, ongeacht opmaak", () => {
    expect(looksLikeProjectReference("BV-2602-0005")).toBe(true);
    expect(looksLikeProjectReference("bv 2602 0005")).toBe(true);
    expect(looksLikeProjectReference("LOG-2503-0001")).toBe(true);
  });

  it("laat echte factuurnummers door", () => {
    expect(looksLikeProjectReference("2026077")).toBe(false);
    expect(looksLikeProjectReference("F2026-0049")).toBe(false);
    expect(looksLikeProjectReference("T-261008")).toBe(false);
    expect(looksLikeProjectReference("BV-2026-001")).toBe(false);
    expect(looksLikeProjectReference("")).toBe(false);
    expect(looksLikeProjectReference(null)).toBe(false);
  });
});

describe("isAmountDuplicate", () => {
  it("zelfde bedrag op hetzelfde project", () => {
    expect(
      isAmountDuplicate(
        { amount_incl_vat: 2340, request_id: "r1" },
        inv({ id: "a", amount_incl_vat: 2340.01, request_id: "r1" }),
      ),
    ).toBe(true);
  });

  it("zelfde bedrag op een ander project is geen dubbele", () => {
    expect(
      isAmountDuplicate(
        { amount_incl_vat: 300, request_id: "r1", invoice_date: "2026-06-26" },
        inv({ id: "a", amount_incl_vat: 300, request_id: "r2", invoice_date: "2026-06-26" }),
      ),
    ).toBe(false);
  });

  it("zonder project: factuurdata binnen 60 dagen", () => {
    const probe = { amount_incl_vat: 225, invoice_date: "2026-06-08" };
    expect(isAmountDuplicate(probe, inv({ id: "a", amount_incl_vat: 225, invoice_date: "2026-06-02" }))).toBe(true);
    expect(isAmountDuplicate(probe, inv({ id: "b", amount_incl_vat: 225, invoice_date: "2026-01-02" }))).toBe(false);
  });

  it("afwijkend bedrag of ontbrekend bedrag telt niet", () => {
    expect(isAmountDuplicate({ amount_incl_vat: 780, request_id: "r" }, inv({ id: "a", amount_incl_vat: 780.05, request_id: "r" }))).toBe(false);
    expect(isAmountDuplicate({ amount_incl_vat: null, request_id: "r" }, inv({ id: "a", amount_incl_vat: null, request_id: "r" }))).toBe(false);
  });
});

describe("findLikelyDuplicate", () => {
  const existing = [
    inv({ id: "portal", invoice_number: "BV-2602-0005", invoice_date: "2026-09-14", amount_incl_vat: 2340, request_id: "r1" }),
    inv({ id: "other", invoice_number: "2026015", invoice_date: "2026-05-28", amount_incl_vat: 780, request_id: "r2" }),
  ];

  it("vindt de portaalregistratie met ons projectnummer via het bedrag", () => {
    const match = findLikelyDuplicate(
      { invoice_number: "2026077", invoice_date: "2026-09-14", amount_incl_vat: 2340, request_id: "r1" },
      existing,
    );
    expect(match?.invoice.id).toBe("portal");
    expect(match?.reason).toBe("amount");
  });

  it("nummer-match gaat voor bedrag-match", () => {
    const match = findLikelyDuplicate(
      { invoice_number: "bv 2602 0005", amount_incl_vat: 1, request_id: "r1" },
      existing,
    );
    expect(match?.reason).toBe("number");
  });

  it("sluit de eigen rij uit bij bewerken", () => {
    expect(
      findLikelyDuplicate({ invoice_number: "BV-2602-0005" }, existing, { excludeId: "portal" }),
    ).toBeNull();
  });

  it("geeft niets bij een echte nieuwe factuur", () => {
    expect(
      findLikelyDuplicate(
        { invoice_number: "2026081", invoice_date: "2026-09-23", amount_incl_vat: 780, request_id: "r3" },
        existing,
      ),
    ).toBeNull();
  });
});

describe("findDuplicateGroupsInSelection", () => {
  it("groepeert op nummer en daarna op bedrag, elke rij in één groep", () => {
    const groups = findDuplicateGroupsInSelection([
      { id: "a", partner_id: "p1", invoice_number: "T-261008", invoice_date: "2026-06-02", amount_incl_vat: 225, request_id: "r1" },
      { id: "b", partner_id: "p1", invoice_number: "T261008", invoice_date: "2026-06-08", amount_incl_vat: 225, request_id: "r1" },
      { id: "c", partner_id: "p1", invoice_number: "BV-2602-0005", invoice_date: "2026-09-14", amount_incl_vat: 2340, request_id: "r2" },
      { id: "d", partner_id: "p1", invoice_number: "2026077", invoice_date: "2026-09-14", amount_incl_vat: 2340, request_id: "r2" },
      { id: "e", partner_id: "p2", invoice_number: "9", invoice_date: "2026-09-14", amount_incl_vat: 2340, request_id: "r2" },
    ]);
    expect(groups).toHaveLength(2);
    expect(groups[0].reason).toBe("number");
    expect(groups[0].rows.map((r) => r.id)).toEqual(["a", "b"]);
    expect(groups[1].reason).toBe("amount");
    expect(groups[1].rows.map((r) => r.id)).toEqual(["c", "d"]);
  });

  it("is leeg zonder dubbelen", () => {
    expect(
      findDuplicateGroupsInSelection([
        { id: "a", partner_id: "p1", invoice_number: "1", invoice_date: "2026-06-02", amount_incl_vat: 100, request_id: "r1" },
        { id: "b", partner_id: "p1", invoice_number: "2", invoice_date: "2026-06-02", amount_incl_vat: 200, request_id: "r1" },
      ]),
    ).toEqual([]);
  });
});

describe("findItemsAlreadyInvoiced", () => {
  it("geeft per gevraagd onderdeel de eerste bestaande factuur", () => {
    const found = findItemsAlreadyInvoiced(["i1", "i2", "i3"], [
      { item_id: "i1", invoice_id: "x", invoice_number: "2026077" },
      { item_id: "i1", invoice_id: "y", invoice_number: "BV-2602-0005" },
      { item_id: "i9", invoice_id: "z", invoice_number: "9" },
      { item_id: null, invoice_id: "w", invoice_number: "8" },
    ]);
    expect([...found.keys()]).toEqual(["i1"]);
    expect(found.get("i1")?.invoice_number).toBe("2026077");
  });
});

describe("Deno-kopie", () => {
  it("supabase/functions/_shared heeft dezelfde regels als src/lib", () => {
    const read = (p: string) => readFileSync(resolve(process.cwd(), p), "utf8");
    expect(read("supabase/functions/_shared/purchaseInvoiceDuplicateRules.ts")).toBe(
      read("src/lib/purchaseInvoiceDuplicateRules.ts"),
    );
  });
});

describe("normalizeInvoiceNumber", () => {
  it("is gelijk aan de bestaande normalisatie", () => {
    expect(normalizeInvoiceNumber("F-2026-001")).toBe("F2026001");
    expect(normalizeInvoiceNumber(undefined)).toBe("");
  });
});
