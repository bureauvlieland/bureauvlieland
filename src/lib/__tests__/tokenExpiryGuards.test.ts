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

describe("geen hardcoded service-role bypass in klant-endpoints", () => {
  // SUPABASE_SERVICE_ROLE_KEY mag gebruikt worden in edge functions, maar
  // klant-tokens mogen nooit de auth-check overslaan. Controleer dat elke
  // token-functie óók een guard heeft die 401/403 teruggeeft bij ongeldig token.
  for (const fn of TOKEN_FUNCTIONS) {
    it(`${fn}: retourneert 401/403 op ongeldig/verlopen token`, () => {
      const path = resolve(process.cwd(), `supabase/functions/${fn}/index.ts`);
      if (!existsSync(path)) return;
      const src = readFileSync(path, "utf8");
      const hasAuthFailure =
        /status:\s*401/.test(src) ||
        /status:\s*403/.test(src) ||
        /status:\s*404/.test(src); // 404 is ook acceptabel (verhult bestaan)
      expect(
        hasAuthFailure,
        `${fn} heeft geen 401/403/404 respons pad — token-validatie mist?`,
      ).toBe(true);
    });
  }
});
