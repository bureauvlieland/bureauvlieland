import { describe, it, expect } from "vitest";
import { buildProjectInvoiceSpec, type SpecItemInput, type SpecSettingsInput } from "@/lib/projectInvoiceSpec";
import {
  HIDDEN_REASON_GONE,
  activeProformaLines,
  isEmptySyncPlan,
  planProformaSync,
  proformaDeltaInclVat,
  specToProformaLines,
  totalsFromProformaLines,
  type ProformaLine,
  type ProformaLineInput,
} from "@/lib/proforma";

const settings: SpecSettingsInput = {
  coordination_fee_tiers: [
    { maxPeople: 10, fee: 150 },
    { maxPeople: 50, fee: 300 },
  ],
  tourist_tax_pp_per_day: 2.5,
  nature_contribution_pp: 1,
  bureau_central_surcharge_pp: 0.5,
  default_vat_rate: 21,
  accommodation_vat_rate: 9,
};

const request = {
  number_of_people: 20,
  selected_dates: ["2026-09-15", "2026-09-16"],
  invoicing_mode: "bureau_central",
  excluded_fees: [] as string[],
};

const item = (over: Partial<SpecItemInput> & { id: string }): SpecItemInput => ({
  block_id: null,
  block_name: "Zeehondentocht",
  block_category: "excursies",
  provider_name: "Zeehondentochten",
  status: "confirmed",
  day_index: 0,
  quoted_price: null,
  admin_price_override: null,
  price_type: "per_person",
  ...over,
});

const build = (items: SpecItemInput[], extra: Partial<Parameters<typeof buildProjectInvoiceSpec>[0]> = {}) =>
  buildProjectInvoiceSpec({
    request,
    items,
    accommodation: { id: "acc-1", accommodation_name: "Hotel", price_total: 1000, vat_rate: 9, extras: [] },
    settings,
    ...extra,
  });

/** Maakt van verse regels bestaande rijen, alsof ze zijn opgeslagen. */
const stored = (inputs: ProformaLineInput[], proformaId = "pf-1"): ProformaLine[] =>
  inputs.map((row, idx) => ({ ...row, id: `line-${idx}`, proforma_id: proformaId, created_at: "2026-11-19T10:00:00Z", updated_at: "2026-11-19T10:00:00Z" }));

describe("specToProformaLines", () => {
  it("geeft elke regel een herkomst, een sleutel en het offertebedrag van nu", () => {
    const spec = build([
      item({ id: "a", quoted_price: 500 }),
      item({ id: "k", day_index: -1, block_name: "Borg", block_category: "overig", price_type: "total", admin_price_override: 77.49, vat_rate: 21 }),
    ]);
    const lines = specToProformaLines(spec);
    const byKey = Object.fromEntries(lines.map((l) => [l.line_key, l]));

    expect(byKey["item:a"].origin).toBe("quote_item");
    expect(byKey["item:a"].item_id).toBe("a");
    expect(byKey["item:a"].quote_amount_incl_vat).toBe(500);
    expect(byKey["item:a"].accepted_amount_incl_vat).toBe(500);
    expect(byKey["item:k"].origin).toBe("quote_item");
    expect(byKey["item:k"].kind).toBe("cost");
    expect(byKey["lodging:acc-1"].origin).toBe("lodging");
    expect(byKey["lodging:acc-1"].accommodation_quote_id).toBe("acc-1");
    expect(byKey["fee:coordination_fee"].origin).toBe("fee");
    expect(byKey["fee:coordination_fee"].fee_key).toBe("coordination_fee");
    expect(byKey["fee:tourist_tax"].fee_key).toBe("tourist_tax");
    expect(lines.every((l) => l.line_status === "active")).toBe(true);
    expect(lines.map((l) => l.sort_order)).toEqual(lines.map((_, i) => i));
  });

  it("sluit op de totalen van de specificatie", () => {
    const spec = build([item({ id: "a", quoted_price: 500 })]);
    const lines = stored(specToProformaLines(spec));
    expect(totalsFromProformaLines(lines).inclVat).toBe(spec.totals.inclVat);
    expect(proformaDeltaInclVat(lines, spec)).toBe(0);
  });

  it("geeft klantregels onder een onderdeel een eigen sleutel onder het onderdeel", () => {
    const spec = build([item({ id: "a", quoted_price: 500 })], {
      linesByItem: {
        a: [
          { id: "bl-1", item_id: "a", description: "Boot", quantity: 20, unit_price_excl_vat: 20, vat_rate: 9, amount_excl_vat: 400, vat_amount: 36, amount_incl_vat: 436 },
        ],
      },
    });
    const lines = specToProformaLines(spec);
    const sub = lines.find((l) => l.kind === "sub");
    expect(sub?.line_key).toBe("item:a:sub:bl-1");
    expect(sub?.item_id).toBe("a");
    expect(lines.find((l) => l.line_key === "item:a")?.kind).toBe("item_group");
  });
});

