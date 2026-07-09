import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";

/**
 * Source-grep guard voor de "onbeantwoorde e-mails"-badge in AdminMessages.
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

const source = readFileSync(
  path.resolve(__dirname, "../AdminMessages.tsx"),
  "utf-8",
);

const badgeBlockMatch = source.match(
  /queryKey:\s*\["inbox-unanswered-count"\][\s\S]*?refetchInterval/,
);

describe("AdminMessages: onbeantwoorde-e-mails badge query", () => {
  it("bestaat als losse query met eigen refetch", () => {
    expect(badgeBlockMatch).not.toBeNull();
  });

  const block = badgeBlockMatch?.[0] ?? "";

  it("bevraagt project_communications (niet email_log)", () => {
    expect(block).toMatch(/from\(\s*["']project_communications["']\s*\)/);
  });

  it("filtert op direction='inbound'", () => {
    expect(block).toMatch(/\.eq\(\s*["']direction["']\s*,\s*["']inbound["']\s*\)/);
  });

  it("filtert op answered_at IS NULL", () => {
    expect(block).toMatch(/\.is\(\s*["']answered_at["']\s*,\s*null\s*\)/);
  });

  it("filtert op archived_at IS NULL op de communicatie zelf", () => {
    expect(block).toMatch(/\.is\(\s*["']archived_at["']\s*,\s*null\s*\)/);
  });

  it("gebruikt GEEN embedded PostgREST-join voor archived_at (bug-prone)", () => {
    expect(block).not.toMatch(/request:program_requests\s*\(/);
    expect(block).not.toMatch(/accommodation:accommodation_requests\s*\(/);
  });

  it("filtert gearchiveerde requests/accommodations expliciet uit via aparte query", () => {
    expect(block).toMatch(/program_requests/);
    expect(block).toMatch(/accommodation_requests/);
    expect(block).toMatch(/not\(\s*["']archived_at["']\s*,\s*["']is["']\s*,\s*null\s*\)/);
  });
});
