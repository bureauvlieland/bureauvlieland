import { describe, it, expect } from "vitest";
import {
  buildAccommodationThreadKey,
  buildAccommodationThreadInsert,
  pickAccommodationThread,
} from "@/lib/accommodationChatThread";

describe("accommodation chat thread key", () => {
  it("keys on partner + accommodation request, not on quote", () => {
    const key = buildAccommodationThreadKey({ partnerId: "p1", accommodationId: "a1" });
    expect(key).toEqual({
      source: "partner_portal",
      source_partner_id: "p1",
      accommodation_id: "a1",
    });
    expect(Object.keys(key)).not.toContain("quote_id");
  });

  it("admin and partner derive the same lookup key for one request", () => {
    const fromAdmin = buildAccommodationThreadKey({ partnerId: "p1", accommodationId: "a1" });
    const fromPartner = buildAccommodationThreadKey({ partnerId: "p1", accommodationId: "a1" });
    expect(fromAdmin).toEqual(fromPartner);
  });

  it("reuses an existing partner-started thread without quote_id", () => {
    // Partner startte de thread (quote_id leeg) — admin moet die overnemen.
    const existing = [{ id: "c1", status: "active", created_at: "2026-08-01T10:00:00Z" }];
    expect(pickAccommodationThread(existing)).toBe("c1");
  });

  it("picks the newest open thread and ignores closed ones", () => {
    const rows = [
      { id: "old", status: "active", created_at: "2026-07-01T10:00:00Z" },
      { id: "closed", status: "closed", created_at: "2026-08-02T10:00:00Z" },
      { id: "new", status: "active", created_at: "2026-08-01T10:00:00Z" },
    ];
    expect(pickAccommodationThread(rows)).toBe("new");
  });

  it("returns null when there is nothing to reuse", () => {
    expect(pickAccommodationThread([])).toBeNull();
    expect(pickAccommodationThread(null)).toBeNull();
    expect(pickAccommodationThread([{ id: "c", status: "closed" }])).toBeNull();
  });

  it("stores quote_id as context on insert but keeps the key intact", () => {
    const payload = buildAccommodationThreadInsert({
      partnerId: "p1",
      accommodationId: "a1",
      partnerName: "Badhotel Bruin",
      partnerEmail: "receptie@badhotelbruin.com",
      quoteId: "q9",
    });
    expect(payload.source_partner_id).toBe("p1");
    expect(payload.accommodation_id).toBe("a1");
    expect(payload.quote_id).toBe("q9");
    expect(payload.status).toBe("active");
  });

  it("allows a thread without a quote (admin messaging before any quote)", () => {
    const payload = buildAccommodationThreadInsert({
      partnerId: "p1",
      accommodationId: "a1",
      partnerName: "Partner",
      partnerEmail: "p@x.nl",
    });
    expect(payload.quote_id).toBeNull();
  });
});
