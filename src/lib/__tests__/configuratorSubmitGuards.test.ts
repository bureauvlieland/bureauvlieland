import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

/**
 * Lint-style regressietests voor de configurator-submit flow.
 *
 * Twee bugs uit het verleden mogen NOOIT terugkeren:
 *
 * 1. `toISOString().split("T")[0]` voor selected_dates → UTC-shift bug,
 *    klantdatum komt 1 dag eerder binnen.
 * 2. Inserten van `program_requests` voordat we hebben gevalideerd dat alle
 *    cart-items hun bouwsteen vinden in `allBlocks` → lege aanvragen in admin
 *    wanneer `usePublishedBuildingBlocks` nog niet is geresolved.
 *
 * Deze test grep't direct in de bronbestanden zodat een onschuldige edit (of
 * een copy-paste uit een andere component) onmiddellijk een rood vinkje
 * oplevert in CI, niet pas in productie.
 */
const CONFIGURATOR_FILES = [
  "src/components/configurator/CheckoutContactForm.tsx",
  "src/components/configurator/RequestFormModal.tsx",
];

const read = (rel: string) =>
  readFileSync(resolve(process.cwd(), rel), "utf8");

describe("configurator submit — regressie guards", () => {
  for (const file of CONFIGURATOR_FILES) {
    describe(file, () => {
      it("gebruikt NOOIT toISOString().split('T')[0] voor datums", () => {
        const src = read(file);
        // Het exacte bug-patroon, zowel met enkele als dubbele quotes.
        const pattern = /toISOString\(\)\s*\.\s*split\(\s*['"]T['"]\s*\)\s*\[\s*0\s*\]/;
        expect(src).not.toMatch(pattern);
      });

      it("valideert allBlocks vóór de program_requests insert", () => {
        const src = read(file);
        const allBlocksGuardIdx = src.indexOf("allBlocks.length === 0");
        const insertIdx = src.indexOf('from("program_requests")');
        expect(allBlocksGuardIdx).toBeGreaterThan(-1);
        expect(insertIdx).toBeGreaterThan(-1);
        expect(allBlocksGuardIdx).toBeLessThan(insertIdx);
      });

      it("doet een rollback-delete als de items-insert faalt", () => {
        const src = read(file);
        // De rollback is een delete op program_requests in dezelfde try-block
        // als de items-insert. Een ruwe maar effectieve check:
        expect(src).toMatch(/from\(\s*["']program_requests["']\s*\)\s*\.delete\(\)/);
      });

      it("bouwt itemsToInsert vóór de program_requests insert", () => {
        const src = read(file);
        const itemsBuildIdx = src.indexOf("const itemsToInsert");
        const requestInsertIdx = src.indexOf('from("program_requests")\n        .insert');
        expect(itemsBuildIdx).toBeGreaterThan(-1);
        expect(requestInsertIdx).toBeGreaterThan(-1);
        expect(itemsBuildIdx).toBeLessThan(requestInsertIdx);
      });
    });
  }
});
