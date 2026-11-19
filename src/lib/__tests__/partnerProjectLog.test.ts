import { describe, expect, it } from "vitest";
import { describeLogEntry, isPartnerVisibleHistoryRow, logActor, type PartnerLogEntry } from "@/lib/partnerProjectLog";

const own = new Set(["item-a"]);
const entry = (over: Partial<PartnerLogEntry>): PartnerLogEntry => ({
  id: "1",
  item_id: "item-a",
  item_name: "Vliehors Expres",
  action: "status_changed",
  actor: "partner",
  old_value: null,
  new_value: null,
  notes: null,
  created_at: "2026-11-01T10:00:00Z",
  ...over,
});

describe("partnerProjectLog filter", () => {
  it("toont eigen onderdelen en projectbrede zaken, niet die van anderen", () => {
    expect(isPartnerVisibleHistoryRow({ item_id: "item-a", action: "status_changed" }, own)).toBe(true);
    expect(isPartnerVisibleHistoryRow({ item_id: "item-b", action: "status_changed" }, own)).toBe(false);
    expect(isPartnerVisibleHistoryRow({ item_id: null, action: "dates_changed" }, own)).toBe(true);
    expect(isPartnerVisibleHistoryRow({ item_id: null, action: "billing_updated" }, own)).toBe(false);
    expect(isPartnerVisibleHistoryRow({ item_id: null, action: "customer_portal_viewed" }, own)).toBe(false);
    expect(isPartnerVisibleHistoryRow({ item_id: null, action: "accommodation_quote_submitted" }, own)).toBe(false);
  });

  it("verbergt klaargezette maar ongepubliceerde prijswijzigingen", () => {
    expect(isPartnerVisibleHistoryRow({ item_id: "item-a", action: "admin_changed_price_pending" }, own)).toBe(false);
    expect(isPartnerVisibleHistoryRow({ item_id: "item-a", action: "admin_changed_price" }, own)).toBe(true);
  });

  it("herkent zinnen als actie", () => {
    expect(isPartnerVisibleHistoryRow({ item_id: "item-a", action: 'Admin override: item "X" handmatig op executed' }, own)).toBe(true);
    expect(isPartnerVisibleHistoryRow({ item_id: null, action: "Project handmatig op facturatie gezet" }, own)).toBe(true);
    expect(isPartnerVisibleHistoryRow({ item_id: null, action: "Bureau Vlieland factuur geregistreerd: 2026-001" }, own)).toBe(false);
  });
});

describe("describeLogEntry", () => {
  it("vertaalt de partnerreactie", () => {
    expect(describeLogEntry(entry({ new_value: { status: "confirmed", quoted_price: 750, status_note: null } }))).toBe("U hebt bevestigd voor € 750,00");
    expect(describeLogEntry(entry({ new_value: { status: "alternative", status_note: "Liever 16:00" } }))).toBe('U hebt een alternatief voorgesteld: "Liever 16:00"');
    expect(describeLogEntry(entry({ new_value: { status: "executed", quoted_price: 750 } }))).toBe("U hebt gemarkeerd als uitgevoerd");
  });

  it("vertaalt klantwijzigingen", () => {
    expect(describeLogEntry(entry({ action: "time_changed", actor: "customer", old_value: { value: "14:45:00" }, new_value: { value: "16:00" } }))).toBe("Tijd gewijzigd: 14:45 → 16:00");
    expect(describeLogEntry(entry({ action: "day_changed", actor: "customer", old_value: { value: "Dag 1" }, new_value: { value: "Dag 2" } }))).toBe("Dag gewijzigd: dag 1 → dag 2");
    expect(describeLogEntry(entry({ action: "dates_changed", item_id: null, old_value: { dates: ["2026-11-20"] }, new_value: { dates: ["2026-11-27"] } }))).toBe("Data gewijzigd: 2026-11-20 → 2026-11-27");
    expect(describeLogEntry(entry({ action: "people_changed", item_id: null, old_value: { people: 15 }, new_value: { people: 12 } }))).toBe("Aantal personen: 15 → 12");
    expect(describeLogEntry(entry({ action: "customer_accepted", actor: "customer" }))).toBe("Klant akkoord met dit onderdeel");
  });

  it("vertaalt bureau-acties en zinnen", () => {
    expect(describeLogEntry(entry({ action: "admin_changed_price", actor: "admin", new_value: { admin_price_override: 800 } }))).toBe("Bureau Vlieland stelt een nieuwe prijs voor: € 800,00");
    expect(describeLogEntry(entry({ action: 'Admin override: item "X" handmatig op executed', actor: "admin" }))).toBe('Bureau Vlieland heeft de status handmatig op "gemarkeerd als uitgevoerd" gezet');
    expect(describeLogEntry(entry({ action: "admin_sent_to_partners", item_id: null, actor: "admin" }))).toBe("Aanvraag naar u verstuurd");
  });

  it("vertaalt de actor", () => {
    expect(logActor("customer")).toBe("klant");
    expect(logActor("partner")).toBe("u");
    expect(logActor("admin")).toBe("bureau");
    expect(logActor("system")).toBe("systeem");
  });
});

describe("gepubliceerde bureauwijzigingen", () => {
  it("vertaalt change-log regels", () => {
    expect(describeLogEntry(entry({ action: "bureau_published_day", actor: "admin", old_value: { value: 0 }, new_value: { value: 1 } }))).toBe("Bureau Vlieland heeft de dag aangepast: dag 1 → dag 2");
    expect(describeLogEntry(entry({ action: "bureau_published_time", actor: "admin", old_value: { value: null }, new_value: { value: "10:00:00" } }))).toBe("Bureau Vlieland heeft de tijd aangepast: flexibel → 10:00");
  });
});

describe("aangevulde logging", () => {
  it("vertaalt de nieuwe acties", () => {
    expect(describeLogEntry(entry({ action: "price_recalculated", actor: "admin", new_value: { quoted_price: 600, people: 12 } }))).toBe("Prijs herberekend op het nieuwe aantal (12 pers.): € 600,00");
    expect(describeLogEntry(entry({ action: "partner_dismissed" }))).toBe("U hebt dit onderdeel gesloten zonder factuur");
    expect(describeLogEntry(entry({ action: "auto_closed", actor: "system", new_value: { status: "executed" } }))).toBe("Automatisch op uitgevoerd gezet na afloop");
    expect(describeLogEntry(entry({ action: 'Admin override: item "X" handmatig op executed', actor: "admin", new_value: { status: "executed" } }))).toBe('Bureau Vlieland heeft de status handmatig op "gemarkeerd als uitgevoerd" gezet');
    expect(isPartnerVisibleHistoryRow({ item_id: "item-a", action: "auto_closed" }, own)).toBe(true);
  });
});
