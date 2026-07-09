/**
 * Contract voor sales-inbox → project datumparser. Fouten hier lekken
 * verkeerde `selected_dates` door naar program_requests, wat directe
 * impact heeft op offertes, facturen en beschikbaarheidscheck.
 */
import { describe, it, expect } from "vitest";
import { formatDatesPreview, parseDutchDates } from "@/lib/parseDutchDates";

describe("parseDutchDates", () => {
  it("parseert ISO datum", () => {
    expect(parseDutchDates("2026-10-22").dates).toEqual(["2026-10-22"]);
  });

  it("parseert DD-MM-YYYY, DD/MM/YYYY en DD.MM.YYYY", () => {
    expect(parseDutchDates("22-10-2026").dates).toEqual(["2026-10-22"]);
    expect(parseDutchDates("22/10/2026").dates).toEqual(["2026-10-22"]);
    expect(parseDutchDates("22.10.2026").dates).toEqual(["2026-10-22"]);
  });

  it("parseert NL maandnamen, incl. afkortingen", () => {
    expect(parseDutchDates("22 oktober 2026").dates).toEqual(["2026-10-22"]);
    expect(parseDutchDates("22 okt 2026").dates).toEqual(["2026-10-22"]);
    expect(parseDutchDates("1 mrt 2027").dates).toEqual(["2027-03-01"]);
  });

  it("expandeert 'DD t/m DD maand YYYY' ranges", () => {
    const r = parseDutchDates("22 t/m 25 oktober 2026");
    expect(r.dates).toEqual([
      "2026-10-22",
      "2026-10-23",
      "2026-10-24",
      "2026-10-25",
    ]);
    expect(r.invalid).toEqual([]);
  });

  it("ondersteunt 'tot en met' en em/en-dash-ranges", () => {
    expect(parseDutchDates("22 tot en met 24 oktober 2026").dates.length).toBe(3);
    expect(parseDutchDates("22 – 24 oktober 2026").dates.length).toBe(3);
    expect(parseDutchDates("22 - 24 oktober 2026").dates.length).toBe(3);
  });

  it("dedupliceert en sorteert meerdere tokens", () => {
    const r = parseDutchDates("25 oktober 2026, 22 oktober 2026, 22 oktober 2026");
    expect(r.dates).toEqual(["2026-10-22", "2026-10-25"]);
  });

  it("markeert niet-parsebare fragmenten in `invalid`", () => {
    const r = parseDutchDates("22 oktober 2026, banaan, 2026-13-40");
    expect(r.dates).toEqual(["2026-10-22"]);
    expect(r.invalid).toContain("banaan");
    // ongeldige maand of dag mag niet stil worden geaccepteerd
    expect(r.invalid.length).toBeGreaterThanOrEqual(2);
  });

  it("weigert schrikkeldag 29 februari in niet-schrikkeljaar", () => {
    const r = parseDutchDates("29 februari 2027");
    expect(r.dates).toEqual([]);
    expect(r.invalid).toContain("29 februari 2027");
  });

  it("kapt te grote ranges af (guard 60 dagen)", () => {
    const r = parseDutchDates("1 januari 2026 t/m 30 juni 2026");
    expect(r.dates.length).toBeLessThanOrEqual(60);
  });

  it("lege / null input geeft lege result", () => {
    expect(parseDutchDates("").dates).toEqual([]);
    expect(parseDutchDates(null).dates).toEqual([]);
    expect(parseDutchDates(undefined).invalid).toEqual([]);
  });
});

describe("formatDatesPreview", () => {
  it("lege input → lege string", () => {
    expect(formatDatesPreview([])).toBe("");
  });

  it("één datum → NL geformatteerde datum", () => {
    expect(formatDatesPreview(["2026-10-22"])).toMatch(/22 oktober 2026/);
  });

  it("meerdere datums → 'eerste t/m laatste (N dagen)'", () => {
    const s = formatDatesPreview(["2026-10-22", "2026-10-23", "2026-10-24"]);
    expect(s).toMatch(/22 oktober 2026/);
    expect(s).toMatch(/24 oktober 2026/);
    expect(s).toMatch(/\(3 dagen\)/);
  });
});
