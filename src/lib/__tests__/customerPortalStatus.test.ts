import { describe, expect, it } from "vitest";
import { getCustomerPortalStatus } from "@/lib/customerPortalStatus";
import type { ProgramRequestItem } from "@/types/programRequest";

const item = (overrides: Partial<ProgramRequestItem>): ProgramRequestItem => ({
  id: overrides.id ?? "item-1",
  request_id: "req-1",
  block_id: null,
  block_name: "Activiteit",
  block_category: "activity",
  provider_name: "Partner",
  provider_id: "partner-1",
  provider_email: null,
  block_type: "partner",
  price_indication: null,
  duration: null,
  day_index: 0,
  preferred_time: null,
  customer_notes: null,
  status: "pending",
  status_note: null,
  status_updated_at: null,
  status_updated_by: null,
  created_at: "2026-06-01T10:00:00Z",
  updated_at: "2026-06-01T10:00:00Z",
  quoted_price: null,
  quoted_notes: null,
  item_quote_status: null,
  customer_approved_at: null,
  customer_accepted_at: null,
  customer_counter_time: null,
  customer_counter_note: null,
  customer_counter_at: null,
  skip_partner_notification: false,
  pending_added: false,
  awaiting_customer_for_partner_send: false,
  ...overrides,
} as ProgramRequestItem);

describe("getCustomerPortalStatus", () => {
  it("onderdrukt alle klant-goedkeuracties zodra project klaar is voor facturatie", () => {
    const status = getCustomerPortalStatus({
      program: {
        quote_status: "akkoord_ontvangen",
        completion_status: "ready_for_invoice",
        selected_dates: ["2026-12-01"],
      },
      selectedDates: [new Date("2026-12-01T00:00:00Z")],
      items: [
        item({
          status: "alternative",
          customer_approved_at: "2026-06-29T05:14:43Z",
          customer_accepted_at: "2026-06-29T05:14:43Z",
          status_updated_at: "2026-06-24T07:18:20Z",
        }),
      ],
    });

    expect(status.isPostExecution).toBe(true);
    expect(status.customerActionsCount).toBe(0);
    expect(status.customerApprovedCount).toBe(status.customerApprovableTotal);
    expect(status.showApprovalActions).toBe(false);
    expect(status.showPartnerWaiting).toBe(false);
    expect(status.allConfirmed).toBe(true);
  });

  it("laat facturatie als primaire open actie staan na uitvoering", () => {
    const status = getCustomerPortalStatus({
      program: {
        quote_status: "akkoord_ontvangen",
        completion_status: "ready_for_invoice",
        selected_dates: ["2026-07-01"],
      },
      selectedDates: [new Date("2026-07-01T00:00:00Z")],
      items: [item({ status: "confirmed" })],
    });

    expect(status.isPostExecution).toBe(true);
    expect(status.billingComplete).toBe(false);
    expect(status.termsAccepted).toBe(false);
    expect(status.customerActionsCount).toBe(0);
  });

  it("houdt goedkeuracties zichtbaar voor een toekomstig verstuurd voorstel", () => {
    const status = getCustomerPortalStatus({
      program: {
        quote_status: "offerte_verstuurd",
        selected_dates: ["2026-12-01"],
      },
      selectedDates: [new Date("2026-12-01T00:00:00Z")],
      items: [item({ status: "pending" }), item({ id: "item-2", status: "confirmed" })],
    });

    expect(status.isPostExecution).toBe(false);
    expect(status.customerActionsCount).toBe(2);
    expect(status.showApprovalActions).toBe(true);
  });

  it("houdt partner-reacties vóór uitvoering zichtbaar als klantactie", () => {
    const status = getCustomerPortalStatus({
      program: {
        quote_status: "akkoord_ontvangen",
        selected_dates: ["2026-12-01"],
      },
      selectedDates: [new Date("2026-12-01T00:00:00Z")],
      items: [item({ status: "confirmed", quoted_price: 125 })],
    });

    expect(status.isPostExecution).toBe(false);
    expect(status.customerActionsCount).toBe(1);
    expect(status.showApprovalActions).toBe(true);
  });

  it("telt bureau-eigen onderdelen niet als 'nog niet bevestigd'", () => {
    const status = getCustomerPortalStatus({
      program: {
        quote_status: "akkoord_ontvangen",
        selected_dates: ["2026-12-01"],
      },
      selectedDates: [new Date("2026-12-01T00:00:00Z")],
      items: [
        item({ id: "item-1", status: "pending", provider_id: "bureau", block_type: "bureau", block_category: "vervoer", block_name: "Overtocht Harlingen → Vlieland", customer_approved_at: "2026-06-29T10:00:00Z", customer_accepted_at: "2026-06-29T10:00:00Z" }),
        item({ id: "item-2", status: "pending", provider_id: "bureau", block_type: "bureau", block_category: "vervoer", block_name: "Fietsuur (E-bike)", customer_approved_at: "2026-06-29T10:00:00Z", customer_accepted_at: "2026-06-29T10:00:00Z" }),
        item({ id: "item-3", status: "pending", provider_id: "zeehondentochten", block_name: "Zeehondentocht Exclusief", customer_approved_at: "2026-06-29T10:00:00Z", customer_accepted_at: "2026-06-29T10:00:00Z" }),
      ],
    });

    expect(status.unconfirmedItems).toHaveLength(1);
    expect(status.unconfirmedItems[0].block_name).toBe("Zeehondentocht Exclusief");
    expect(status.allConfirmed).toBe(false);
    expect(status.canAcceptUnderReservation).toBe(true);
  });
});
describe("goedkeuring geldt de activiteit zelf (geen herbevestiging bij wijzigingen)", () => {
  const program = {
    quote_status: "akkoord_ontvangen",
    completion_status: null,
    selected_dates: ["2026-12-01"],
  };

  it("een partner-alternatief na het klantakkoord vraagt géén nieuwe goedkeuring", () => {
    const status = getCustomerPortalStatus({
      program,
      selectedDates: [new Date("2026-12-01T00:00:00Z")],
      items: [
        item({
          id: "item-1",
          status: "alternative",
          customer_approved_at: "2026-06-01T10:00:00Z",
          customer_accepted_at: "2026-06-01T10:00:00Z",
          // Partner reageerde later: mag het akkoord niet laten verlopen.
          status_updated_at: "2026-07-15T10:00:00Z",
        }),
      ],
    });

    expect(status.customerActionsCount).toBe(0);
    expect(status.alternativeActionsCount).toBe(0);
    expect(status.customerApprovedCount).toBe(1);
  });

  it("een nieuw onderdeel zonder akkoord blijft wél een actiepunt", () => {
    const status = getCustomerPortalStatus({
      program,
      selectedDates: [new Date("2026-12-01T00:00:00Z")],
      items: [
        item({ id: "item-1", customer_approved_at: "2026-06-01T10:00:00Z", customer_accepted_at: "2026-06-01T10:00:00Z" }),
        item({ id: "item-2", block_name: "Nieuw onderdeel" }),
      ],
    });

    expect(status.customerActionsCount).toBe(1);
    expect(status.newItemActionsCount).toBe(1);
    expect(status.customerApprovedCount).toBe(1);
    expect(status.customerApprovableTotal).toBe(2);
  });

  it("losse facturabele kosten (day_index -1) zijn geen goed te keuren onderdeel", () => {
    const status = getCustomerPortalStatus({
      program,
      selectedDates: [new Date("2026-12-01T00:00:00Z")],
      items: [
        item({ id: "item-1", status: "confirmed", item_quote_status: "bevestigd", customer_approved_at: "2026-06-01T10:00:00Z", customer_accepted_at: "2026-06-01T10:00:00Z" }),
        item({ id: "kosten-1", block_name: "Begeleiding Erwin - 4 uur", day_index: -1, block_type: "bureau", provider_id: "bureau" }),
      ],
    });

    expect(status.customerActionsCount).toBe(0);
    expect(status.newItemActionsCount).toBe(0);
    expect(status.customerApprovableTotal).toBe(1);
    expect(status.unconfirmedItems.map((i) => i.id)).not.toContain("kosten-1");
    expect(status.allConfirmed).toBe(true);
  });
});

