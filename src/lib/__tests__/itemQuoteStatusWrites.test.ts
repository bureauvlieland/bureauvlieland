import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * Bron van waarheid: check-constraint program_request_items_quote_status_check.
 * Alleen deze waarden mogen ooit naar item_quote_status geschreven worden.
 * Weergavestatussen (wacht_op_klant, wacht_op_partner, ...) zijn afgeleid en
 * mogen NOOIT in de kolom belanden — dat geeft een constraint-violation.
 */
const ALLOWED = [
  "concept",
  "offerte_verstuurd",
  "in_afstemming",
  "bevestigd",
  "optioneel",
] as const;

const DISPLAY_ONLY = [
  "wacht_op_klant",
  "wacht_op_partner",
  "klaar_voor_partner",
  "goedgekeurd",
  "uitgevoerd",
];

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === "__tests__" || entry === "dist") continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(ts|tsx)$/.test(entry)) out.push(full);
  }
  return out;
}

const files = [...walk("src"), ...walk("supabase/functions")];

describe("item_quote_status writes", () => {
  it("schrijft nooit een weergavestatus naar item_quote_status", () => {
    const offenders: string[] = [];
    for (const file of files) {
      const src = readFileSync(file, "utf8");
      for (const line of src.split("\n")) {
        const m = line.match(/item_quote_status\s*[:=]\s*["']([a-z_]+)["']/);
        if (!m) continue;
        if (DISPLAY_ONLY.includes(m[1])) offenders.push(`${file}: ${line.trim()}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("schrijft alleen toegestane waarden naar item_quote_status", () => {
    const offenders: string[] = [];
    for (const file of files) {
      const src = readFileSync(file, "utf8");
      for (const line of src.split("\n")) {
        const m = line.match(/item_quote_status\s*[:=]\s*["']([a-z_]+)["']/);
        if (!m) continue;
        if (!(ALLOWED as readonly string[]).includes(m[1])) {
          offenders.push(`${file}: ${line.trim()}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});
