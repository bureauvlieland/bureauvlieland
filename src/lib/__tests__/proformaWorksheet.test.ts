import { describe, it, expect } from "vitest";
import type { ProformaLine } from "@/lib/proforma";
import {
  candidateStatusLabel,
  changesFromDestinations,
  replaceCandidates,
  itemFigures,
  matchableItemsFromProforma,
  orderProformaLines,
  proposeDestinations,
  sectionsOf,
  worksheetPurchaseLines,
  type WorksheetInvoice,
  type WorksheetItem,
  type WorksheetPurchaseLine,
} from "@/lib/proformaWorksheet";

const line = (over: Partial<ProformaLine> & { id: string }): ProformaLine => ({
  proforma_id: "pf",
  sort_order: 0,
  kind: "item",
  section: "Excursies",
  item_id: null,
  description: "Regel",
  sub_description: null,
  quantity: 1,
  quantity_label: "1",
  unit_price_excl_vat: 0,
  unit_suffix: "",
  vat_rate: 9,
  amount_excl_vat: 0,
  vat_amount: 0,
  amount_incl_vat: 0,
  origin: "quote_item",
  line_status: "active",
  line_key: null,
  replaces_line_id: null,
  hidden_reason: null,
  purchase_invoice_line_id: null,
  purchase_invoice_id: null,
  accommodation_quote_id: null,
  fee_key: null,
  quote_amount_incl_vat: null,
  accepted_amount_incl_vat: null,
  created_at: "2026-11-19T10:00:00Z",
  updated_at: "2026-11-19T10:00:00Z",
  ...over,
});

const pl = (over: Partial<WorksheetPurchaseLine> & { id: string }): WorksheetPurchaseLine => ({
  invoice_id: "inv-1",
  description: "Rondleiding",
  quantity: 1,
  amount_excl_vat: 465.6,
  vat_rate: 9,
  amount_incl_vat: 507.5,
  charge_status: "open",
  skip_reason: null,
  item_id: null,
  lodging_quote_id: null,
  request_id: "req",
  ...over,
});

const invoices: WorksheetInvoice[] = [
  { id: "inv-1", partner_id: "fortuna", partner_name: "Brouwerij Fortuna", invoice_number: "202600127", amount_incl_vat: 507.5 },
  { id: "inv-gast", partner_id: "hotel", partner_name: "Hotel", invoice_number: "9", amount_incl_vat: 100, billed_to: "customer" },
];
const items: WorksheetItem[] = [
  { id: "it-fortuna", provider_id: "fortuna", day_index: 1, status: "confirmed" },
  { id: "it-boot", provider_id: "doeksen", day_index: 0, status: "confirmed" },
];

describe("orderProformaLines", () => {
  it("zet inkoopregels direct onder de vervangen offerteregel en losse regels achteraan", () => {
    const lines = [
      line({ id: "b", sort_order: 1, line_key: "item:2", description: "Lunch" }),
      line({ id: "loose", origin: "manual", description: "Extra", section: "Overig", sort_order: 0 }),
      line({ id: "a", sort_order: 0, line_key: "item:1", description: "Rondleiding", line_status: "replaced" }),
      line({ id: "a-p", origin: "purchase_line", replaces_line_id: "a", purchase_invoice_line_id: "pl", sort_order: 0, description: "Factuurregel" }),
      line({ id: "fee", sort_order: 2, line_key: "fee:x", origin: "fee", section: "Coördinatie & bijdragen" }),
    ];
    const ordered = orderProformaLines(lines);
    expect(ordered.map((l) => l.id)).toEqual(["a", "a-p", "b", "fee", "loose"]);
    expect(ordered.map((l) => l.sort_order)).toEqual([0, 1, 2, 3, 4]);
    expect(sectionsOf(ordered).map((s) => s.label)).toEqual(["Excursies", "Coördinatie & bijdragen", "Overig"]);
  });
});

