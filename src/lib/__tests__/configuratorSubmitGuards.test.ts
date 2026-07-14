import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

/**
 * Lint-style regressietests voor de configurator-submit flow.
 *
 * Bugs die NOOIT mogen terugkeren:
 *
 * 1. `toISOString().split("T")[0]` voor selected_dates → UTC-shift bug,
 *    klantdatum komt 1 dag eerder binnen.
 * 2. Lege self-service aanvraag (program_requests zonder items) in admin.
 *    Beide inserts MOETEN atomair via de RPC
 *    `submit_self_service_program_request` lopen, niet als twee losse
 *    PostgREST-calls — die zijn niet transactioneel en kunnen halverwege breken.
 */
const CONFIGURATOR_FILES = [
  "src/components/configurator/CheckoutContactForm.tsx",
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
        expect(src).toMatch(/format\([^,]+,\s*["']yyyy-MM-dd["']/);
      });

      it("aborteert wanneer cart leeg is — geen request mag binnenkomen", () => {
        const src = read(file);
        expect(src).toMatch(/cartItems\.length\s*===\s*0/);
      });

      it("valideert allBlocks vóór de submit", () => {
        const src = read(file);
        expect(src.indexOf("allBlocks.length === 0")).toBeGreaterThan(-1);
      });

      it("detecteert ontbrekende bouwstenen en aborteert vóór submit", () => {
        const src = read(file);
        expect(src).toMatch(/missing[^=]*=\s*resolvedItems\.filter|missing[^=]*=\s*[^.]*\.filter\(/);
        expect(src).toMatch(/missing\.length\s*>\s*0/);
      });

      it("bouwt itemsToInsert vóór de submit", () => {
        const src = read(file);
        expect(src.indexOf("const itemsToInsert")).toBeGreaterThan(-1);
      });

      it("verstuurt aanvraag atomair via RPC submit_self_service_program_request", () => {
        const src = read(file);
        // De atomaire RPC vervangt de oude twee-stappen-insert (request + items).
        expect(src).toMatch(/supabase\.rpc\(\s*["']submit_self_service_program_request["']/);
      });

      it("doet GEEN losse PostgREST insert op program_requests vanuit de configurator", () => {
        const src = read(file);
        // Direct .from('program_requests').insert(...) is niet transactioneel
        // en kan halverwege breken — alleen de RPC mag deze insert doen.
        const directInsert = /from\(\s*["']program_requests["']\s*\)\s*\n?\s*\.insert/;
        expect(src).not.toMatch(directInsert);
      });

      it("blokkeert lege itemsToInsert vóór de submit-call", () => {
        const src = read(file);
        expect(src).toMatch(/itemsToInsert\.length\s*===\s*0/);
        const guardIdx = src.search(/itemsToInsert\.length\s*===\s*0/);
        const rpcIdx = src.search(/supabase\.rpc\(\s*["']submit_self_service_program_request["']/);
        expect(guardIdx).toBeGreaterThan(-1);
        expect(rpcIdx).toBeGreaterThan(-1);
        expect(guardIdx).toBeLessThan(rpcIdx);
      });
    });
  }

  it("CheckoutContactForm blokkeert duplicaten op customer_email binnen tijdvenster", () => {
    const src = read("src/components/configurator/CheckoutContactForm.tsx");
    expect(src).toMatch(/customer_email/);
    expect(src).toMatch(/gte\(\s*["']created_at["']/);
  });
});
