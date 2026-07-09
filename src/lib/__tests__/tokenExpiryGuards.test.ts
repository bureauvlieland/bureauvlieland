/**
 * Source-grep guard: elke edge function die een klant-/logies-/partner-token
 * uit de URL of body accepteert, MOET `expires_at` verifiëren. Zonder deze
 * check blijft een verlopen link eindeloos bruikbaar en lekt data.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { resolve, join } from "node:path";

const TOKEN_FUNCTIONS = [
  "resolve-customer-token",
  "get-customer-program",
  "get-customer-accommodation-thread",
  "send-customer-accommodation-message",
  "get-accommodation-portal",
  "select-accommodation-quote",
  "cancel-program-request",
  "update-customer-program",
  "save-program-draft",
  "get-program-draft",
  "project-documents",
];

describe("token-based edge functions — expires_at guard", () => {
  for (const fn of TOKEN_FUNCTIONS) {
    it(`${fn}: verifieert expires_at`, () => {
      const path = resolve(process.cwd(), `supabase/functions/${fn}/index.ts`);
      if (!existsSync(path)) return; // tolerant voor renames
      const src = readFileSync(path, "utf8");
      expect(
        src,
        `${fn} raakt tokens aan zonder expires_at check`,
      ).toMatch(/expires_at/);
    });
  }
});

describe("token-functies geven een foutrespons bij ongeldig/verlopen token", () => {
  for (const fn of TOKEN_FUNCTIONS) {
    it(`${fn}: heeft een non-200 foutpad`, () => {
      const path = resolve(process.cwd(), `supabase/functions/${fn}/index.ts`);
      if (!existsSync(path)) return;
      const src = readFileSync(path, "utf8");
      const hasErrorPath =
        /status:\s*(400|401|403|404|410|500)/.test(src) ||
        /\bjson\s*\(\s*(400|401|403|404|410|500)/.test(src);
      expect(
        hasErrorPath,
        `${fn} heeft geen expliciet foutstatus-pad`,
      ).toBe(true);
    });
  }
});
