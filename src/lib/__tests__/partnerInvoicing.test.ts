import { describe, it, expect } from "vitest";
import {
  canPartnerInvoiceItem,
  isAwaitingInvoicingRelease,
  isPartnerInvoicingReleased,
} from "@/lib/partnerInvoicing";

const unsigned = { terms_accepted_at: null, completion_status: "in_progress" };
const signed = { terms_accepted_at: "2026-09-01T10:00:00Z", completion_status: "ready_for_invoice" };
const releasedByBureau = { terms_accepted_at: null, completion_status: "ready_for_invoice" };

describe("isPartnerInvoicingReleased", () => {
  it("is vrij als de klant de voorwaarden accepteerde", () => {
    expect(isPartnerInvoicingReleased({ terms_accepted_at: "2026-09-01", completion_status: "in_progress" })).toBe(true);
  });
  it("is vrij als het bureau het project op facturatie zette", () => {
    expect(isPartnerInvoicingReleased(releasedByBureau)).toBe(true);
    expect(isPartnerInvoicingReleased({ terms_accepted_at: null, completion_status: "partially_invoiced" })).toBe(true);
  });
  it("is geblokkeerd zonder handtekening en zonder vrijgave", () => {
    expect(isPartnerInvoicingReleased(unsigned)).toBe(false);
    expect(isPartnerInvoicingReleased({ terms_accepted_at: null, completion_status: null })).toBe(false);
  });
});

describe("canPartnerInvoiceItem", () => {
  const executed = { status: "executed", invoiced_number: null };
  const confirmedNoAccept = { status: "confirmed", invoiced_number: null };
  const confirmedAccepted = { status: "confirmed", invoiced_number: null, customer_accepted_at: "2026-08-01" };

  it("klant niet getekend, niet vrijgegeven → wacht", () => {
    expect(canPartnerInvoiceItem(executed, unsigned)).toBe(false);
    expect(isAwaitingInvoicingRelease(executed, unsigned)).toBe(true);
  });

  it("klant niet getekend, bureau gaf vrij → uitgevoerd onderdeel factureerbaar", () => {
    expect(canPartnerInvoiceItem(executed, releasedByBureau)).toBe(true);
    expect(isAwaitingInvoicingRelease(executed, releasedByBureau)).toBe(false);
  });

  it("automatisch afgesloten (bevestigd zonder klantakkoord) → factureerbaar na vrijgave", () => {
    expect(canPartnerInvoiceItem(confirmedNoAccept, releasedByBureau)).toBe(true);
    expect(canPartnerInvoiceItem(confirmedNoAccept, signed)).toBe(true);
  });

  it("bevestigd zonder klantakkoord vóór vrijgave → niet factureerbaar", () => {
    expect(canPartnerInvoiceItem(confirmedNoAccept, { terms_accepted_at: "2026-09-01", completion_status: "in_progress" })).toBe(false);
    expect(isAwaitingInvoicingRelease(confirmedNoAccept, unsigned)).toBe(false);
  });

  it("bevestigd met klantakkoord + getekend → factureerbaar", () => {
    expect(canPartnerInvoiceItem(confirmedAccepted, { terms_accepted_at: "2026-09-01", completion_status: "in_progress" })).toBe(true);
  });

  it("al gefactureerd, geannuleerd of pending → nooit", () => {
    expect(canPartnerInvoiceItem({ status: "executed", invoiced_number: "F-1" }, signed)).toBe(false);
    expect(canPartnerInvoiceItem({ status: "cancelled", invoiced_number: null }, signed)).toBe(false);
    expect(canPartnerInvoiceItem({ status: "pending", invoiced_number: null }, releasedByBureau)).toBe(false);
  });
});
