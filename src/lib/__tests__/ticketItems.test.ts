import { describe, it, expect } from "vitest";
import {
  isTicketItem,
  getTicketKind,
  getTicketKindLabel,
  getTicketDate,
  getTicketStatus,
  FERRY_BLOCK_IDS,
  BIKE_BLOCK_IDS,
} from "@/lib/ticketItems";

describe("ticketItems", () => {
  it("isTicketItem true voor ferry block_ids", () => {
    for (const id of FERRY_BLOCK_IDS) {
      expect(isTicketItem({ block_id: id })).toBe(true);
    }
  });

  it("isTicketItem true voor bike block_ids", () => {
    for (const id of BIKE_BLOCK_IDS) {
      expect(isTicketItem({ block_id: id })).toBe(true);
    }
  });

  it("isTicketItem false voor andere block_ids", () => {
    expect(isTicketItem({ block_id: "zeehondentocht" })).toBe(false);
    expect(isTicketItem({ block_id: null })).toBe(false);
  });

  it("getTicketKind herkent ferry", () => {
    expect(getTicketKind({ block_id: "boot-retour" })).toBe("ferry");
  });

  it("getTicketKind herkent bike", () => {
    expect(getTicketKind({ block_id: "fiets-huur" })).toBe("bike");
  });

  it("getTicketKindLabel", () => {
    expect(getTicketKindLabel("ferry")).toBe("Overtocht");
    expect(getTicketKindLabel("bike")).toBe("Fietshuur");
    expect(getTicketKindLabel(null)).toBe("Ticket");
  });

  it("getTicketDate gebruikt day_index", () => {
    const dates = ["2026-07-01", "2026-07-02", "2026-07-03"];
    expect(getTicketDate({ day_index: 0, block_id: "boot-retour" }, dates)).toBe("2026-07-01");
    expect(getTicketDate({ day_index: 2, block_id: "boot-retour" }, dates)).toBe("2026-07-03");
  });

  it("getTicketDate valt terug op eerste datum bij out-of-range", () => {
    expect(getTicketDate({ day_index: 5, block_id: "boot-retour" }, ["2026-07-01", "2026-07-02"])).toBe("2026-07-01");
    expect(getTicketDate({ day_index: -1, block_id: "boot-retour" }, ["2026-07-01"])).toBe("2026-07-01");
  });

  it("getTicketDate geeft null zonder datums", () => {
    expect(getTicketDate({ day_index: 0, block_id: "boot-retour" }, null)).toBeNull();
    expect(getTicketDate({ day_index: 0, block_id: "boot-retour" }, [])).toBeNull();
  });

  it("getTicketStatus", () => {
    expect(getTicketStatus({ booking_reference: "ABC", booking_document_path: null })).toBe("booked");
    expect(getTicketStatus({ booking_reference: null, booking_document_path: "/x.pdf" })).toBe("booked");
    expect(getTicketStatus({ booking_reference: null, booking_document_path: null })).toBe("open");
  });
});
