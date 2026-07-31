import { describe, it, expect } from "vitest";
import {
  getEffectivePeople,
  getDisplayUnitPrice,
  getDisplayLineTotal,
  hasOpenAdminPriceChange,
  priceChangeRequiresReapproval,
  isPerPersonItem,
  isPerDayItem,
  getPriceTypeSuffix,
  getPriceBreakdownLabel,
  getNumberOfDays,
  getHeadcountMismatch,
} from "@/lib/portalPricing";

describe("getEffectivePeople", () => {
  it("gebruikt override_people wanneer gezet, anders het programma-aantal", () => {
    expect(getEffectivePeople({ override_people: 8 }, 14)).toBe(8);
    expect(getEffectivePeople({ override_people: null }, 14)).toBe(14);
    expect(getEffectivePeople({}, 14)).toBe(14);
  });

  it("respecteert een expliciete 0 als override", () => {
    expect(getEffectivePeople({ override_people: 0 }, 14)).toBe(0);
  });
});

describe("price_type-classificatie", () => {
  it("behandelt ontbrekend price_type als per persoon", () => {
    expect(isPerPersonItem({})).toBe(true);
    expect(isPerPersonItem({ price_type: "per_person" })).toBe(true);
    expect(isPerPersonItem({ price_type: "per_person_per_day" })).toBe(true);
    expect(isPerPersonItem({ price_type: "total" })).toBe(false);
    expect(isPerPersonItem({ price_type: "on_request" })).toBe(false);
  });

  it("vermenigvuldigt alleen p.p.p.d. met dagen", () => {
    expect(isPerDayItem({ price_type: "per_person_per_day" })).toBe(true);
    expect(isPerDayItem({ price_type: "per_person" })).toBe(false);
  });

  it("geeft het juiste achtervoegsel per prijstype", () => {
    expect(getPriceTypeSuffix("per_person_per_day")).toBe("p.p.p.d.");
    expect(getPriceTypeSuffix("total")).toBe("totaal");
    expect(getPriceTypeSuffix("on_request")).toBe("totaal");
    expect(getPriceTypeSuffix(null)).toBe("p.p.");
  });
});

describe("getNumberOfDays", () => {
  it("geeft altijd minimaal 1 dag", () => {
    expect(getNumberOfDays([])).toBe(1);
    expect(getNumberOfDays(null)).toBe(1);
    expect(getNumberOfDays(undefined)).toBe(1);
    expect(getNumberOfDays({ selected_dates: [] })).toBe(1);
    expect(getNumberOfDays({})).toBe(1);
  });

  it("telt dagen uit een array of uit een request", () => {
    expect(getNumberOfDays(["2026-05-01", "2026-05-02"])).toBe(2);
    expect(getNumberOfDays({ selected_dates: ["a", "b", "c"] })).toBe(3);
  });
});

describe("getDisplayUnitPrice / getDisplayLineTotal", () => {
  it("gebruikt quoted_price als groepstotaal en leidt de p.p.-prijs af", () => {
    const item = { quoted_price: 448, price_type: "per_person" };
    expect(getDisplayUnitPrice(item, 14)).toBe(32);
    expect(getDisplayLineTotal(item, 14)).toBe(448);
  });

  it("laat quoted_price ongemoeid bij prijstype totaal", () => {
    const item = { quoted_price: 500, price_type: "total" };
    expect(getDisplayUnitPrice(item, 10)).toBe(500);
    expect(getDisplayLineTotal(item, 10)).toBe(500);
  });

  it("vermenigvuldigt admin_price_override met personen en dagen", () => {
    const item = { admin_price_override: 10, price_type: "per_person_per_day" };
    expect(getDisplayLineTotal(item, 5, 3)).toBe(150);
    expect(getDisplayUnitPrice(item, 5)).toBe(10);
  });

  it("gebruikt override_people boven het programma-aantal", () => {
    const item = { admin_price_override: 20, price_type: "per_person", override_people: 4 };
    expect(getDisplayLineTotal(item, 20)).toBe(80);
  });

  it("geeft null wanneer er nog geen prijs bekend is", () => {
    expect(getDisplayUnitPrice({}, 10)).toBeNull();
    expect(getDisplayLineTotal({}, 10)).toBeNull();
  });

  it("laat een openstaande admin-prijswijziging voorgaan op quoted_price", () => {
    const item = {
      quoted_price: 448,
      admin_price_override: 40,
      price_type: "per_person",
      quoted_at: "2026-05-01T10:00:00Z",
      admin_price_override_updated_at: "2026-05-02T10:00:00Z",
    };
    expect(getDisplayLineTotal(item, 14)).toBe(560);
    expect(getDisplayUnitPrice(item, 14)).toBe(40);
  });
});

