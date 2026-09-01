/**
 * Contract-tests voor alle edge functions.
 *
 * Waarom: 41 kritieke functies hadden geen enkele automatische test. Volledige
 * Deno-integratietests per functie zijn duur; deze suite dekt de contracten die
 * in productie daadwerkelijk mis kunnen gaan en die voor iedere function gelden:
 *
 *   1. Er is een `index.ts` met een HTTP-handler (serve/Deno.serve).
 *   2. CORS: OPTIONS wordt afgehandeld en er zijn CORS-headers gedefinieerd.
 *   3. Geen hardgecodeerde secrets (Mailjet-keys, JWT's, service-role keys).
 *   4. De service-role key wordt nooit in een response/console gelekt.
 *   5. De coverage-registry (`src/lib/edgeFunctionTestCoverage.ts`) loopt
 *      synchroon met de bestanden op schijf.
 */
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  EDGE_FUNCTION_COVERAGE,
  CONTRACT_TESTED_KINDS,
} from "../src/lib/edgeFunctionTestCoverage";

const FUNCTIONS_DIR = path.resolve(__dirname, "../supabase/functions");

function listFunctionDirs(): string[] {
  return fs
    .readdirSync(FUNCTIONS_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory() && e.name !== "_shared")
    .map((e) => e.name)
    .filter((name) => fs.existsSync(path.join(FUNCTIONS_DIR, name, "index.ts")))
    .sort();
}

function readIndex(name: string): string {
  return fs.readFileSync(path.join(FUNCTIONS_DIR, name, "index.ts"), "utf8");
}

const FUNCTION_DIRS = listFunctionDirs();

/**
 * Functies die per definitie geen CORS-preflight krijgen: OAuth-redirect
 * callbacks worden door de browser als top-level navigatie aangeroepen.
 */
const NO_PREFLIGHT = new Set(["social-meta-oauth-callback"]);

describe("edge function contracts", () => {
  it("vindt edge functions om te controleren", () => {
    expect(FUNCTION_DIRS.length).toBeGreaterThan(50);
  });

  describe.each(FUNCTION_DIRS)("%s", (name) => {
    const source = readIndex(name);

    it("registreert een HTTP-handler", () => {
      expect(/(^|[^.\w])serve\s*\(|Deno\.serve\s*\(/.test(source)).toBe(true);
    });

    it.skipIf(NO_PREFLIGHT.has(name))("handelt de CORS preflight (OPTIONS) af", () => {
      expect(source).toMatch(/OPTIONS/);
      expect(source).toMatch(/Access-Control-Allow-Origin|corsHeaders/);
    });

    it("bevat geen hardgecodeerde secrets", () => {
      // JWT's (service-role/anon keys) en API-secrets horen uit Deno.env te komen.
      expect(source).not.toMatch(/eyJhbGciOi[A-Za-z0-9_-]{10,}/);
      expect(source).not.toMatch(
        /(MAILJET_API_KEY|MAILJET_SECRET_KEY|SERVICE_ROLE_KEY)\s*=\s*["'][^"']{8,}["']/,
      );
    });

    it("lekt de service-role key niet in output", () => {
      const leak =
        /(console\.(log|error|warn)|JSON\.stringify)\([^)]*SERVICE_ROLE_KEY/;
      expect(leak.test(source)).toBe(false);
    });
  });
});

describe("coverage registry synchronisatie", () => {
  const registryNames = EDGE_FUNCTION_COVERAGE.map((r) => r.name).sort();

  it("bevat elke edge function op schijf", () => {
    const missing = FUNCTION_DIRS.filter((n) => !registryNames.includes(n));
    expect(missing, `Ontbreekt in registry: ${missing.join(", ")}`).toEqual([]);
  });

  it("verwijst niet naar verwijderde functions", () => {
    const stale = registryNames.filter((n) => !FUNCTION_DIRS.includes(n));
    expect(stale, `Registry verwijst naar niet-bestaande functies: ${stale.join(", ")}`).toEqual([]);
  });

  it("markeert 'deno' alleen bij een echt testbestand", () => {
    const wrong = EDGE_FUNCTION_COVERAGE.filter((r) => r.testKind === "deno").filter((r) => {
      const dir = path.join(FUNCTIONS_DIR, r.name);
      if (!fs.existsSync(dir)) return true;
      return !fs
        .readdirSync(dir)
        .some((f) => f.endsWith("_test.ts") || f.endsWith(".test.ts"));
    });
    expect(wrong.map((r) => r.name)).toEqual([]);
  });

  it("mist geen bestaande Deno-tests in de registry", () => {
    const withTests = FUNCTION_DIRS.filter((name) =>
      fs
        .readdirSync(path.join(FUNCTIONS_DIR, name))
        .some((f) => f.endsWith("_test.ts") || f.endsWith(".test.ts")),
    );
    const notMarked = withTests.filter(
      (name) =>
        !EDGE_FUNCTION_COVERAGE.some((r) => r.name === name && r.testKind === "deno"),
    );
    expect(notMarked, `Test bestaat maar registry zegt van niet: ${notMarked.join(", ")}`).toEqual([]);
  });

  it("dekt elke kritieke functie minimaal met een contracttest", () => {
    const uncovered = EDGE_FUNCTION_COVERAGE.filter(
      (r) => r.critical && !CONTRACT_TESTED_KINDS.includes(r.testKind ?? "none"),
    );
    expect(uncovered.map((r) => r.name)).toEqual([]);
  });
});
