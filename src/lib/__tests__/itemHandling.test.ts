import { describe, expect, it } from "vitest";
import {
  billingRouteOf,
  expectsPartnerInvoice,
  isConfirmOnlyItem,
  isInformationalItem,
  partnerBillingNote,
  partnerHandlingOf,
  requiresPartnerQuote,
} from "@/lib/itemHandling";
import { deriveItemDisplayStatus, deriveItemDisplayStatusLoose } from "@/lib/itemStatus";
import { canPartnerInvoiceItem, isAwaitingInvoicingRelease } from "@/lib/partnerInvoicing";
import { derivePartnerProjectStatus } from "@/lib/partnerProjectStatus";
import { buildWerkbankRows } from "@/lib/partnerWerkbank";
import { buildProjectInvoiceSpec } from "@/lib/projectInvoiceSpec";
import type { ProgramRequestItem } from "@/types/programRequest";
import type { PartnerDashboardData } from "@/types/partner";

const ctx = { programPeople: 7, numberOfDays: 3 };

function makeItem(overrides: Record<string, unknown> = {}): ProgramRequestItem {
  return {
    id: "item-1",
    request_id: "req-1",
    status: "pending",
    customer_accepted_at: null,
    customer_approved_at: null,
    block_type: "activity",
    admin_price_override: null,
    admin_price_override_updated_at: null,
    override_people: null,
    quoted_price: null,
    ...overrides,
  } as unknown as ProgramRequestItem;
}

describe("itemHandling: defaults en helpers", () => {
  it("zonder kolommen (oude rijen) is alles een offerte via het bureau", () => {
    expect(partnerHandlingOf({})).toBe("quote");
    expect(billingRouteOf({})).toBe("bureau");
    expect(partnerHandlingOf({ partner_handling: "onzin" })).toBe("quote");
    expect(requiresPartnerQuote({})).toBe(true);
    expect(expectsPartnerInvoice({})).toBe(true);
  });

  it("bevestiging en mededeling vragen geen offerte", () => {
    expect(isConfirmOnlyItem({ partner_handling: "confirm" })).toBe(true);
    expect(isInformationalItem({ partner_handling: "inform" })).toBe(true);
    expect(requiresPartnerQuote({ partner_handling: "confirm" })).toBe(false);
  });

  it("buiten de bureauroute of ter kennisgeving: geen partnerfactuur verwacht", () => {
    expect(expectsPartnerInvoice({ billing_route: "partner_stay_invoice" })).toBe(false);
    expect(expectsPartnerInvoice({ billing_route: "customer_direct" })).toBe(false);
    expect(expectsPartnerInvoice({ partner_handling: "inform" })).toBe(false);
    expect(expectsPartnerInvoice({ partner_handling: "confirm", billing_route: "bureau" })).toBe(true);
  });

  it("facturatienotitie voor de partner alleen bij een afwijkende route", () => {
    expect(partnerBillingNote({})).toBeNull();
    expect(partnerBillingNote({ billing_route: "partner_stay_invoice" })).toMatch(/verblijfsnota/);
    expect(partnerBillingNote({ billing_route: "customer_direct" })).toMatch(/rechtstreeks/);
  });
});

describe("deriveItemDisplayStatus voor onderdelen zonder offertetraject", () => {
  it("bevestiging: pending → bevestiging gevraagd, confirmed → bevestigd, zonder klant-akkoord", () => {
    expect(deriveItemDisplayStatus(makeItem({ partner_handling: "confirm" }), ctx)).toBe("bevestiging_gevraagd");
    expect(deriveItemDisplayStatus(makeItem({ partner_handling: "confirm", status: "confirmed" }), ctx)).toBe("bevestigd");
  });

  it("bevestiging in de offertefase van het project blijft bij de partner, niet bij de klant", () => {
    expect(
      deriveItemDisplayStatus(makeItem({ partner_handling: "confirm" }), { ...ctx, quoteStatus: "offerte_verstuurd", audience: "customer" }),
    ).toBe("bevestiging_gevraagd");
  });

  it("mededeling is ter kennisgeving, ongeacht pending of confirmed", () => {
    expect(deriveItemDisplayStatus(makeItem({ partner_handling: "inform" }), ctx)).toBe("ter_kennisgeving");
    expect(deriveItemDisplayStatus(makeItem({ partner_handling: "inform", status: "confirmed" }), ctx)).toBe("ter_kennisgeving");
  });

  it("na afloop of na executed zijn ze gewoon uitgevoerd, nooit 'afgesloten (automatisch)'", () => {
    expect(deriveItemDisplayStatus(makeItem({ partner_handling: "confirm", status: "executed" }), ctx)).toBe("uitgevoerd");
    expect(deriveItemDisplayStatus(makeItem({ partner_handling: "inform" }), { ...ctx, isPostExecution: true })).toBe("uitgevoerd");
    expect(
      deriveItemDisplayStatus(makeItem({ partner_handling: "confirm", auto_closed_reason: "auto_past_execution" }), ctx),
    ).toBe("bevestiging_gevraagd");
  });

  it("geannuleerd en niet beschikbaar winnen van de afhandeling", () => {
    expect(deriveItemDisplayStatus(makeItem({ partner_handling: "confirm", status: "cancelled" }), ctx)).toBe("geannuleerd");
    expect(deriveItemDisplayStatus(makeItem({ partner_handling: "confirm", status: "unavailable" }), ctx)).toBe("niet_beschikbaar");
  });

  it("een offerte-onderdeel verandert niet", () => {
    expect(deriveItemDisplayStatusLoose({ status: "pending", partner_handling: "quote" })).toBe("wacht_op_partner");
    expect(deriveItemDisplayStatusLoose({ status: "pending", auto_closed_reason: "auto_past_execution" })).toBe("afgesloten_automatisch");
  });
});