describe("hasOpenAdminPriceChange", () => {
  const base = {
    quoted_price: 448,
    admin_price_override: 32,
    price_type: "per_person",
    quoted_at: "2026-05-01T10:00:00Z",
  };

  it("is false zonder override of zonder timestamp", () => {
    expect(hasOpenAdminPriceChange({ ...base, admin_price_override: null }, 14)).toBe(false);
    expect(hasOpenAdminPriceChange({ ...base }, 14)).toBe(false);
  });

  it("is false wanneer de partner de wijziging al bevestigde", () => {
    expect(
      hasOpenAdminPriceChange(
        {
          ...base,
          admin_price_override: 40,
          admin_price_override_updated_at: "2026-05-02T10:00:00Z",
          partner_price_change_acknowledged_at: "2026-05-03T10:00:00Z",
        },
        14,
      ),
    ).toBe(false);
  });

  it("is false wanneer het bedrag materieel gelijk blijft (sync-actie)", () => {
    expect(
      hasOpenAdminPriceChange(
        { ...base, admin_price_override_updated_at: "2026-05-02T10:00:00Z" },
        14,
      ),
    ).toBe(false);
  });

  it("is false bij de eerste prijsstelling zonder eerdere offerte", () => {
    expect(
      hasOpenAdminPriceChange({
        admin_price_override: 32,
        admin_price_override_updated_at: "2026-05-02T10:00:00Z",
        quoted_price: null,
        quoted_at: null,
      }),
    ).toBe(false);
  });

  it("is true bij een nieuwer en afwijkend admin-bedrag", () => {
    expect(
      hasOpenAdminPriceChange(
        { ...base, admin_price_override: 40, admin_price_override_updated_at: "2026-05-02T10:00:00Z" },
        14,
      ),
    ).toBe(true);
  });
});

describe("priceChangeRequiresReapproval", () => {
  const base = {
    quoted_price: 1000,
    price_type: "total" as const,
    quoted_at: "2026-05-01T10:00:00Z",
    admin_price_override_updated_at: "2026-05-02T10:00:00Z",
  };

  it("vraagt geen nieuw akkoord bij een prijsdaling", () => {
    expect(priceChangeRequiresReapproval({ ...base, admin_price_override: 900 }, 10, 1)).toBe(false);
  });

  it("vraagt geen nieuw akkoord bij een kleine stijging onder beide drempels", () => {
    // +10 euro = 1% van 1000, onder 5% en onder 25 euro
    expect(priceChangeRequiresReapproval({ ...base, admin_price_override: 1010 }, 10, 1)).toBe(false);
  });

  it("vraagt nieuw akkoord bij een stijging boven de absolute drempel", () => {
    expect(priceChangeRequiresReapproval({ ...base, admin_price_override: 1030 }, 10, 1)).toBe(true);
  });

  it("vraagt nieuw akkoord bij een stijging boven de procentuele drempel", () => {
    expect(
      priceChangeRequiresReapproval(
        { ...base, quoted_price: 200, admin_price_override: 215 },
        10,
        1,
      ),
    ).toBe(true);
  });

  it("respecteert aangepaste drempels", () => {
    expect(
      priceChangeRequiresReapproval({ ...base, admin_price_override: 1030 }, 10, 1, {
        pct: 50,
        absEur: 100,
      }),
    ).toBe(false);
  });
});

describe("getPriceBreakdownLabel", () => {
  it("beschrijft p.p.p.d. met personen en dagen", () => {
    expect(
      getPriceBreakdownLabel({ price_type: "per_person_per_day", admin_price_override: 29.5 }, 12, 3),
    ).toBe("€29,50 p.p.p.d. × 12 personen × 3 dagen");
  });

  it("beschrijft p.p. zonder dagen", () => {
    expect(getPriceBreakdownLabel({ price_type: "per_person", admin_price_override: 32 }, 14)).toBe(
      "€32,00 p.p. × 14 personen",
    );
  });

  it("geeft Totaalprijs bij prijstype totaal en leeg bij ontbrekende prijs", () => {
    expect(getPriceBreakdownLabel({ price_type: "total", admin_price_override: 500 }, 10)).toBe(
      "Totaalprijs",
    );
    expect(getPriceBreakdownLabel({ price_type: "per_person" }, 10)).toBe("");
  });
});

describe("getHeadcountMismatch", () => {
  it("detecteert een verlaagd aantal personen bij bevestigde p.p.-prijs", () => {
    const result = getHeadcountMismatch(
      { quoted_price: 448, admin_price_override: 32, price_type: "per_person" },
      13,
    );
    expect(result).toEqual({ unitPrice: 32, oldTotal: 448, newTotal: 416, peopleNow: 13 });
  });

  it("geeft null wanneer het totaal nog klopt", () => {
    expect(
      getHeadcountMismatch(
        { quoted_price: 448, admin_price_override: 32, price_type: "per_person" },
        14,
      ),
    ).toBeNull();
  });

  it("geeft null voor totaalprijzen of zonder p.p.-prijs", () => {
    expect(
      getHeadcountMismatch({ quoted_price: 448, admin_price_override: 32, price_type: "total" }, 13),
    ).toBeNull();
    expect(getHeadcountMismatch({ quoted_price: 448, price_type: "per_person" }, 13)).toBeNull();
    expect(getHeadcountMismatch({ admin_price_override: 32, price_type: "per_person" }, 13)).toBeNull();
  });

  it("rekent dagen mee bij p.p.p.d.", () => {
    expect(
      getHeadcountMismatch(
        { quoted_price: 900, admin_price_override: 10, price_type: "per_person_per_day" },
        10,
        3,
      ),
    ).toEqual({ unitPrice: 10, oldTotal: 900, newTotal: 300, peopleNow: 10 });
  });
});
