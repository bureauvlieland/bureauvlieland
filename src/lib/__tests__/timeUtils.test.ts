/**
 * Contract voor de "actieve tijd"-lookup en HH:mm-normalisatie.
 * `getEffectiveTime` is de enige bron van waarheid voor tijd-weergave in
 * admin/customer/partner (Fase 4b). Volgorde-regressies leiden tot
 * verkeerde tijden in offertes, mail en portaal.
 */
import { describe, it, expect } from "vitest";
import { formatTimeHHmm, getEffectiveTime } from "@/lib/timeUtils";

describe("getEffectiveTime — precedence", () => {
  it("confirmed_time wint van proposed en preferred", () => {
    expect(
      getEffectiveTime({
        confirmed_time: "10:00",
        proposed_time: "11:00",
        preferred_time: "12:00",
      }),
    ).toBe("10:00");
  });

  it("proposed_time wint als confirmed leeg is", () => {
    expect(
      getEffectiveTime({
        confirmed_time: null,
        proposed_time: "11:00",
        preferred_time: "12:00",
      }),
    ).toBe("11:00");
  });

  it("preferred_time is fallback", () => {
    expect(
      getEffectiveTime({
        confirmed_time: null,
        proposed_time: null,
        preferred_time: "12:00",
      }),
    ).toBe("12:00");
  });

  it("geen enkele tijd → null", () => {
    expect(getEffectiveTime({})).toBeNull();
  });

  it("lege string telt als afwezig (valt door naar volgende)", () => {
    expect(
      getEffectiveTime({
        confirmed_time: "",
        proposed_time: "11:00",
      }),
    ).toBe("11:00");
  });
});

describe("formatTimeHHmm", () => {
  it("kapt seconden en timezone af", () => {
    expect(formatTimeHHmm("10:00:00")).toBe("10:00");
    expect(formatTimeHHmm("10:00:00+02")).toBe("10:00");
  });

  it("laat al-genormaliseerde waarde ongewijzigd", () => {
    expect(formatTimeHHmm("10:00")).toBe("10:00");
  });

  it("pad enkelcijferig uur naar HH", () => {
    expect(formatTimeHHmm("9:05")).toBe("09:05");
  });

  it("'flexibel' blijft behouden (case-insensitief)", () => {
    expect(formatTimeHHmm("flexibel")).toBe("flexibel");
    expect(formatTimeHHmm("Flexibel")).toBe("Flexibel");
  });

  it("null / undefined / lege string → null", () => {
    expect(formatTimeHHmm(null)).toBeNull();
    expect(formatTimeHHmm(undefined)).toBeNull();
    expect(formatTimeHHmm("")).toBeNull();
    expect(formatTimeHHmm("   ")).toBeNull();
  });
});