describe("worksheetPurchaseLines", () => {
  it("verdeelt inkoopregels in open, gelaten en op de factuur", () => {
    const proforma = [line({ id: "p", origin: "purchase_line", purchase_invoice_line_id: "pl-charged" })];
    const state = worksheetPurchaseLines(
      [
        pl({ id: "pl-open" }),
        pl({ id: "pl-charged" }),
        pl({ id: "pl-kept", charge_status: "skipped", skip_reason: "toeristenbelasting" }),
        pl({ id: "pl-lodging", lodging_quote_id: "q" }),
        pl({ id: "pl-gast", invoice_id: "inv-gast" }),
        pl({ id: "pl-kept-quote", charge_status: "kept_quote", item_id: "it-fortuna" }),
        pl({ id: "pl-legacy", charge_status: "legacy", item_id: "it-boot" }),
      ],
      proforma,
      invoices,
    );
    expect(state.open.map((l) => l.id)).toEqual(["pl-open"]);
    expect(state.kept.map((l) => l.id)).toEqual(["pl-kept", "pl-gast"]);
    expect(state.charged.map((l) => l.id)).toEqual(["pl-charged", "pl-lodging", "pl-kept-quote", "pl-legacy"]);
  });
});

describe("replaceCandidates", () => {
  it("biedt ook verdeelde en op-offerteprijs regels aan, maar niets dat al op de proforma of via logies loopt", () => {
    const proforma = [line({ id: "p", origin: "purchase_line", purchase_invoice_line_id: "pl-charged" })];
    const candidates = replaceCandidates(
      [
        pl({ id: "pl-open" }),
        pl({ id: "pl-legacy", charge_status: "legacy", item_id: "it-boot" }),
        pl({ id: "pl-kept-quote", charge_status: "kept_quote", item_id: "it-fortuna" }),
        pl({ id: "pl-kept", charge_status: "skipped" }),
        pl({ id: "pl-charged" }),
        pl({ id: "pl-lodging", lodging_quote_id: "q" }),
        pl({ id: "pl-gast", invoice_id: "inv-gast" }),
      ],
      proforma,
      invoices,
    );
    expect(candidates.map((l) => l.id)).toEqual(["pl-open", "pl-legacy", "pl-kept-quote", "pl-kept"]);
    expect(candidateStatusLabel(pl({ id: "x", charge_status: "legacy" }))).toBe("verdeeld, nog niet op de factuur");
    expect(candidateStatusLabel(pl({ id: "x" }))).toBeNull();
  });
});

describe("proposeDestinations", () => {
  const proforma = [
    line({ id: "q-fortuna", item_id: "it-fortuna", line_key: "item:it-fortuna", description: "Rondleiding Brouwerij Fortuna", amount_incl_vat: 525, quote_amount_incl_vat: 525 }),
    line({ id: "q-boot", item_id: "it-boot", line_key: "item:it-boot", description: "Overtocht", amount_incl_vat: 300, quote_amount_incl_vat: 300 }),
    line({ id: "q-hidden", item_id: "it-x", line_key: "item:it-x", line_status: "hidden" }),
  ];

  it("gebruikt de offerteregels als kandidaten", () => {
    const { matchable, lineByItem } = matchableItemsFromProforma(proforma, items, 20, ["2026-09-15", "2026-09-16"]);
    expect(matchable.map((m) => m.id)).toEqual(["it-fortuna", "it-boot"]);
    expect(matchable[0].date).toBe("2026-09-16");
    expect(matchable[0].quotedInclVat).toBe(525);
    expect(lineByItem.get("it-fortuna")?.id).toBe("q-fortuna");
  });

  it("stelt 'vervangt' voor bij het enige onderdeel van de partner, met de reden", () => {
    const [proposal] = proposeDestinations({
      openLines: [pl({ id: "pl-1" })],
      invoices,
      proformaLines: proforma,
      items,
      numberOfPeople: 20,
      selectedDates: ["2026-09-15", "2026-09-16"],
    });
    expect(proposal.destination).toEqual({ kind: "replace", lineId: "q-fortuna" });
    expect(proposal.reason).toContain("enige onderdeel van deze partner");
  });

  it("stelt 'laat staan' voor bij toeristenbelasting en 'eigen regel' zonder onderdeel van de partner", () => {
    const proposals = proposeDestinations({
      openLines: [
        pl({ id: "pl-tax", description: "Toeristenbelasting 20 pers" }),
        pl({ id: "pl-other", invoice_id: "inv-onbekend" }),
      ],
      invoices: [...invoices, { id: "inv-onbekend", partner_id: "x", partner_name: "Café", invoice_number: "1", amount_incl_vat: 10 }],
      proformaLines: proforma,
      items,
      numberOfPeople: 20,
      selectedDates: [],
    });
    expect(proposals[0].destination.kind).toBe("keep");
    expect(proposals[0].sure).toBe(true);
    expect(proposals[1].destination).toEqual({ kind: "add" });
  });
});

