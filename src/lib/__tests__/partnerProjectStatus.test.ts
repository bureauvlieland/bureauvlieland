import { describe, expect, it } from "vitest";
import { derivePartnerAccommodationProjectStatus, derivePartnerProjectStatus } from "../partnerProjectStatus";
import { itemDisplayStatusConfig, type ItemDisplayStatus } from "../itemStatus";
import { PARTNER_QUOTE_TABS, partnerQuoteStatus, partnerQuoteTab } from "../accommodationQuoteStatus";

const item = (over: Record<string, unknown>) => ({
  id: "i",
  block_type: "activity",
  status: "pending",
  customer_accepted_at: null,
  customer_approved_at: null,
  proposed_time: null,
  invoiced_number: null,
  ...over,
});

describe("partnerTone in de woordenlijst voor onderdelen", () => {
  it("heeft voor elke status een toon in de vier betekenissen", () => {
    const tones = new Set(["info", "warning", "success", "danger", "neutral"]);
    for (const [key, info] of Object.entries(itemDisplayStatusConfig)) {
      expect(tones.has(info.partnerTone), key).toBe(true);
    }
  });
  it("de partner is aan zet bij een nieuwe aanvraag, een tegenvoorstel en een klantakkoord", () => {
    const aanZet: ItemDisplayStatus[] = ["wacht_op_partner", "tegenvoorstel_klant", "klant_akkoord_wacht_partner", "geaccepteerd"];
    for (const s of aanZet) expect(itemDisplayStatusConfig[s].partnerTone).toBe("warning");
    expect(itemDisplayStatusConfig.wacht_op_klant.partnerTone).toBe("info");
    expect(itemDisplayStatusConfig.uitgevoerd.partnerTone).toBe("success");
    expect(itemDisplayStatusConfig.geannuleerd.partnerTone).toBe("danger");
  });
});

describe("derivePartnerProjectStatus", () => {
  it("geannuleerd wint van alles", () => {
    expect(derivePartnerProjectStatus([item({ status: "accepted" })], { cancelled_at: "2026-10-01" }).key).toBe("geannuleerd");
  });
  it("concept zolang alle onderdelen concept zijn", () => {
    expect(derivePartnerProjectStatus([item({ is_concept: true })]).key).toBe("concept");
    expect(derivePartnerProjectStatus([]).key).toBe("concept");
  });
  it("wacht op uw reactie zodra één onderdeel op de partner wacht", () => {
    const s = derivePartnerProjectStatus([item({ status: "confirmed", customer_accepted_at: "2026-09-01" }), item({ status: "pending" })]);
    expect(s.key).toBe("wacht_op_u");
    expect(s.tone).toBe("warning");
  });
  it("wacht op de klant als de partner heeft voorgesteld", () => {
    const s = derivePartnerProjectStatus([item({ status: "confirmed", proposed_time: "10:00" })]);
    expect(s.key).toBe("wacht_op_klant");
    expect(s.tone).toBe("info");
  });
  it("te factureren als alles is uitgevoerd en er nog geen factuur is", () => {
    const s = derivePartnerProjectStatus([item({ status: "executed" }), item({ status: "executed", invoiced_number: "F-1" })]);
    expect(s.key).toBe("te_factureren");
  });
  it("gefactureerd als alles is uitgevoerd en gefactureerd of zonder factuur gesloten", () => {
    const s = derivePartnerProjectStatus([
      item({ status: "executed", invoiced_number: "F-1" }),
      item({ status: "executed", partner_dismissed_at: "2026-09-02" }),
    ]);
    expect(s.key).toBe("gefactureerd");
    expect(s.tone).toBe("success");
  });
  it("geannuleerd als alle onderdelen zijn geannuleerd of niet beschikbaar", () => {
    expect(derivePartnerProjectStatus([item({ status: "cancelled" }), item({ status: "unavailable" })]).key).toBe("geannuleerd");
  });
  it("bevestigd als de klant akkoord is en er niets meer open staat", () => {
    const s = derivePartnerProjectStatus([item({ status: "accepted", customer_accepted_at: "2026-09-01" })]);
    expect(["bevestigd", "wacht_op_u"]).toContain(s.key);
  });
});

describe("woordenlijst logiesofferte", () => {
  it("vertaalt elke ruwe status naar één woord met een toon", () => {
    expect(partnerQuoteStatus("pending")).toMatchObject({ key: "requested", label: "Offerte gevraagd", tone: "warning" });
    expect(partnerQuoteStatus("submitted").tone).toBe("info");
    expect(partnerQuoteStatus("selected")).toMatchObject({ label: "Gekozen door de klant", tone: "success" });
    expect(partnerQuoteStatus("rejected").label).toBe("Niet gekozen");
    expect(partnerQuoteStatus("expired")).toMatchObject({ label: "Verlopen, te verlengen", tone: "warning" });
    expect(partnerQuoteStatus("declined").label).toBe("Door u afgewezen");
    expect(partnerQuoteStatus("cancelled").tone).toBe("danger");
    expect(partnerQuoteStatus(undefined).key).toBe("requested");
  });
  it("verdeelt de statussen over de vijf tabs", () => {
    expect(partnerQuoteTab("pending")).toBe("gevraagd");
    expect(partnerQuoteTab("submitted")).toBe("wacht");
    expect(partnerQuoteTab("expired")).toBe("verlopen");
    expect(partnerQuoteTab("selected")).toBe("gekozen");
    expect(partnerQuoteTab("rejected")).toBe("afgerond");
    expect(partnerQuoteTab("declined")).toBe("afgerond");
    expect(PARTNER_QUOTE_TABS.map((t) => t.id)).toEqual(["gevraagd", "wacht", "verlopen", "gekozen", "afgerond"]);
  });
  it("projectstatus van een logiesproject volgt de offerte", () => {
    expect(derivePartnerAccommodationProjectStatus({ status: "pending" }).key).toBe("wacht_op_u");
    expect(derivePartnerAccommodationProjectStatus({ status: "submitted" }).key).toBe("wacht_op_klant");
    expect(derivePartnerAccommodationProjectStatus({ status: "selected" }).key).toBe("bevestigd");
    expect(derivePartnerAccommodationProjectStatus({ status: "selected", invoiced_number: "F-2" }).key).toBe("gefactureerd");
    expect(derivePartnerAccommodationProjectStatus({ status: "cancelled" }).key).toBe("geannuleerd");
    expect(derivePartnerAccommodationProjectStatus({ status: "rejected" }).key).toBe("afgesloten");
  });
});
