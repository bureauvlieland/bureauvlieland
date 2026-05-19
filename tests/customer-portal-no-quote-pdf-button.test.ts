import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * E2E regression guard
 * ====================
 * De "Bekijk offerte (PDF)"-knop is bewust verwijderd uit de customer portal
 * omdat het programma in de portal de enige bron van waarheid is en de offerte-
 * PDF achter de feiten aanloopt na elke wijziging (zie chat 19 mei 2026).
 *
 * Deze test scant alle componenten onder src/components/customer-portal en
 * src/pages waar de customer-portal op draait, en blokkeert het terugkeren
 * van de knop in welke vorm dan ook:
 *
 *   - letterlijke UI-tekst "Bekijk offerte"
 *   - JSX die op `quote_pdf_url` linkt (window.open / href / src)
 *
 * Voeg een gevallen check toe aan ALLOWED_REFERENCES als een nieuw, bewust
 * gebruik van quote_pdf_url nodig is (bv. admin-only debug-link).
 */

const SCAN_ROOTS = [
  "src/components/customer-portal",
  "src/pages/customer", // alleen scannen als dir bestaat
];

const FORBIDDEN_PATTERNS: Array<{ name: string; regex: RegExp }> = [
  {
    name: 'UI-tekst "Bekijk offerte"',
    regex: /Bekijk\s+offerte/i,
  },
  {
    name: "quote_pdf_url gebruikt in window.open / href / src",
    regex: /quote_pdf_url\s*[,\)]|href=\{[^}]*quote_pdf_url|src=\{[^}]*quote_pdf_url|window\.open\([^)]*quote_pdf_url/,
  },
];

/** Volledige paden die expliciet zijn toegestaan om quote_pdf_url te lezen
 *  (bv. admin-pagina's of niet-zichtbare data-flows). Leeg houden tenzij echt nodig. */
const ALLOWED_FILES = new Set<string>([
  // bv. "src/components/customer-portal/SomeAdminDebugPanel.tsx"
]);

function walk(dir: string): string[] {
  let out: string[] = [];
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const entry of entries) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) out = out.concat(walk(full));
    else if (/\.(tsx?|jsx?)$/.test(entry)) out.push(full);
  }
  return out;
}

describe("Customer-portal regression: geen offerte-PDF-knop", () => {
  const files = SCAN_ROOTS.flatMap(walk);

  it("scant minstens één componentbestand (sanity)", () => {
    expect(files.length).toBeGreaterThan(0);
  });

  for (const { name, regex } of FORBIDDEN_PATTERNS) {
    it(`bevat nergens ${name}`, () => {
      const offenders: Array<{ file: string; line: number; text: string }> = [];

      for (const file of files) {
        if (ALLOWED_FILES.has(file)) continue;
        const content = readFileSync(file, "utf8");
        const lines = content.split("\n");
        lines.forEach((text, idx) => {
          // negeer commentaar-regels die uitleggen waarom de knop weg is
          const trimmed = text.trim();
          if (trimmed.startsWith("//") || trimmed.startsWith("*") || trimmed.startsWith("/*")) return;
          if (regex.test(text)) {
            offenders.push({ file, line: idx + 1, text: text.trim() });
          }
        });
      }

      if (offenders.length > 0) {
        const msg = offenders
          .map((o) => `  ${o.file}:${o.line}  →  ${o.text}`)
          .join("\n");
        throw new Error(
          `Regressie: offerte-PDF-knop is teruggekeerd in de customer portal.\n${msg}\n\n` +
            `Verwijder de referentie of voeg het bestand toe aan ALLOWED_FILES als het bewust is.`,
        );
      }
      expect(offenders).toEqual([]);
    });
  }
});
