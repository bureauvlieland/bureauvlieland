import { describe, it, expect } from "vitest";
import {
  describeDistances,
  describeTravel,
  distanceMeters,
  matchFacilities,
  presentQuotePartner,
  presentRoom,
  roomSnapshotFromType,
  VLIELAND_FERRY,
  VLIELAND_VILLAGE,
} from "@/lib/accommodationQuotePresentation";
import type { AccommodationQuote } from "@/types/accommodation";

const baseQuote = (over: Partial<AccommodationQuote> = {}): AccommodationQuote =>
  ({
    id: "q1",
    request_id: "r1",
    partner_id: "p1",
    accommodation_name: "Zeezicht",
    description: null,
    room_configuration: [],
    price_total: 1000,
    price_per_person_per_night: null,
    price_includes_vat: true,
    vat_rate: 9,
    includes: [],
    conditions: null,
    valid_until: "2026-10-01",
    status: "submitted",
    submitted_at: null,
    selected_at: null,
    partner_notes: null,
    quote_attachment_path: null,
    quote_attachment_filename: null,
    quote_external_url: null,
    invoiced_amount: null,
    invoiced_number: null,
    invoiced_date: null,
    invoiced_file_path: null,
    commission_percentage: null,
    commission_amount: null,
    commission_status: null,
    commission_invoiced_at: null,
    created_at: "2026-09-01",
    updated_at: "2026-09-01",
    ...over,
  }) as AccommodationQuote;

describe("ligging: afstand tot boot en dorp", () => {
  it("meet de afstand tussen haven en dorp op ruim een kilometer", () => {
    const m = distanceMeters(VLIELAND_FERRY, VLIELAND_VILLAGE);
    expect(m).toBeGreaterThan(1200);
    expect(m).toBeLessThan(2200);
  });

  it("noemt korte afstanden in minuten lopen en lange in minuten fietsen", () => {
    expect(describeTravel(200)).toBe("3 min lopen");
    expect(describeTravel(1000)).toBe("16 min lopen");
    expect(describeTravel(6000)).toBe("31 min fietsen");
  });

  it("zet een hotel in de Dorpsstraat 'in het dorp'", () => {
    const d = describeDistances({ lat: 53.2964885, lng: 5.0738096 });
    expect(d).not.toBeNull();
    expect(d!.summary).toMatch(/min lopen van de boot · in het dorp$/);
  });

  it("geeft niets terug zonder coördinaten of voor partners op de wal", () => {
    expect(describeDistances(null)).toBeNull();
    expect(describeDistances({ lat: 53.175462, lng: 5.410702 })).toBeNull(); // Harlingen
  });
});

describe("faciliteiten vergelijken met de wensen", () => {
  it("is onbekend als de partner niets heeft ingevuld", () => {
    const m = matchFacilities(["wifi"], []);
    expect(m.unknown).toBe(true);
    expect(m.matched).toEqual([]);
  });

  it("splitst in aanwezig, ontbrekend en overig, met Nederlandse labels", () => {
    const m = matchFacilities(["wifi", "wellness"], ["wifi", "parking"]);
    expect(m.unknown).toBe(false);
    expect(m.matched).toEqual(["WiFi"]);
    expect(m.missing).toEqual(["Wellness/Sauna"]);
    expect(m.extra).toEqual(["Parkeren"]);
  });

  it("verdraagt een ontbrekende of vreemde wensenlijst", () => {
    expect(matchFacilities(null, ["wifi"]).extra).toEqual(["WiFi"]);
    expect(matchFacilities("wifi", ["wifi"]).matched).toEqual([]);
  });
});

describe("kamers uit een kamertype", () => {
  it("bewaart een momentopname van het kamertype in de offerteregel", () => {
    const snap = roomSnapshotFromType({
      id: "rt1",
      name: "Zeezichtkamer",
      description: "Met balkon",
      price_per_night: 120,
      max_occupancy: 2,
      bed_configuration: "double",
      size_sqm: 24,
      facilities: ["wifi", "sea_view"],
      images: [{ url: "https://x/a.jpg" }, { url: "" }, null],
    });
    expect(snap.room_type_id).toBe("rt1");
    expect(snap.type).toBe("Zeezichtkamer");
    expect(snap.count).toBe(1);
    expect(snap.images).toEqual([{ url: "https://x/a.jpg" }]);
    expect(snap.facilities).toEqual(["wifi", "sea_view"]);
  });

  it("presenteert een handmatige kamer zonder details", () => {
    const room = presentRoom({ type: "Tweepersoonskamer", count: 3, price_per_night: 0, occupancy: 2 });
    expect(room.hasDetails).toBe(false);
    expect(room.pricePerNight).toBeNull();
    expect(room.name).toBe("Tweepersoonskamer");
  });

  it("vertaalt faciliteiten en bedden van een gekoppelde kamer", () => {
    const room = presentRoom({
      type: "Suite", count: 1, price_per_night: 200, occupancy: 2,
      room_type_id: "rt1", facilities: ["sea_view", "onbekend"], bed_configuration: "double", size_sqm: 30,
    });
    expect(room.hasDetails).toBe(true);
    expect(room.facilityLabels).toEqual(["Zeezicht", "onbekend"]);
    expect(room.bedLabel).toBeTruthy();
    expect(room.sizeSqm).toBe(30);
  });
});

describe("foto's bij de offerte", () => {
  const partner = { id: "p1", name: "Zeezicht", email: "x@y.nl", gallery_images: [{ url: "https://x/galerij.jpg" }], facilities: ["wifi"], check_in_time: "15:00" };

  it("gebruikt de galerij van de partner als de offerte geen eigen foto's heeft", () => {
    const p = presentQuotePartner(baseQuote({ partner, images: [] }));
    expect(p.images.map((i) => i.url)).toEqual(["https://x/galerij.jpg"]);
    expect(p.facilities).toEqual(["wifi"]);
    expect(p.checkInTime).toBe("15:00");
    expect(p.checkOutTime).toBeNull();
  });

  it("laat eigen foto's van de offerte voorgaan", () => {
    const p = presentQuotePartner(baseQuote({ partner, images: [{ url: "https://x/huisje.jpg" }] }));
    expect(p.images.map((i) => i.url)).toEqual(["https://x/huisje.jpg"]);
  });
});
