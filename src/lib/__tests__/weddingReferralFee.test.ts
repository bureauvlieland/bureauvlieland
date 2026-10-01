import { describe, expect, it } from "vitest";
import {
  DEFAULT_FEE_TIERS,
  calculateReferralFee,
  describeTier,
  normalizeTiers,
  pickFeeSchedule,
  validateTiers,
  type FeeScheduleLike,
} from "@/lib/weddingReferralFee";

const staffel2026 = {
  id: "s-2026",
  effective_from: "2026-01-01",
  tiers: DEFAULT_FEE_TIERS,
  multi_day_surcharge: 250,
};

describe("calculateReferralFee", () => {
  it("rekent de staffel af op de grenzen: 50 → 350, 51 → 550, 100 → 550, 101 → 750", () => {
    const fee = (n: number) => calculateReferralFee({ dayGuests: n, multiDay: false }, staffel2026)?.total;
    expect(fee(0)).toBe(350);
    expect(fee(1)).toBe(350);
    expect(fee(50)).toBe(350);
    expect(fee(51)).toBe(550);
    expect(fee(100)).toBe(550);
    expect(fee(101)).toBe(750);
    expect(fee(400)).toBe(750);
  });

  it("telt de toeslag voor een meerdaagse bruiloft erbij en laat de trede zien", () => {
    const uitkomst = calculateReferralFee({ dayGuests: 80, multiDay: true }, staffel2026);
    expect(uitkomst).toEqual({ tier: { max_guests: 100, fee: 550 }, base: 550, surcharge: 250, total: 800 });
  });

  it("geeft niets terug bij een ongeldig aantal of een staffel zonder passende trede", () => {
    expect(calculateReferralFee({ dayGuests: -1, multiDay: false }, staffel2026)).toBeNull();
    expect(calculateReferralFee({ dayGuests: Number.NaN, multiDay: false }, staffel2026)).toBeNull();
    expect(calculateReferralFee({ dayGuests: 120, multiDay: false }, { tiers: [{ max_guests: 100, fee: 550 }], multi_day_surcharge: 0 })).toBeNull();
  });

  it("leest de treden ook als de database ze als tekst of door elkaar teruggeeft", () => {
    const schedule = {
      tiers: [
        { max_guests: null, fee: "750" },
        { max_guests: "50", fee: 350 },
        { max_guests: 100, fee: 550 },
        { max_guests: 30 },
        "rommel",
      ],
      multi_day_surcharge: "250",
    } as unknown as Pick<FeeScheduleLike, "tiers" | "multi_day_surcharge">;
    expect(calculateReferralFee({ dayGuests: 40, multiDay: true }, schedule)?.total).toBe(600);
    expect(calculateReferralFee({ dayGuests: 150, multiDay: false }, schedule)?.total).toBe(750);
  });
});

describe("pickFeeSchedule", () => {
  const staffel2027 = { ...staffel2026, id: "s-2027", effective_from: "2027-01-01", multi_day_surcharge: 300 };

  it("kiest de laatste staffel die op de datum doorverwezen al gold", () => {
    const alle = [staffel2027, staffel2026];
    expect(pickFeeSchedule(alle, "2026-06-15")?.id).toBe("s-2026");
    expect(pickFeeSchedule(alle, "2026-12-31")?.id).toBe("s-2026");
    expect(pickFeeSchedule(alle, "2027-01-01")?.id).toBe("s-2027");
    expect(pickFeeSchedule(alle, "2028-03-03")?.id).toBe("s-2027");
  });

  it("een nieuwe staffel verandert niets aan een eerdere doorverwijzing", () => {
    const voorWijziging = calculateReferralFee({ dayGuests: 60, multiDay: true }, pickFeeSchedule([staffel2026], "2026-06-15")!);
    const naWijziging = calculateReferralFee({ dayGuests: 60, multiDay: true }, pickFeeSchedule([staffel2026, staffel2027], "2026-06-15")!);
    expect(voorWijziging?.total).toBe(800);
    expect(naWijziging?.total).toBe(800);
  });

  it("geeft null als er op die datum nog geen staffel bestond", () => {
    expect(pickFeeSchedule([staffel2026], "2025-12-31")).toBeNull();
    expect(pickFeeSchedule([], "2026-06-15")).toBeNull();
  });
});

describe("normalizeTiers, validateTiers en describeTier", () => {
  it("sorteert oplopend met de open trede als laatste", () => {
    const tiers = normalizeTiers([
      { max_guests: null, fee: 750 },
      { max_guests: 100, fee: 550 },
      { max_guests: 50, fee: 350 },
    ]);
    expect(tiers.map((t) => t.max_guests)).toEqual([50, 100, null]);
    expect(describeTier(tiers, 0)).toBe("t/m 50");
    expect(describeTier(tiers, 1)).toBe("51 t/m 100");
    expect(describeTier(tiers, 2)).toBe("meer dan 100");
  });

  it("wijst een staffel zonder open trede, met dubbele grenzen of zonder treden af", () => {
    expect(validateTiers([])).toContain("Minstens één trede is nodig.");
    expect(validateTiers([{ max_guests: 50, fee: 350 }])).toHaveLength(1);
    expect(validateTiers([{ max_guests: 50, fee: 350 }, { max_guests: 50, fee: 400 }, { max_guests: null, fee: 750 }])).toEqual([
      "Twee treden hebben dezelfde bovengrens.",
    ]);
    expect(validateTiers(normalizeTiers(DEFAULT_FEE_TIERS))).toEqual([]);
  });
});
