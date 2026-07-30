import { describe, it, expect } from "vitest";
import {
  itemWasSentToPartner,
  filterItemsSentToPartner,
  approachedPartnerIds,
} from "../partnerWasApproached";

describe("partnerWasApproached", () => {
  it("beschouwt een item met skip_partner_notification=true als niet-benaderd", () => {
    expect(itemWasSentToPartner({ skip_partner_notification: true })).toBe(false);
  });

  it("beschouwt skip_partner_notification=false als verstuurd", () => {
    expect(itemWasSentToPartner({ skip_partner_notification: false })).toBe(true);
  });

  it("beschouwt een geoffreerd item als benaderd, ook bij skip=true", () => {
    expect(
      itemWasSentToPartner({ skip_partner_notification: true, quoted_at: "2026-01-01T10:00:00Z" }),
    ).toBe(true);
  });

  it("beschouwt prijswijziging-acknowledge als benaderd", () => {
    expect(
      itemWasSentToPartner({
        skip_partner_notification: true,
        partner_price_change_acknowledged_at: "2026-01-01T10:00:00Z",
      }),
    ).toBe(true);
  });

  it("beschouwt een item zonder signalen als niet-benaderd", () => {
    expect(itemWasSentToPartner({})).toBe(false);
    expect(itemWasSentToPartner({ skip_partner_notification: null, quoted_at: null })).toBe(false);
  });

  it("filtert items op benaderd", () => {
    const items = [
      { id: "a", skip_partner_notification: true },
      { id: "b", skip_partner_notification: false },
      { id: "c", skip_partner_notification: true, quoted_at: "2026-01-01" },
    ];
    expect(filterItemsSentToPartner(items).map((i) => i.id)).toEqual(["b", "c"]);
  });

  it("levert alleen partner-ids van benaderde partners", () => {
    const ids = approachedPartnerIds([
      { provider_id: "oliva", skip_partner_notification: true },
      { provider_id: "neptunus", skip_partner_notification: false },
      { provider_id: null, skip_partner_notification: false },
    ]);
    expect([...ids]).toEqual(["neptunus"]);
  });

  it("geeft een lege set bij een volledig onverstuurd project (offerte-fase)", () => {
    const ids = approachedPartnerIds([
      { provider_id: "oliva", skip_partner_notification: true },
      { provider_id: "neptunus", skip_partner_notification: true },
    ]);
    expect(ids.size).toBe(0);
  });
});
