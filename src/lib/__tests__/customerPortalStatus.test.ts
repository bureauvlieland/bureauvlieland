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
});