import { describe, it, expect } from "vitest";
import { parseVatRate, resolveVatRate } from "../../../supabase/functions/_shared/vatRate";

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Wat de registratiedialoog doet (incl → excl met het tarief van het onderdeel)
 * en wat register-partner-invoice daarna doet (excl → incl met het opgeloste
 * tarief). Samen moet dat het ingevoerde bedrag teruggeven.
 */
function roundTrip(enteredIncl: number, itemVat: number, clientVat: unknown): number {
  const excl = round2(enteredIncl / (1 + itemVat / 100));
  const rate = resolveVatRate(clientVat, itemVat);
  const vat = round2(excl * (rate / 100));
  return round2(excl + vat);
}

describe("btw-tarief van een portaalregistratie", () => {
  it("T-261029: lunch van € 300 incl. 9% blijft € 300, ook zonder tarief van de client", () => {
    expect(roundTrip(300, 9, 9)).toBe(300);
    expect(roundTrip(300, 9, undefined)).toBe(300);
  });

  it("de oude fout: vast 21% maakte van € 300 incl. 9% € 333,03", () => {
    const excl = round2(300 / 1.09);
    expect(round2(excl * 1.21)).toBe(333.03);
    expect(resolveVatRate(undefined, 9)).not.toBe(21);
  });

  it("client-tarief gaat voor, daarna onderdeel, daarna 21%", () => {
    expect(resolveVatRate(9, 21)).toBe(9);
    expect(resolveVatRate(null, "9")).toBe(9);
    expect(resolveVatRate("", null)).toBe(21);
    expect(resolveVatRate(0, 9)).toBe(0);
  });

  it("parseVatRate", () => {
    expect(parseVatRate("21")).toBe(21);
    expect(parseVatRate("")).toBeNull();
    expect(parseVatRate(-3)).toBeNull();
    expect(parseVatRate("x")).toBeNull();
  });
});
