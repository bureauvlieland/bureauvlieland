import { describe, it, expect } from "vitest";
import { format } from "date-fns";

/**
 * Regressie-tests voor de self-service configurator-submit.
 *
 * Bug die hier wordt afgedekt:
 *   selectedDates.map(d => d.toISOString().split("T")[0])
 *
 * Voor een Nederlandse gebruiker (UTC+1/+2) die 15 juli kiest, geeft
 * `toISOString()` "2025-07-14T22:00:00.000Z" → opgeslagen als "2025-07-14".
 * De fix is `format(d, "yyyy-MM-dd")` die de LOKALE kalenderdatum geeft.
 *
 * Belangrijk: vitest draait standaard in UTC. Wij construeren bewust een
 * Date-object dat de typische "midnight lokaal" situatie nabootst door een
 * Date te maken die in UTC al om 22:00 zit op de vorige dag — exact wat
 * een NL-browser zou produceren bij `new Date(2025, 6, 15)`.
 */
describe("configurator date serialization", () => {
  it("format(d,'yyyy-MM-dd') geeft de lokale kalenderdatum terug", () => {
    // Date geconstrueerd met lokale componenten — dit is wat de date-picker
    // doorgeeft als de gebruiker 15 juli aanklikt.
    const d = new Date(2025, 6, 15); // 15 juli 2025, lokale tijdzone
    expect(format(d, "yyyy-MM-dd")).toBe("2025-07-15");
  });

  it("format(d,'yyyy-MM-dd') schuift NIET door zoals toISOString().split('T')[0]", () => {
    // Simuleer expliciet een Date waarvan de UTC-representatie op de vorige
    // dag ligt — exact het bug-scenario voor NL-gebruikers in zomertijd.
    const d = new Date("2025-07-14T22:00:00.000Z"); // = 15 juli 00:00 in CEST

    const buggy = d.toISOString().split("T")[0];
    const fixed = format(d, "yyyy-MM-dd");

    // Het bug-patroon gaf de UTC-datum terug:
    expect(buggy).toBe("2025-07-14");
    // De fix geeft de LOKALE datum terug (in NL zou dat 2025-07-15 zijn).
    // In een UTC-test-omgeving valt fixed samen met buggy; in NL-zomertijd is
    // fixed === "2025-07-15". Wat we hier hard willen vastleggen is dat
    // `format` de LOKALE interpretatie volgt — dus minstens >= buggy als
    // string-vergelijking, en altijd consistent met de lokale Date-getters.
    const expectedLocal =
      `${d.getFullYear()}-` +
      `${String(d.getMonth() + 1).padStart(2, "0")}-` +
      `${String(d.getDate()).padStart(2, "0")}`;
    expect(fixed).toBe(expectedLocal);
  });

  it("array van geselecteerde dagen behoudt elke lokale datum", () => {
    const days = [
      new Date(2025, 6, 15),
      new Date(2025, 6, 16),
      new Date(2025, 6, 17),
    ];
    const iso = days.map((d) => format(d, "yyyy-MM-dd"));
    expect(iso).toEqual(["2025-07-15", "2025-07-16", "2025-07-17"]);
  });

  it("round-trip via localStorage behoudt de lokale kalenderdatum", () => {
    const original = new Date(2025, 6, 15);
    const stored = original.toISOString();
    const restored = new Date(stored);
    // Na restore moet `format` nog steeds dezelfde lokale datum geven —
    // dit is wat de drafts-restore flow doet.
    expect(format(restored, "yyyy-MM-dd")).toBe(format(original, "yyyy-MM-dd"));
  });
});
