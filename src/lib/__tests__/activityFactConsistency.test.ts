import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  ACTIVITY_PAGE_MAP,
  canonicalTextFor,
  extractDurations,
  extractGroupSizes,
  extractPrices,
  extractPageFactText,
  findFactViolations,
  formatViolations,
} from "../activityFactConsistency";
import { activityContent } from "@/content/activityContent";

const root = resolve(__dirname, "../../..");

describe("extractors", () => {
  it("leest duur in minuten en uren, ook als bereik", () => {
    expect(extractDurations("Circa 45 minuten varen")).toEqual([45]);
    expect(extractDurations("ongeveer 1,5 uur")).toEqual([90]);
    expect(extractDurations("Doorgaans 2 tot 3 uur")).toEqual([120, 180]);
  });

  it("leest euro-bedragen", () => {
    expect(extractPrices("€32,50 p.p. — hele boot €425")).toEqual([32.5, 425]);
  });

  it("leest groepsgroottes", () => {
    expect(extractGroupSizes("vanaf 10 personen, maximaal 40 deelnemers")).toEqual([10, 40]);
    expect(extractGroupSizes("10 tot 40 personen")).toEqual([10, 40]);
  });
});

describe("extractPageFactText", () => {
  it("pakt alleen de FAQ-array en het KeyFacts-blok", () => {
    const src = `const OTHER = "€999";\nconst FAQ = [{ q: "x", a: "€10" }];\n<KeyFacts facts={[{ value: "2 uur" }]} />\n<p>€888</p>`;
    const text = extractPageFactText(src);
    expect(text).toContain("€10");
    expect(text).toContain("2 uur");
    expect(text).not.toContain("€999");
    expect(text).not.toContain("€888");
  });
});

describe("findFactViolations", () => {
  it("meldt een prijs die niet in de content staat", () => {
    const violations = findFactViolations(
      "page.tsx",
      "test",
      `const FAQ = [{ q: "Prijs?", a: "€25 per persoon" }];`,
      "De tocht kost €32,50 per persoon.",
    );
    expect(violations).toHaveLength(1);
    expect(violations[0].kind).toBe("prijs");
    expect(violations[0].value).toBe("€25,00");
  });

  it("accepteert waarden die letterlijk in de content staan", () => {
    const violations = findFactViolations(
      "page.tsx",
      "test",
      `const FAQ = [{ q: "Duur?", a: "circa 45 minuten, €32,50 p.p." }];`,
      "Duurt ongeveer 45 minuten en kost €32,50 per persoon.",
    );
    expect(violations).toEqual([]);
  });
});

describe("landingspagina's zijn consistent met activityContent", () => {
  it.each(ACTIVITY_PAGE_MAP)("$file", ({ file, slug }) => {
    const entry = activityContent[slug];
    expect(entry, `activityContent mist slug "${slug}"`).toBeTruthy();
    const source = readFileSync(resolve(root, file), "utf8");
    const violations = findFactViolations(file, slug, source, canonicalTextFor(entry));
    expect(formatViolations(violations)).toBe("");
  });
});