describe("proposeDestinations met logiesofferte", () => {
  it("stelt voor een factuur van de accommodatie de logiesofferte voor in plaats van een eigen regel", () => {
    const [proposal] = proposeDestinations({
      openLines: [pl({ id: "pl-hotel", invoice_id: "inv-hotel", description: "Overnachting 2 nachten", amount_incl_vat: 1487.8 })],
      invoices: [{ id: "inv-hotel", partner_id: "badhotel", partner_name: "Badhotel Bruin", invoice_number: "1", amount_incl_vat: 1487.8 }],
      proformaLines: [],
      items: [],
      numberOfPeople: 20,
      selectedDates: [],
      lodgingQuotes: [{ id: "q-bruin", partner_id: "badhotel", accommodation_name: "Badhotel Bruin" }],
    });
    expect(proposal.destination).toEqual({ kind: "lodging", quoteId: "q-bruin", target: "room" });
    expect(proposal.sure).toBe(false);
    expect(proposal.reason).toContain("logiesofferte");
  });

  it("laat 'lodging' buiten de besluiten voor de databasefunctie", () => {
    expect(changesFromDestinations([{ purchaseLineId: "a", destination: { kind: "lodging", quoteId: "q", target: "room" } }])).toEqual([]);
  });
});

describe("itemFigures", () => {
  it("geeft offerte, inkoop en factuur per offerteregel", () => {
    const quote = line({ id: "q", item_id: "it-fortuna", line_status: "replaced", amount_incl_vat: 525, quote_amount_incl_vat: 525 });
    const replacing = line({ id: "p", origin: "purchase_line", replaces_line_id: "q", item_id: "it-fortuna", amount_incl_vat: 507.5 });
    const figures = itemFigures(quote, [quote, replacing], [pl({ id: "pl", item_id: "it-fortuna" })]);
    expect(figures).toEqual({ quote: 525, purchase: 507.5, invoice: 507.5 });

    const untouched = line({ id: "u", item_id: "it-boot", amount_incl_vat: 300, quote_amount_incl_vat: 300 });
    expect(itemFigures(untouched, [untouched], [])).toEqual({ quote: 300, purchase: null, invoice: 300 });
  });
});

describe("changesFromDestinations", () => {
  it("bundelt vervangingen per offerteregel en toevoegingen in één besluit", () => {
    const changes = changesFromDestinations([
      { purchaseLineId: "a", destination: { kind: "replace", lineId: "q" } },
      { purchaseLineId: "b", destination: { kind: "replace", lineId: "q" } },
      { purchaseLineId: "c", destination: { kind: "add" } },
      { purchaseLineId: "d", destination: { kind: "keep", reason: "rekenen we zelf" } },
    ]);
    expect(changes).toEqual([
      { action: "keep", purchase_line_id: "d", reason: "rekenen we zelf" },
      { action: "replace", line_id: "q", purchase_line_ids: ["a", "b"] },
      { action: "add", purchase_line_ids: ["c"] },
    ]);
  });
});
