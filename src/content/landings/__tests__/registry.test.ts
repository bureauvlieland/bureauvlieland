import { describe, expect, it } from "vitest";
import { LANDINGS } from "..";
import { LANDING_PATHS } from "../paths";

describe("landingspagina's", () => {
  it("registreert precies de paden uit paths.ts, in dezelfde volgorde", () => {
    expect(LANDINGS.map((c) => c.path)).toEqual([...LANDING_PATHS]);
  });

  it("heeft per pagina een slug die bij het pad hoort en unieke paden", () => {
    for (const c of LANDINGS) expect(c.path).toBe(`/${c.slug}`);
    expect(new Set(LANDINGS.map((c) => c.path)).size).toBe(LANDINGS.length);
  });

  it("linkt alleen naar bestaande landingspagina's of andere bekende paden", () => {
    const known = new Set<string>([...LANDING_PATHS, "/logies-vlieland", "/catering", "/activiteiten-vlieland", "/voor-wie", "/voorbeeldprogrammas", "/programma-samenstellen", "/programma-op-maat"]);
    for (const c of LANDINGS) {
      for (const l of c.also) expect(known.has(l.to), `${c.slug} → ${l.to}`).toBe(true);
      if (c.parent) expect(known.has(c.parent.to), `${c.slug} ouder ${c.parent.to}`).toBe(true);
    }
  });

  it("spreekt de lezer aan met u", () => {
    const text = JSON.stringify(LANDINGS, (_k, v) => (typeof v === "function" ? undefined : v));
    expect(text).not.toMatch(/\b(je|jij|jouw|jullie)\b/i);
  });
});
