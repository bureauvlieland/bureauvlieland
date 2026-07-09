/**
 * Source-grep guards voor kritieke concurrency-invarianten in
 * `savePartialItemField`:
 *
 * 1. Concept-items (`pending_added === true`) schrijven direct naar de
 *    live-kolom, NIET naar de pending-kolom. Als deze branch verdwijnt
 *    gaat elk nieuw concept item in de pending-flow zitten en wordt hij
 *    per ongeluk aan de klant/partner beloofd bij de eerstvolgende publish.
 *
 * 2. `pending_changed_at` wordt bij een niet-null pending-waarde ALTIJD
 *    op nu gezet. Dit is de race-guard die voorkomt dat publish een
 *    wijziging overslaat omdat de timestamp per ongeluk null was.
 *
 * 3. Bij het clearen van een pending-veld wordt `pending_changed_at`
 *    alleen null gezet als er GEEN andere pending-velden meer openstaan.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const src = readFileSync(resolve(process.cwd(), "src/lib/partialItemSave.ts"), "utf8");

describe("partialItemSave — concurrency guards", () => {
  it("bevat expliciete concept-branch (pending_added === true → live kolom)", () => {
    expect(src).toMatch(/pending_added\s*===\s*true/);
    // De concept-branch schrijft direct naar de live-kolom via [field]: value
    // en gebruikt daarna een early return, zodat de pending-flow niet ook nog
    // een keer loopt.
    const conceptBlock = src.match(/pending_added\s*===\s*true[\s\S]{0,600}?return;/);
    expect(conceptBlock, "concept-branch niet gevonden").not.toBeNull();
    expect(conceptBlock![0]).toMatch(/\{\s*\[field\]:\s*value\s*\}/);
    // Concept-branch mag geen pending_-kolom updaten
    expect(conceptBlock![0]).not.toMatch(/pending_[a-z_]+:\s*(pendingValue|value)\b/);
  });

  it("zet pending_changed_at op nu wanneer pendingValue niet null is (race-guard)", () => {
    // We eisen dat er een default assignment van `nextChangedAt = new Date()...` staat
    // vóór de null-branch die deze eventueel op null zet.
    expect(src).toMatch(/nextChangedAt[^\n]*=\s*new Date\(\)\.toISOString\(\)/);
    expect(src).toMatch(/if\s*\(\s*pendingValue\s*===\s*null\s*\)/);
  });

  it("clear van pending_changed_at gebeurt ALLEEN als geen andere pending openstaat", () => {
    // De code moet .some((v) => v !== null && v !== undefined) gebruiken en
    // op basis daarvan nextChangedAt op null zetten.
    expect(src).toMatch(/\.some\(\s*\(v\)\s*=>\s*v\s*!==\s*null\s*&&\s*v\s*!==\s*undefined\s*\)/);
    expect(src).toMatch(/nextChangedAt\s*=\s*anyPending[^;]*\?\s*new Date/);
  });

  it("gooit door bij DB errors (geen stille failure)", () => {
    // Beide update-paden moeten `if (error) throw error;` bevatten.
    const throwCount = (src.match(/if\s*\(\s*error\s*\)\s*throw\s+error/g) || []).length;
    expect(throwCount).toBeGreaterThanOrEqual(2);
  });
});
