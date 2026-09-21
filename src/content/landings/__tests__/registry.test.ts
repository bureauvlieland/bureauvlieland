import { describe, expect, it } from "vitest";
import { ACTIVITY_LANDINGS, LANDINGS } from "..";
import { ACTIVITY_LANDING_PATHS, ALL_LANDING_PATHS, LANDING_PATHS } from "../paths";

const ALL = [...LANDINGS, ...ACTIVITY_LANDINGS];

describe("landingspagina's", () => {
  it("registreert precies de paden uit paths.ts, in dezelfde volgorde", () => {
    expect(LANDINGS.map((c) => c.path)).toEqual([...LANDING_PATHS]);
    expect(ACTIVITY_LANDINGS.map((c) => c.path)).toEqual([...ACTIVITY_LANDING_PATHS]);
    expect(ALL.map((c) => c.path)).toEqual([...ALL_LANDING_PATHS]);
  });

  it("heeft per pagina een slug die bij het pad hoort en unieke paden", () => {
    for (const c of ALL) expect(c.path).toBe(`/${c.slug}`);
    expect(new Set(ALL.map((c) => c.path)).size).toBe(ALL.length);
  });

  it("linkt alleen naar bestaande landingspagina's of andere bekende paden", () => {
    const known = new Set<string>([
      ...ALL_LANDING_PATHS,
      "/logies-vlieland",
      "/catering",
      "/activiteiten-vlieland",
      "/voor-wie",
      "/voorbeeldprogrammas",
      "/programma-samenstellen",
      "/programma-op-maat",
      "/snel-aanvragen",
    ]);
    for (const c of ALL) {
      for (const l of c.also) expect(known.has(l.to.split("?")[0]), `${c.slug} → ${l.to}`).toBe(true);
      if ("parent" in c && c.parent) expect(known.has(c.parent.to), `${c.slug} ouder ${c.parent.to}`).toBe(true);
    }
    for (const c of ACTIVITY_LANDINGS) {
      expect(known.has(c.booking.requestPath.split("?")[0])).toBe(true);
      expect(known.has(c.booking.groupRequestPath.split("?")[0])).toBe(true);
    }
  });

  it("spreekt de lezer aan met u", () => {
    const text = JSON.stringify(ALL, (_k, v) => (typeof v === "function" ? undefined : v));
    expect(text).not.toMatch(/\b(je|jij|jouw|jullie)\b/i);
  });
});
