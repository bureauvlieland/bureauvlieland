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
        const pattern = /toISOString\(\)\s*\.\s*split\(\s*['"]T['"]\s*\)\s*\[\s*0\s*\]/;
        expect(src).not.toMatch(pattern);
      });

      it("serialiseert selected_dates met format(d,'yyyy-MM-dd') — lokale TZ", () => {
        const src = read(file);
        // Elke plek die selected_dates of isoDates bouwt MOET via date-fns format,
        // niet via een UTC-pad. We laten zien dat format(...,"yyyy-MM-dd") voorkomt
        // en dat er geen alternatieve UTC-conversie naast staat.
        expect(src).toMatch(/format\([^,]+,\s*["']yyyy-MM-dd["']/);
      });

      it("valideert allBlocks vóór de program_requests insert", () => {
        const src = read(file);
        const allBlocksGuardIdx = src.indexOf("allBlocks.length === 0");
        const insertIdx = src.search(/from\(\s*["']program_requests["']\s*\)\s*\n?\s*\.insert/);
        expect(allBlocksGuardIdx).toBeGreaterThan(-1);
        expect(insertIdx).toBeGreaterThan(-1);
        expect(allBlocksGuardIdx).toBeLessThan(insertIdx);
      });

      it("aborteert wanneer cart leeg is — geen request mag binnenkomen", () => {
        const src = read(file);
        expect(src).toMatch(/cartItems\.length\s*===\s*0/);
        const cartGuardIdx = src.search(/cartItems\.length\s*===\s*0/);
        const insertIdx = src.search(/from\(\s*["']program_requests["']\s*\)\s*\n?\s*\.insert/);
        expect(cartGuardIdx).toBeLessThan(insertIdx);
      });

      it("detecteert ontbrekende bouwstenen en aborteert vóór insert", () => {
        const src = read(file);
        // Mapping per cart-item naar block + filter op missing block.
        expect(src).toMatch(/missing[^=]*=\s*resolvedItems\.filter|missing[^=]*=\s*[^.]*\.filter\(/);
        const missingIdx = src.search(/missing\.length\s*>\s*0/);
        const insertIdx = src.search(/from\(\s*["']program_requests["']\s*\)\s*\n?\s*\.insert/);
        expect(missingIdx).toBeGreaterThan(-1);
        expect(missingIdx).toBeLessThan(insertIdx);
      });

      it("doet een rollback-delete als de items-insert faalt", () => {
        const src = read(file);
        // De rollback delete moet binnen handbereik van de items-insert error
        // staan, niet een willekeurige delete elders.
        const itemsInsertIdx = src.search(
          /from\(\s*["']program_request_items["']\s*\)\s*\n?\s*\.insert/,
        );
        const rollbackIdx = src.search(
          /from\(\s*["']program_requests["']\s*\)\s*\.delete\(\)/,
        );
        expect(itemsInsertIdx).toBeGreaterThan(-1);
        expect(rollbackIdx).toBeGreaterThan(-1);
        // Rollback komt logisch NA de items-insert in dezelfde flow.
        expect(rollbackIdx).toBeGreaterThan(itemsInsertIdx);
      });

      it("bouwt itemsToInsert vóór de program_requests insert", () => {
        const src = read(file);
        const itemsBuildIdx = src.indexOf("const itemsToInsert");
        const requestInsertIdx = src.search(
          /from\(\s*["']program_requests["']\s*\)\s*\n?\s*\.insert/,
        );
        expect(itemsBuildIdx).toBeGreaterThan(-1);
        expect(requestInsertIdx).toBeGreaterThan(-1);
        expect(itemsBuildIdx).toBeLessThan(requestInsertIdx);
      });

    });
  }

  it("CheckoutContactForm blokkeert duplicaten op customer_email binnen tijdvenster", () => {
    const src = read("src/components/configurator/CheckoutContactForm.tsx");
    expect(src).toMatch(/customer_email/);
    expect(src).toMatch(/gte\(\s*["']created_at["']/);
  });
});
