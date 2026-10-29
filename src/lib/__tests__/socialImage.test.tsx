import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { Helmet } from "react-helmet";
import { describe, expect, it } from "vitest";
import { socialImageMeta, socialImageUrl } from "../socialImage";

describe("deelplaatje (og:image)", () => {
  it("maakt van een pad onder public een absolute URL en laat een absolute URL staan", () => {
    expect(socialImageUrl("/og/contact.jpg")).toBe("https://bureauvlieland.nl/og/contact.jpg");
    expect(socialImageUrl("https://x.supabase.co/a.jpg")).toBe("https://x.supabase.co/a.jpg");
  });

  it("zet de tags in de head via Helmet, met maten voor een vast plaatje", () => {
    renderToStaticMarkup(<Helmet>{socialImageMeta("/og/contact.jpg")}</Helmet>);
    const head = Helmet.renderStatic().meta.toString();
    expect(head).toContain('property="og:image" content="https://bureauvlieland.nl/og/contact.jpg"');
    expect(head).toContain('property="og:image:width" content="1200"');
    expect(head).toContain('property="og:image:height" content="630"');
  });

  it("geeft bij een externe foto geen maten mee", () => {
    renderToStaticMarkup(<Helmet>{socialImageMeta("https://x.supabase.co/a.jpg")}</Helmet>);
    const head = Helmet.renderStatic().meta.toString();
    expect(head).toContain('content="https://x.supabase.co/a.jpg"');
    expect(head).not.toContain("og:image:width");
  });

  it("verwijst in de code alleen naar deelplaatjes die in public/og bestaan", async () => {
    const { globSync } = await import("node:fs");
    const files = globSync("src/**/*.{ts,tsx}", { cwd: resolve(__dirname, "../../..") });
    const missing = new Set<string>();
    const { readFileSync } = await import("node:fs");
    for (const f of files) {
      const text = readFileSync(resolve(__dirname, "../../..", f), "utf8");
      for (const m of text.matchAll(/"(\/og\/[a-z0-9-]+\.jpg)"/g)) {
        if (!existsSync(resolve(__dirname, "../../../public", m[1].slice(1)))) missing.add(`${f}: ${m[1]}`);
      }
    }
    expect([...missing]).toEqual([]);
  });
});
