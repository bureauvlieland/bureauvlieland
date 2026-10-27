import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";

/**
 * Source-grep guard voor de query achter "te beantwoorden"
 * (src/lib/openConversations.ts). Tot fase 1 van het Berichtencentrum stond
 * deze query in AdminMessages; nu voedt hij de bel, de zijbalk, de tabbladen
 * en de Werkbank, dus de invarianten wegen zwaarder.
 *
 * Historische bugs die deze test voorkomt:
 *   1. Embedded PostgREST joins (`request:program_requests(archived_at)`)
 *      werden gebruikt om gearchiveerde projecten uit te filteren, maar de
 *      join kan als array of null terugkomen waardoor het filter niet werkt
 *      en gearchiveerde items alsnog meetellen.
 *   2. Filter op `answered_at IS NULL` of `direction='inbound'` ontbrak,
 *      waardoor beantwoorde of uitgaande mails werden meegeteld.
 *
 * Als de query wordt geherstructureerd MOETEN deze invarianten blijven
 * gelden (of de test wordt bewust bijgewerkt).
 */

const source = readFileSync(path.resolve(__dirname, "../openConversations.ts"), "utf-8");

const fetchBlockMatch = source.match(/export async function fetchOpenConversations[\s\S]*$/);
const emailQueryMatch = source.match(/\/\/ open-email-query[\s\S]*?\.limit\(\d+\)/);

describe("openConversations: query achter 'te beantwoorden'", () => {
  it("heeft een herkenbare e-mailquery", () => {
    expect(fetchBlockMatch).not.toBeNull();
    expect(emailQueryMatch).not.toBeNull();
  });

  const block = fetchBlockMatch?.[0] ?? "";
  const emailQuery = emailQueryMatch?.[0] ?? "";

  it("bevraagt project_communications (niet email_log)", () => {
    expect(emailQuery).toMatch(/from\(\s*["']project_communications["']\s*\)/);
    expect(block).not.toMatch(/from\(\s*["']email_log["']\s*\)/);
  });

  it("filtert op direction='inbound'", () => {
    expect(emailQuery).toMatch(/\.eq\(\s*["']direction["']\s*,\s*["']inbound["']\s*\)/);
  });

  it("filtert op answered_at IS NULL", () => {
    expect(emailQuery).toMatch(/\.is\(\s*["']answered_at["']\s*,\s*null\s*\)/);
  });

  it("filtert op archived_at IS NULL op de communicatie zelf", () => {
    expect(emailQuery).toMatch(/\.is\(\s*["']archived_at["']\s*,\s*null\s*\)/);
  });

  it("gebruikt GEEN embedded PostgREST-join voor archived_at (bug-prone)", () => {
    expect(block).not.toMatch(/request:program_requests\s*\(/);
    expect(block).not.toMatch(/accommodation:accommodation_requests\s*\(/);
  });

  it("filtert gearchiveerde requests/accommodations expliciet uit via aparte query", () => {
    expect(block).toMatch(/from\(\s*["']program_requests["']\s*\)/);
    expect(block).toMatch(/from\(\s*["']accommodation_requests["']\s*\)/);
    expect(block).toMatch(/not\(\s*["']archived_at["']\s*,\s*["']is["']\s*,\s*null\s*\)/);
  });

  it("telt chats alleen op ongelezen berichten van anderen dan de admin", () => {
    expect(block).toMatch(/from\(\s*["']chat_messages["']\s*\)[\s\S]*?\.neq\(\s*["']sender_type["']\s*,\s*["']admin["']\s*\)[\s\S]*?\.is\(\s*["']read_at["']\s*,\s*null\s*\)/);
  });
});
