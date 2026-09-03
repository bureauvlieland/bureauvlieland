// De sitemap-generator overschreef public/sitemap.xml ook wanneer de bron
// onbereikbaar was. Het resultaat: een sitemap zonder de ~50 activiteiten- en
// programmapagina's, een geslaagde build, en niemand die het merkte tot de
// vindbaarheid terugliep.
//
// Deze test legt de regel vast die dat voorkomt.

import { describe, expect, it } from "vitest";
import { isSuspiciouslyEmpty } from "../scripts/generate-sitemap";

describe("isSuspiciouslyEmpty", () => {
  it("slaat alarm als geen van beide bronnen iets opleverde", () => {
    expect(isSuspiciouslyEmpty(0, 0)).toBe(true);
  });

  it.each([
    [12, 0],
    [0, 3],
    [50, 8],
  ])("laat door zodra een bron wél rijen gaf (%i bouwstenen, %i programma's)", (b, t) => {
    expect(isSuspiciouslyEmpty(b, t)).toBe(false);
  });
});

describe("het script als module", () => {
  it("voert bij importeren geen generatie uit", async () => {
    // Zou main() bij import draaien, dan deed deze test een echte netwerkcall
    // naar Supabase en zou hij hier al gefaald zijn.
    const mod = await import("../scripts/generate-sitemap");
    expect(typeof mod.isSuspiciouslyEmpty).toBe("function");
  });
});