describe("canSignNow: tekenen bij akkoord (plan klantreis en ondertekening, fase 4)", () => {
  const future = [new Date(Date.now() + 40 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)];
  const inFuture = (d: number) => new Date(Date.now() + d * 24 * 60 * 60 * 1000).toISOString();

  it("vanaf het verstuurde voorstel kan de klant akkoord geven en tekenen in één stap", () => {
    const s = getCustomerPortalStatus({
      program: { quote_status: "offerte_verstuurd", quote_valid_until: inFuture(10), selected_dates: future },
      items: [item({ status: "pending", item_quote_status: "offerte_verstuurd" })],
    });
    expect(s.canSignNow).toBe(true);
    expect(s.signingIncludesProposal).toBe(true);
    expect(s.proposalExpired).toBe(false);
  });

  it("een verlopen voorstel kan niet meer getekend worden", () => {
    const s = getCustomerPortalStatus({
      program: { quote_status: "offerte_verstuurd", quote_valid_until: inFuture(-1), selected_dates: future },
      items: [item({ status: "pending" })],
    });
    expect(s.proposalExpired).toBe(true);
    expect(s.canSignNow).toBe(false);
  });

  it("na het akkoord kan de klant tekenen zonder op de aanbieders te wachten", () => {
    const s = getCustomerPortalStatus({
      program: { quote_status: "akkoord_ontvangen", selected_dates: future },
      items: [
        item({ id: "a", status: "pending", customer_approved_at: "2026-06-02T10:00:00Z", customer_accepted_at: "2026-06-02T10:00:00Z" }),
        item({ id: "b", status: "confirmed", customer_approved_at: "2026-06-02T10:00:00Z", customer_accepted_at: "2026-06-02T10:00:00Z" }),
      ],
    });
    expect(s.allConfirmed).toBe(false);
    expect(s.canSignNow).toBe(true);
    expect(s.signingIncludesProposal).toBe(false);
  });

  it("maar niet zolang er een partnervoorstel op de klant wacht", () => {
    const s = getCustomerPortalStatus({
      program: { quote_status: "akkoord_ontvangen", selected_dates: future },
      items: [item({ status: "alternative", customer_approved_at: null })],
    });
    expect(s.customerActionsCount).toBeGreaterThan(0);
    expect(s.canSignNow).toBe(false);
  });

  it("niet als er al getekend is, en niet in de voorbereiding", () => {
    expect(
      getCustomerPortalStatus({
        program: { quote_status: "akkoord_ontvangen", terms_accepted_at: "2026-06-03T10:00:00Z", selected_dates: future },
        items: [item({ status: "confirmed" })],
      }).canSignNow,
    ).toBe(false);
    expect(
      getCustomerPortalStatus({ program: { quote_status: "concept", selected_dates: future }, items: [item({ status: "pending" })] }).canSignNow,
    ).toBe(false);
  });
});
