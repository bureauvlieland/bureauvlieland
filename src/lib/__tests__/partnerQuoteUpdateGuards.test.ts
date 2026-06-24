import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

/**
 * Contract-test voor de partner-offerte submit in PartnerAccommodation.tsx.
 *
 * De partner mag offerte-inhoud bijwerken, maar NOOIT velden die financieel
 * of organisatorisch beschermd zijn:
 *   - commission_percentage / commission_amount   (bureau-only)
 *   - program_request_id / partner_id             (row-reassignment)
 *   - customer_accepted_at / accepted_at          (klant-actie, niet partner)
 *
 * Database-zijde wordt dit al afgedwongen door
 * `protect_partner_accommodation_quote_fields` (zie migrations). Deze test
 * vangt het al op CI-niveau zodat een ongelukkige refactor niet eerst tegen
 * een RLS-fout aanloopt in productie.
 */
const FILE = "src/pages/PartnerAccommodation.tsx";
const FORBIDDEN_KEYS = [
  "commission_percentage",
  "commission_amount",
  "program_request_id",
  "partner_id",
  "customer_accepted_at",
];

const read = (rel: string) => readFileSync(resolve(process.cwd(), rel), "utf8");

describe("PartnerAccommodation — accommodation_quotes update guards", () => {
  const src = read(FILE);

  // Extract elke .from("accommodation_quotes").update({ ... }) payload-blok.
  const blocks: string[] = [];
  const re = /from\(\s*["']accommodation_quotes["']\s*\)\s*\.update\(\s*\{([\s\S]*?)\}\s*(?:as\s+\w+\s*)?\)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src)) !== null) blocks.push(m[1]);

  it("er is minstens één accommodation_quotes update aanwezig", () => {
    expect(blocks.length).toBeGreaterThan(0);
  });

  for (const key of FORBIDDEN_KEYS) {
    it(`bevat NOOIT '${key}' in een partner-side update payload`, () => {
      for (const block of blocks) {
        // Word-boundary om bv. 'customer_accepted_at' niet te matchen op
        // 'customer_accepted_at_reset_count' (zou allebei verdacht zijn).
        const pattern = new RegExp(`\\b${key}\\b\\s*:`);
        expect(block).not.toMatch(pattern);
      }
    });
  }

  it("zet status correct op 'submitted' bij indienen", () => {
    expect(blocks.some((b) => /status\s*:\s*["']submitted["']/.test(b))).toBe(true);
  });
});
