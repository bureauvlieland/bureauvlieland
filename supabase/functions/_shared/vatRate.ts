/**
 * Btw-tarief voor een factuurregel die een partner via het portaal registreert.
 *
 * De registratiedialoog rekent het ingevoerde bedrag incl. btw terug naar excl.
 * met het tarief van het onderdeel (9% bij catering). Stuurde hij dat tarief
 * niet mee, dan nam register-partner-invoice 21% en telde dat er weer bovenop:
 * een lunch van € 300 werd zo € 333,03 (factor 1,21 ÷ 1,09). Daarom: het tarief
 * van de client, anders dat van het onderdeel zelf, en pas als laatste 21%.
 */

/** Een getal of null; lege strings en onzin tellen als "niet meegestuurd". */
export function parseVatRate(value: unknown): number | null {
  if (value === undefined || value === null || value === "") return null;
  const n = Number(value);
  return Number.isNaN(n) || n < 0 ? null : n;
}

export function resolveVatRate(clientRate: unknown, itemRate: unknown): number {
  return parseVatRate(clientRate) ?? parseVatRate(itemRate) ?? 21;
}
