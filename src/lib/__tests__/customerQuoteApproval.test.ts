import { describe, it, expect } from "vitest";
import {
  isQuoteItemAwaitingCustomerApproval,
  hasQuoteItemsAwaitingCustomerApproval,
} from "@/lib/customerQuoteApproval";

describe("customerQuoteApproval", () => {
  it("pending item zonder akkoord wacht op klant", () => {
    expect(isQuoteItemAwaitingCustomerApproval({ status: "pending", customer_approved_at: null, block_type: null }))
      .toBe(true);
  });

  it("geannuleerd item wacht niet", () => {
    expect(isQuoteItemAwaitingCustomerApproval({ status: "cancelled", customer_approved_at: null, block_type: null }))
      .toBe(false);
  });

  it("self_arranged item wacht niet", () => {
    expect(isQuoteItemAwaitingCustomerApproval({ status: "pending", customer_approved_at: null, block_type: "self_arranged" }))
      .toBe(false);
  });

  it("item met customer_approved_at wacht niet", () => {
    expect(
      isQuoteItemAwaitingCustomerApproval({
        status: "pending",
        customer_approved_at: "2026-07-01T10:00:00Z",
        block_type: null,
      }),
    ).toBe(false);
  });

  it("hasQuoteItemsAwaitingCustomerApproval detecteert minstens één wachtend item", () => {
    expect(
      hasQuoteItemsAwaitingCustomerApproval([
        { status: "pending", customer_approved_at: null, block_type: null } as any,
        { status: "confirmed", customer_approved_at: "2026-07-01T10:00:00Z", block_type: null } as any,
      ]),
    ).toBe(true);
  });

  it("hasQuoteItemsAwaitingCustomerApproval false als alles akkoord", () => {
    expect(
      hasQuoteItemsAwaitingCustomerApproval([
        { status: "confirmed", customer_approved_at: "2026-07-01T10:00:00Z", block_type: null } as any,
      ]),
    ).toBe(false);
  });
});
