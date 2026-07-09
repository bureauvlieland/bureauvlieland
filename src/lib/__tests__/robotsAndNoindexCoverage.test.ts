/**
 * Contract: robots.txt en Helmet-noindex dekken álle privé-routes.
 *
 * - robots.txt moet `/admin/`, `/partner/`, `/mijn-programma/`,
 *   `/mijn-logies/` en `/programma/` disallowen voor Googlebot, Bingbot én
 *   de default `*` user-agent.
 * - De belangrijkste ingelogde/token-pages moeten in de JSX een
 *   `<meta name="robots" content="noindex...">` bevatten, zodat direct
 *   opgevraagde deep-links ook uit de zoekindex blijven.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const robots = readFileSync(resolve(process.cwd(), "public/robots.txt"), "utf8");

const PRIVATE_PATHS = [
  "/admin/",
  "/partner/",
  "/mijn-programma/",
  "/mijn-logies/",
  "/programma/",
];

const REQUIRED_UAS = ["Googlebot", "Bingbot", "*"];

function blockForUA(src: string, ua: string): string | null {
  const re = new RegExp(`User-agent:\\s*${ua.replace("*", "\\*")}[\\s\\S]*?(?=\\nUser-agent:|$)`, "i");
  const m = src.match(re);
  return m ? m[0] : null;
}

describe("robots.txt — privé-routes zijn disallowed", () => {
  for (const ua of REQUIRED_UAS) {
    it(`user-agent ${ua}: disallowt alle privé-routes`, () => {
      const block = blockForUA(robots, ua);
      expect(block, `geen block voor UA ${ua}`).not.toBeNull();
      for (const path of PRIVATE_PATHS) {
        expect(block!).toMatch(new RegExp(`Disallow:\\s*${path.replace(/\//g, "\\/")}`));
      }
    });
  }

  it("bevat een Sitemap-verwijzing", () => {
    expect(robots).toMatch(/Sitemap:\s*https?:\/\/[^\s]+/);
  });
});

const NOINDEX_PAGES = [
  "src/pages/PartnerPortal.tsx",
  "src/pages/ParticipantProgram.tsx",
  "src/pages/AccommodationQuotes.tsx",
  "src/pages/PartnerBlocks.tsx",
  "src/pages/CustomerProgram.tsx",
];

describe("Helmet noindex — token/portal pages", () => {
  for (const path of NOINDEX_PAGES) {
    it(`${path}: bevat <meta name="robots" content="noindex...">`, () => {
      const src = readFileSync(resolve(process.cwd(), path), "utf8");
      expect(src).toMatch(/name=["']robots["']\s+content=["'][^"']*noindex/i);
    });
  }
});
