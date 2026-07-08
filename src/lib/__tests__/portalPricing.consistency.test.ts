import { describe, it, expect } from "vitest";
import {
  getDisplayUnitPrice,
  getDisplayLineTotal,
  getEffectivePeople,
  getItemLineTotal,
  hasOpenAdminPriceChange,
} from "../portalPricing";

describe("portalPricing consistency", () => {
  const baseItem = {
    quoted_price: null as number | null,
    admin_price_override: null as number | null,
    price_type: "per_person" as string | null,
    override_people: null as number | null,
  };

  it("per_person item: unit × people === group total (admin override)", () => {
    const item = { ...baseItem, admin_price_override: 25, price_type: "per_person" };
    expect(getDisplayUnitPrice(item, 12)).toBe(25);
    expect(getDisplayLineTotal(item, 12)).toBe(300);
  });

  it("per_person_per_day: unit × people × days === group total", () => {
    const item = { ...baseItem, admin_price_override: 10, price_type: "per_person_per_day" };
    expect(getDisplayLineTotal(item, 8, 3)).toBe(240);
  });

  it("quoted_price wint altijd van admin_price_override", () => {
    const item = { ...baseItem, quoted_price: 500, admin_price_override: 999, price_type: "per_person" };
    expect(getDisplayLineTotal(item, 10)).toBe(500);
  });

  it("override_people overschrijft programPeople voor unit én totaal (Trattoria-case)", () => {
    const item = { ...baseItem, admin_price_override: 44.5, price_type: "per_person", override_people: 12 };
    expect(getEffectivePeople(item, 18)).toBe(12);
    expect(getDisplayLineTotal(item, 18)).toBe(44.5 * 12);
  });

  it("quoted_price + override_people: unit price = quoted_price ÷ override_people", () => {
    const item = { ...baseItem, quoted_price: 534, price_type: "per_person", override_people: 12 };
    expect(getDisplayUnitPrice(item, 18)).toBe(534 / 12);
    expect(getDisplayLineTotal(item, 18)).toBe(534);
  });

  it("getItemLineTotal en getDisplayLineTotal produceren identieke totalen", () => {
    const item: any = {
      id: "x",
      request_id: "r",
      block_id: null,
      block_name: "t",
      block_category: "c",
      provider_name: "p",
      provider_id: "pp",
      provider_email: null,
      block_type: "activity",
      price_indication: null,
      duration: null,
      day_index: 0,
      preferred_time: null,
      customer_notes: null,
      status: "pending",
      status_note: null,
      status_updated_at: null,
      status_updated_by: null,
      version: 1,
      created_at: "",
      updated_at: "",
      executed_at: null,
      customer_accepted_at: null,
      customer_counter_time: null,
      customer_counter_note: null,
      customer_counter_at: null,
      confirmed_time: null,
      quoted_price: null,
      quoted_at: null,
      quoted_notes: null,
      proposed_time: null,
      proposed_date: null,
      image_url: null,
      image_asset: null,
      customer_approved_at: null,
      item_quote_status: null,
      admin_price_override: 30,
      admin_price_notes: null,
      skip_partner_notification: false,
      price_type: "per_person",
      external_url: null,
      override_people: null,
    };
    expect(getItemLineTotal(item, 10)).toBe(getDisplayLineTotal(item, 10));
  });

  it("hasOpenAdminPriceChange — false zonder override", () => {
    expect(
      hasOpenAdminPriceChange({ admin_price_override: null, admin_price_override_updated_at: null }),
    ).toBe(false);
  });

  it("hasOpenAdminPriceChange — true wanneer override nieuwer is dan ack", () => {
    expect(
      hasOpenAdminPriceChange({
        admin_price_override: 25,
        admin_price_override_updated_at: "2026-05-01T12:00:00Z",
        partner_price_change_acknowledged_at: "2026-04-30T10:00:00Z",
      }),
    ).toBe(true);
  });

  it("hasOpenAdminPriceChange — false na recente ack", () => {
    expect(
      hasOpenAdminPriceChange({
        admin_price_override: 25,
        admin_price_override_updated_at: "2026-05-01T12:00:00Z",
        partner_price_change_acknowledged_at: "2026-05-02T10:00:00Z",
      }),
    ).toBe(false);
  });

  it("Partner accepteert nieuwe admin-prijs → quoted_price = admin-totaal en banner sluit", () => {
    const before = {
      quoted_price: 200,
      admin_price_override: 25,
      price_type: "per_person" as const,
      override_people: null,
      admin_price_override_updated_at: "2026-05-01T12:00:00Z",
      partner_price_change_acknowledged_at: null as string | null,
      quoted_at: "2026-04-20T09:00:00Z",
    };
    expect(hasOpenAdminPriceChange(before)).toBe(true);
    const adminTotal = before.admin_price_override * 10;
    expect(adminTotal).toBe(250);
    const after = {
      ...before,
      quoted_price: adminTotal,
      partner_price_change_acknowledged_at: "2026-05-01T13:00:00Z",
    };
    expect(hasOpenAdminPriceChange(after)).toBe(false);
    expect(getDisplayLineTotal(after, 10)).toBe(250);
  });

  it("Doeksen-case (total): open admin-prijswijziging — klant ziet ONMIDDELLIJK de nieuwe admin-prijs", () => {
    const item = {
      quoted_price: 503.58,
      admin_price_override: 570.6,
      price_type: "total" as const,
      override_people: 30,
      admin_price_override_updated_at: "2026-05-01T13:13:00Z",
      partner_price_change_acknowledged_at: "2026-05-01T12:11:00Z",
      quoted_at: "2026-05-01T12:11:00Z",
    };
    expect(hasOpenAdminPriceChange(item)).toBe(true);
    expect(getDisplayLineTotal(item, 30)).toBe(570.6);
  });

  it("Italiaanse dining (per_person): open admin override toont 44.50 × 30 = 1335", () => {
    const item = {
      quoted_price: 1468.5,
      admin_price_override: 44.5,
      price_type: "per_person" as const,
      override_people: 30,
      admin_price_override_updated_at: "2026-05-01T12:31:36Z",
      partner_price_change_acknowledged_at: "2026-05-01T12:31:36Z",
      quoted_at: "2026-05-01T12:31:36Z",
    };
    expect(hasOpenAdminPriceChange(item)).toBe(false);
    const reopened = { ...item, admin_price_override_updated_at: "2026-05-01T13:00:00Z" };
    expect(hasOpenAdminPriceChange(reopened)).toBe(true);
    expect(getDisplayUnitPrice(reopened, 30)).toBe(44.5);
    expect(getDisplayLineTotal(reopened, 30)).toBe(44.5 * 30);
  });

  it("Strandspektakel-case: admin-totaal == quoted_price → géén open wijziging (timestamp-only telt niet)", () => {
    const item = {
      quoted_price: 1072.5,
      admin_price_override: 32.5,
      price_type: "per_person" as const,
      override_people: 33,
      admin_price_override_updated_at: "2026-05-02T10:00:00Z",
      partner_price_change_acknowledged_at: null as string | null,
      quoted_at: "2026-05-01T09:00:00Z",
    };
    expect(hasOpenAdminPriceChange(item)).toBe(true);
    expect(hasOpenAdminPriceChange(item, 33, 1)).toBe(false);
  });

  it("Echte prijswijziging blijft gedetecteerd ondanks amount-check", () => {
    const item = {
      quoted_price: 1072.5,
      admin_price_override: 33.0,
      price_type: "per_person" as const,
      override_people: 33,
      admin_price_override_updated_at: "2026-05-02T10:00:00Z",
      partner_price_change_acknowledged_at: null as string | null,
      quoted_at: "2026-05-01T09:00:00Z",
    };
    expect(hasOpenAdminPriceChange(item, 33, 1)).toBe(true);
  });
});