describe("facturatie door de partner", () => {
  const released = { terms_accepted_at: "2026-10-01T00:00:00Z", completion_status: "ready_for_invoice" };

  it("op de verblijfsnota of ter kennisgeving kan de partner niets factureren, ook na vrijgave", () => {
    expect(canPartnerInvoiceItem({ status: "executed", billing_route: "partner_stay_invoice" }, released)).toBe(false);
    expect(canPartnerInvoiceItem({ status: "executed", partner_handling: "inform" }, released)).toBe(false);
    expect(isAwaitingInvoicingRelease({ status: "executed", billing_route: "customer_direct" }, { terms_accepted_at: null })).toBe(false);
  });

  it("een bevestiging via het bureau blijft wél factureerbaar", () => {
    expect(canPartnerInvoiceItem({ status: "executed", partner_handling: "confirm", billing_route: "bureau" }, released)).toBe(true);
  });
});

describe("partnerprojectstatus en werkbank", () => {
  it("een onbevestigde bevestiging zet het project op 'u bent aan zet'", () => {
    expect(derivePartnerProjectStatus([{ status: "pending", partner_handling: "confirm" }]).key).toBe("wacht_op_u");
  });

  it("uitgevoerd op de verblijfsnota is afgesloten, niet 'te factureren'", () => {
    expect(derivePartnerProjectStatus([{ status: "executed", partner_handling: "confirm", billing_route: "partner_stay_invoice" }]).key).toBe("afgesloten");
    expect(derivePartnerProjectStatus([{ status: "executed" }]).key).toBe("te_factureren");
  });

  it("werkbank: bevestigen is één regel zonder offerte, mededeling geen regel, geen factuurregel", () => {
    const req = {
      id: "req-1",
      customer_name: "Swagerman",
      customer_company: null,
      selected_dates: ["2026-10-16", "2026-10-17", "2026-10-18"],
      number_of_people: 7,
      status: "accepted",
      reference_number: "BV-2606-0013",
      terms_accepted_at: "2026-10-01T00:00:00Z",
      completion_status: "ready_for_invoice",
      cancelled_at: null,
    };
    const base = { request_id: "req-1", day_index: 0, is_concept: false, invoiced_number: null, program_requests: req };
    const data = {
      items: [
        { ...base, id: "c", block_name: "Diner Bravoure", status: "pending", partner_handling: "confirm", billing_route: "partner_stay_invoice" },
        { ...base, id: "i", block_name: "Groep arriveert", status: "confirmed", partner_handling: "inform" },
        { ...base, id: "x", block_name: "Klaar op verblijfsnota", status: "executed", partner_handling: "confirm", billing_route: "partner_stay_invoice" },
      ],
      accommodationQuotes: [],
    } as unknown as PartnerDashboardData;
    const rows = buildWerkbankRows(data);
    expect(rows.map((r) => [r.id, r.bucket])).toEqual([["c", "review"]]);
    expect(rows[0].hint).toMatch(/geen offerte/);
  });
});

describe("bureaufactuur", () => {
  it("een onderdeel op de verblijfsnota staat niet op de factuur en telt niet als 'prijs volgt'", () => {
    const spec = buildProjectInvoiceSpec({
      request: { number_of_people: 7, selected_dates: ["2026-10-16"], invoicing_mode: "bureau_central", excluded_fees: null },
      items: [
        { id: "a", block_name: "Diner Bravoure", status: "confirmed", day_index: 0, quoted_price: null, billing_route: "partner_stay_invoice" },
        { id: "b", block_name: "Zeehondentocht", status: "confirmed", day_index: 0, quoted_price: null },
      ],
      linesByItem: {},
      settings: {},
      feeStructure: null,
    } as never);
    expect(spec.offInvoiceItems.map((i) => i.id)).toEqual(["a"]);
    expect(spec.unpricedItems.map((i) => i.id)).toEqual(["b"]);
  });
});