describe("planProformaSync (plan §3.4)", () => {
  it("doet niets als de proforma al gelijk is aan de specificatie", () => {
    const spec = build([item({ id: "a", quoted_price: 500 })]);
    const fresh = specToProformaLines(spec);
    expect(isEmptySyncPlan(planProformaSync(stored(fresh), fresh))).toBe(true);
  });

  it("werkt een offerteregel bij als de prijs na akkoord verandert, maar laat het akkoordbedrag staan", () => {
    const before = stored(specToProformaLines(build([item({ id: "a", quoted_price: 500 })])));
    const fresh = specToProformaLines(build([item({ id: "a", quoted_price: 550 })]));
    const plan = planProformaSync(before, fresh);

    const itemUpdate = plan.updates.find((u) => u.id === before.find((l) => l.line_key === "item:a")?.id);
    expect(itemUpdate?.patch.amount_incl_vat).toBe(550);
    expect(itemUpdate?.patch.quote_amount_incl_vat).toBe(550);
    expect("accepted_amount_incl_vat" in (itemUpdate?.patch ?? {})).toBe(false);
    // De opslag volgt het totaal en verandert dus mee; toeristenbelasting niet.
    const surchargeId = before.find((l) => l.line_key === "fee:central_surcharge")?.id;
    const touristId = before.find((l) => l.line_key === "fee:tourist_tax")?.id;
    expect(plan.updates.some((u) => u.id === touristId)).toBe(false);
    expect(surchargeId).toBeDefined();
    expect(plan.inserts).toHaveLength(0);
    expect(plan.deletes).toHaveLength(0);
  });

  it("voegt een nieuw onderdeel toe en verbergt een onderdeel dat uit de offerte verdween", () => {
    const before = stored(specToProformaLines(build([item({ id: "a", quoted_price: 500 })])));
    const fresh = specToProformaLines(build([item({ id: "b", quoted_price: 300, block_name: "Lunch", block_category: "catering" })]));
    const plan = planProformaSync(before, fresh);

    expect(plan.inserts.map((l) => l.line_key)).toContain("item:b");
    const aId = before.find((l) => l.line_key === "item:a")?.id;
    const hide = plan.updates.find((u) => u.id === aId);
    expect(hide?.patch).toEqual({ line_status: "hidden", hidden_reason: HIDDEN_REASON_GONE });
    expect(plan.deletes).toHaveLength(0);
  });

  it("haalt een verborgen onderdeel terug als het weer in de offerte staat", () => {
    const before = stored(specToProformaLines(build([item({ id: "a", quoted_price: 500 })]))).map((l) =>
      l.line_key === "item:a" ? { ...l, line_status: "hidden" as const, hidden_reason: HIDDEN_REASON_GONE } : l,
    );
    const fresh = specToProformaLines(build([item({ id: "a", quoted_price: 500 })]));
    const plan = planProformaSync(before, fresh);
    const restore = plan.updates.find((u) => u.id === before.find((l) => l.line_key === "item:a")?.id);
    expect(restore?.patch).toEqual({ line_status: "active", hidden_reason: null });
  });

  it("laat een door de gebruiker verborgen regel verborgen, maar werkt het bedrag wel bij", () => {
    const before = stored(specToProformaLines(build([item({ id: "a", quoted_price: 500 })]))).map((l) =>
      l.line_key === "item:a" ? { ...l, line_status: "hidden" as const, hidden_reason: "Betaalt de klant rechtstreeks" } : l,
    );
    const fresh = specToProformaLines(build([item({ id: "a", quoted_price: 520 })]));
    const plan = planProformaSync(before, fresh);
    const upd = plan.updates.find((u) => u.id === before.find((l) => l.line_key === "item:a")?.id);
    expect(upd?.patch.amount_incl_vat).toBe(520);
    expect(upd?.patch.line_status).toBeUndefined();
  });

  it("verwijdert een feeregel die wegvalt en raakt vervangen, inkoop- en handmatige regels niet aan", () => {
    const before = stored(specToProformaLines(build([item({ id: "a", quoted_price: 500 })])));
    const replaced = before.find((l) => l.line_key === "item:a")!;
    replaced.line_status = "replaced";
    const purchase: ProformaLine = {
      ...replaced,
      id: "line-purchase",
      line_status: "active",
      origin: "purchase_line",
      line_key: null,
      purchase_invoice_line_id: "pil-1",
      purchase_invoice_id: "pi-1",
      replaces_line_id: replaced.id,
      amount_incl_vat: 480,
    };
    const manual: ProformaLine = {
      ...replaced,
      id: "line-manual",
      line_status: "active",
      origin: "manual",
      line_key: null,
      item_id: null,
      description: "Extra",
      amount_incl_vat: 10,
    };
    const existing = [...before, purchase, manual];

    // Zonder toeristenbelasting (uitgesloten) en met een andere prijs op a.
    const fresh = specToProformaLines(
      build([item({ id: "a", quoted_price: 999 })], { request: { ...request, excluded_fees: ["tourist_tax"] } }),
    );
    const plan = planProformaSync(existing, fresh);

    const touristId = before.find((l) => l.line_key === "fee:tourist_tax")?.id;
    expect(plan.deletes).toEqual([touristId]);
    // De vervangen offerteregel volgt niet meer en blijft eigenaar van zijn
    // sleutel: geen update op a en geen tweede regel voor item:a.
    expect(plan.updates.some((u) => u.id === replaced.id)).toBe(false);
    expect(plan.inserts.some((l) => l.line_key === "item:a")).toBe(false);
    expect(plan.updates.some((u) => u.id === "line-purchase")).toBe(false);
    expect(plan.updates.some((u) => u.id === "line-manual")).toBe(false);
    expect(plan.deletes).not.toContain("line-purchase");
    expect(plan.deletes).not.toContain("line-manual");
  });

  it("telt alleen actieve regels mee in de totalen", () => {
    const lines = stored(specToProformaLines(build([item({ id: "a", quoted_price: 500 })])));
    const all = totalsFromProformaLines(lines).inclVat;
    const hidden = lines.map((l) => (l.line_key === "item:a" ? { ...l, line_status: "hidden" as const } : l));
    expect(totalsFromProformaLines(hidden).inclVat).toBe(Math.round((all - 500) * 100) / 100);
    expect(activeProformaLines(hidden)).toHaveLength(lines.length - 1);
  });
});
