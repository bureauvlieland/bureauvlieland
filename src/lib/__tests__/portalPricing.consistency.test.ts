import { describe, expect, it } from "bun:test";
import {
  getDisplayUnitPrice,
  getDisplayLineTotal,
  getEffectivePeople,
  getItemLineTotal,
  hasOpenAdminPriceChange,
} from "../portalPricing";

/**
 * QA-suite die afdwingt dat admin / partner / klant exact hetzelfde groepstotaal
 * tonen voor één en hetzelfde program_request_item.
 *
 * Run: `bun test src/lib/__tests__/portalPricing.consistency.test.ts`
 */

const baseItem = {
  quoted_price: null as number | null,
  admin_price_override: null as number | null,
  price_type: "per_person" as string | null,
  override_people: null as number | null,
};

describe("portalPricing — consistency across admin/partner/customer", () => {
  it("per_person item: unit × people === group total (admin override)", () => {
    const item = { ...baseItem, admin_price_override: 25, price_type: "per_person" };
    const people = 12;
    const unit = getDisplayUnitPrice(item, people)!;
    const total = getDisplayLineTotal(item, people)!;
    expect(unit).toBe(25);
    expect(total).toBe(300);
    expect(unit * getEffectivePeople(item, people)).toBe(total);
  });

  it("per_person_per_day item: unit × people × days === group total", () => {
    const item = { ...baseItem, admin_price_override: 10, price_type: "per_person_per_day" };
    const people = 8;
    const days = 3;
    const total = getDisplayLineTotal(item, people, days)!;
    expect(total).toBe(10 * 8 * 3);
  });

  it("quoted_price always wins over admin_price_override (group total)", () => {
    const item = {
      ...baseItem,
      quoted_price: 500,
      admin_price_override: 999,
      price_type: "per_person",
    };
    expect(getDisplayLineTotal(item, 10)).toBe(500);
  });

  it("override_people overrides programPeople for both unit AND total", () => {
    // Trattoria-case: programma 18 personen, item override op 12.
    const item = {
      ...baseItem,
      admin_price_override: 44.5,
      price_type: "per_person",
      override_people: 12,
    };
    const programPeople = 18;
    expect(getEffectivePeople(item, programPeople)).toBe(12);
    expect(getDisplayLineTotal(item, programPeople)).toBe(44.5 * 12);
  });

  it("quoted_price + override_people: unit price = quoted_price ÷ override_people", () => {
    const item = {
      ...baseItem,
      quoted_price: 534,
      price_type: "per_person",
      override_people: 12,
    };
    expect(getDisplayUnitPrice(item, 18)).toBe(534 / 12);
    expect(getDisplayLineTotal(item, 18)).toBe(534);
  });

  it("getItemLineTotal en getDisplayLineTotal leveren identiek resultaat (admin override pad)", () => {
    const item: any = {
      id: "x", request_id: "r", block_id: null, block_name: "t", block_category: "c",
      provider_name: "p", provider_id: "pp", provider_email: null, block_type: "activity",
      price_indication: null, duration: null, day_index: 0, preferred_time: null,
      customer_notes: null, status: "pending", status_note: null, status_updated_at: null,
      status_updated_by: null, version: 1, created_at: "", updated_at: "", executed_at: null,
      customer_accepted_at: null, customer_counter_time: null, customer_counter_note: null,
      customer_counter_at: null, confirmed_time: null, quoted_price: null, quoted_at: null,
      quoted_notes: null, proposed_time: null, proposed_date: null, image_url: null,
      image_asset: null, customer_approved_at: null, item_quote_status: null,
      admin_price_override: 30, admin_price_notes: null, skip_partner_notification: false,
      price_type: "per_person", external_url: null, override_people: null,
    };
    expect(getItemLineTotal(item, 10)).toBe(getDisplayLineTotal(item, 10));
  });
});

describe("hasOpenAdminPriceChange", () => {
  it("false als admin_price_override leeg is", () => {
    expect(hasOpenAdminPriceChange({ admin_price_override: null, admin_price_override_updated_at: null })).toBe(false);
  });

  it("true wanneer admin override nieuwer is dan laatste partner-acknowledgement", () => {
    expect(hasOpenAdminPriceChange({
      admin_price_override: 25,
      admin_price_override_updated_at: "2026-05-01T12:00:00Z",
      partner_price_change_acknowledged_at: "2026-04-30T10:00:00Z",
    })).toBe(true);
  });

  it("false wanneer partner reeds geacknowledged ná de admin-update", () => {
    expect(hasOpenAdminPriceChange({
      admin_price_override: 25,
      admin_price_override_updated_at: "2026-05-01T12:00:00Z",
      partner_price_change_acknowledged_at: "2026-05-02T10:00:00Z",
    })).toBe(false);
  });

  it("valt terug op quoted_at als partner_price_change_acknowledged_at ontbreekt", () => {
    expect(hasOpenAdminPriceChange({
      admin_price_override: 25,
      admin_price_override_updated_at: "2026-05-01T12:00:00Z",
      quoted_at: "2026-05-02T10:00:00Z",
    })).toBe(false);
  });
});
