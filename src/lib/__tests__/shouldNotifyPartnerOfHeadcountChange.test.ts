import { describe, it, expect } from "vitest";
import { shouldNotifyPartnerOfHeadcountChange } from "../shouldNotifyPartnerOfHeadcountChange";

describe("shouldNotifyPartnerOfHeadcountChange", () => {
  it("returns false when item has no customer approval", () => {
    expect(
      shouldNotifyPartnerOfHeadcountChange({
        status: "confirmed",
        customer_approved_at: null,
        customer_accepted_at: null,
      }),
    ).toBe(false);
  });

  it("returns true when customer_approved_at is set", () => {
    expect(
      shouldNotifyPartnerOfHeadcountChange({
        status: "confirmed",
        customer_approved_at: "2026-08-01T12:00:00Z",
        customer_accepted_at: null,
      }),
    ).toBe(true);
  });

  it("returns true when customer_accepted_at is set", () => {
    expect(
      shouldNotifyPartnerOfHeadcountChange({
        status: "confirmed",
        customer_approved_at: null,
        customer_accepted_at: "2026-08-01T12:00:00Z",
      }),
    ).toBe(true);
  });

  it("returns false for cancelled items even when approved", () => {
    expect(
      shouldNotifyPartnerOfHeadcountChange({
        status: "cancelled",
        customer_approved_at: "2026-08-01T12:00:00Z",
      }),
    ).toBe(false);
  });

  it("returns false for bureau block_type", () => {
    expect(
      shouldNotifyPartnerOfHeadcountChange({
        status: "confirmed",
        customer_approved_at: "2026-08-01T12:00:00Z",
        block_type: "bureau",
      }),
    ).toBe(false);
  });

  it("returns false for bureau-managed provider ids", () => {
    for (const provider_id of ["rederij", "fietsverhuur", "bagagevervoer-vlieland", "bureau"]) {
      expect(
        shouldNotifyPartnerOfHeadcountChange({
          status: "confirmed",
          customer_approved_at: "2026-08-01T12:00:00Z",
          provider_id,
        }),
      ).toBe(false);
    }
  });
});
