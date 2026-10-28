import { describe, expect, it } from "vitest";
import {
  insertRewrites,
  looksComplete,
  rewriteRuleFor,
  routesFromSitemap,
  selectRoutes,
  snapshotFileFor,
} from "../scripts/prerender";

const SITEMAP = `<?xml version="1.0"?><urlset>
  <url><loc>https://bureauvlieland.nl/</loc></url>
  <url><loc>https://bureauvlieland.nl/bedrijfsuitje-vlieland</loc></url>
  <url><loc>https://bureauvlieland.nl/activiteit/lasergamen/</loc></url>
  <url><loc>https://bureauvlieland.nl/bedrijfsuitje-vlieland</loc></url>
  <url><loc>https://elders.nl/niet-van-ons</loc></url>
</urlset>`;

describe("routesFromSitemap", () => {
  it("geeft de eigen paden, zonder slash aan het eind en zonder dubbelen", () => {
    expect(routesFromSitemap(SITEMAP)).toEqual(["/", "/bedrijfsuitje-vlieland", "/activiteit/lasergamen"]);
  });
});

describe("bestanden en rewrites", () => {
  it("zet de homepage op index.html en de rest op <pad>.html", () => {
    expect(snapshotFileFor("/")).toBe("index.html");
    expect(snapshotFileFor("/activiteit/lasergamen")).toBe("activiteit/lasergamen.html");
  });

  it("dwingt alleen de homepage-rewrite af (daar bestaat al een bestand)", () => {
    expect(rewriteRuleFor("/")).toMatch(/^\/\s+\/_prerender\/index\.html\s+200!$/);
    expect(rewriteRuleFor("/catering")).toMatch(/^\/catering\s+\/_prerender\/catering\.html\s+200$/);
  });

  it("zet de rewrites vóór de catch-all en vervangt een eerder blok", () => {
    const redirects = "/oud   /nieuw   301\n/*   /   200\n";
    const once = insertRewrites(redirects, [rewriteRuleFor("/catering")]);
    const lines = once.split("\n");
    expect(lines.findIndex((l) => l.startsWith("/catering"))).toBeLessThan(lines.findIndex((l) => l.startsWith("/*")));
    expect(lines[0]).toBe("/oud   /nieuw   301");

    const twice = insertRewrites(once, [rewriteRuleFor("/contact")]);
    expect(twice).not.toContain("/catering");
    expect(twice.split("\n").filter((l) => l.startsWith("# --- prerender")).length).toBe(1);
  });

  it("laat de catch-all met rust als er niets te prerenderen is", () => {
    expect(insertRewrites("/*   /   200\n", [])).toBe("/*   /   200\n");
  });
});

describe("selectRoutes", () => {
  const all = ["/", "/bedrijfsuitje-vlieland", "/groepsreizen-vlieland", "/wadlopen-vlieland", "/catering", "/activiteit/a", "/activiteit/b"];

  it("neemt in productie alles", () => {
    expect(selectRoutes(all, { CONTEXT: "production" })).toEqual(all);
    expect(selectRoutes(all, { PRERENDER_ALL: "1" })).toEqual(all);
  });

  it("neemt buiten productie de vaste selectie plus één activiteit", () => {
    expect(selectRoutes(all, { CONTEXT: "deploy-preview" })).toEqual([
      "/",
      "/bedrijfsuitje-vlieland",
      "/groepsreizen-vlieland",
      "/wadlopen-vlieland",
      "/activiteit/a",
    ]);
  });

  it("slaat selectiepaden over die niet in de sitemap staan", () => {
    expect(selectRoutes(["/", "/catering"], {})).toEqual(["/"]);
  });
});

describe("looksComplete", () => {
  const inhoud = "x".repeat(600);
  it("accepteert een pagina met kop en inhoud", () => {
    expect(looksComplete(`<html><head><title>Catering</title></head><body><div id="root"><h1>Catering</h1><p>${inhoud}</p></div><script></script></body></html>`)).toBe(true);
  });
  it("weigert een 404, een pagina zonder kop en een lege app", () => {
    expect(looksComplete(`<title>Pagina niet gevonden</title><div id="root"><h1>Hier waait geen pagina.</h1><p>${inhoud}</p></div>`)).toBe(false);
    expect(looksComplete(`<div id="root"><p>${inhoud}</p></div>`)).toBe(false);
    expect(looksComplete(`<div id="root"><h1>Leeg</h1></div>`)).toBe(false);
  });
});
