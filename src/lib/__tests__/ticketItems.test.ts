import { describe, it, expect } from "vitest";
import {
  isTicketItem,
  getTicketKind,
  getTicketKindLabel,
  getTicketDate,
  getTicketStatus,
  getTicketStatusLabel,
  isExpiredTicketDate,
  isOpenTicketRow,
  todayIso,
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

  describe("verlopen tickets (reisdatum voorbij zonder boeking)", () => {
    const today = "2026-11-16";
    const unbooked = { booking_reference: null, booking_document_path: null };

    it("isExpiredTicketDate: alleen datums vóór vandaag", () => {
      expect(isExpiredTicketDate("2026-11-15", today)).toBe(true);
      expect(isExpiredTicketDate("2026-11-16", today)).toBe(false);
      expect(isExpiredTicketDate("2026-11-17", today)).toBe(false);
      expect(isExpiredTicketDate(null, today)).toBe(false);
      expect(isExpiredTicketDate(undefined, today)).toBe(false);
    });

    it("onbeboekt ticket in het verleden is 'expired', vandaag/toekomst 'open'", () => {
      expect(getTicketStatus(unbooked, "2026-04-09", today)).toBe("expired");
      expect(getTicketStatus(unbooked, "2026-11-16", today)).toBe("open");
      expect(getTicketStatus(unbooked, "2027-01-01", today)).toBe("open");
      expect(getTicketStatus(unbooked, null, today)).toBe("open");
    });

    it("een geboekt ticket in het verleden blijft 'booked'", () => {
      expect(getTicketStatus({ booking_reference: "R1", booking_document_path: null }, "2026-04-09", today)).toBe("booked");
    });

    it("zonder reisdatum verandert het oude gedrag niet", () => {
      expect(getTicketStatus(unbooked)).toBe("open");
    });

    it("getTicketStatusLabel", () => {
      expect(getTicketStatusLabel("open")).toBe("Open");
      expect(getTicketStatusLabel("booked")).toBe("Geboekt");
      expect(getTicketStatusLabel("expired")).toBe("Verlopen");
    });

    it("todayIso gebruikt de lokale datum", () => {
      expect(todayIso(new Date(2026, 10, 16, 23, 30))).toBe("2026-11-16");
      expect(todayIso(new Date(2026, 0, 5, 0, 10))).toBe("2026-01-05");
    });
  });
});

describe("isOpenTicketRow (badge == pagina)", () => {
  const base = {
    block_id: "boot-retour",
    status: "confirmed",
    booking_reference: null,
    booking_document_path: null,
    customer_approved_at: "2026-07-01T00:00:00Z",
    request_status: "in_afstemming",
  };

  it("telt een klant-goedgekeurd, onbeboekt ticket in een actief project", () => {
    expect(isOpenTicketRow(base)).toBe(true);
  });

  it("telt niet-goedgekeurde items niet mee", () => {
    expect(isOpenTicketRow({ ...base, customer_approved_at: null })).toBe(false);
  });

  it("telt items in geannuleerde/verwijderde projecten niet mee", () => {
    expect(isOpenTicketRow({ ...base, request_status: "cancelled" })).toBe(false);
    expect(isOpenTicketRow({ ...base, request_status: "deleted" })).toBe(false);
  });

  it("telt al geboekte items niet mee", () => {
    expect(isOpenTicketRow({ ...base, booking_reference: "R123" })).toBe(false);
    expect(isOpenTicketRow({ ...base, booking_document_path: "x.pdf" })).toBe(false);
  });

  it("telt geannuleerde onderdelen niet mee", () => {
    expect(isOpenTicketRow({ ...base, status: "cancelled" })).toBe(false);
  });

  it("negeert niet-ticket blokken", () => {
    expect(isOpenTicketRow({ ...base, block_id: "diner-zeezicht" })).toBe(false);
  });

  it("telt een onbeboekt ticket met reisdatum in het verleden niet mee (verlopen)", () => {
    const today = "2026-11-16";
    expect(isOpenTicketRow({ ...base, ticketDate: "2026-11-15" }, today)).toBe(false);
    expect(isOpenTicketRow({ ...base, ticketDate: "2026-11-16" }, today)).toBe(true);
    expect(isOpenTicketRow({ ...base, ticketDate: "2026-12-01" }, today)).toBe(true);
  });

  it("zonder bekende reisdatum blijft het ticket open", () => {
    expect(isOpenTicketRow({ ...base, ticketDate: null }, "2026-11-16")).toBe(true);
    expect(isOpenTicketRow(base)).toBe(true);
  });

  it("herkent e-bike verhuur als fietshuur-ticket", () => {
    expect(isOpenTicketRow({ ...base, block_id: "fiets-huur-kopie-2" })).toBe(true);
    expect(getTicketKind({ block_id: "fiets-huur-kopie-2" })).toBe("bike");
  });
});
