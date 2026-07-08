import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "fs";
import { join, resolve } from "path";

const SRC = resolve(process.cwd(), "src");
const APP_TSX = join(SRC, "App.tsx");

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    const s = statSync(p);
    if (s.isDirectory()) {
      if (entry === "node_modules" || entry === "__tests__") continue;
      walk(p, out);
    } else if (/\.(tsx?|jsx?)$/.test(entry)) {
      out.push(p);
    }
  }
  return out;
}

function extractRoutes() {
  const src = readFileSync(APP_TSX, "utf8");
  const exact = new Set<string>();
  const prefixes: string[] = [];
  const routeRe = /<Route\s+path=["']([^"']+)["']/g;
  let m: RegExpExecArray | null;
  while ((m = routeRe.exec(src))) {
    const path = m[1];
    if (path === "*") continue;
    if (path.includes(":")) {
      const prefix = path.slice(0, path.indexOf(":")).replace(/\/$/, "");
      if (prefix) prefixes.push(prefix);
    } else {
      exact.add(path);
    }
  }
  return { exact, prefixes };
}

function extractLinks() {
  const files = walk(SRC);
  const links: Array<{ file: string; to: string; kind: string }> = [];

  const linkRe = /<Link\b[^>]*\bto=\{?["'`]([^"'`{}\n]+)["'`]\}?/g;
  const aRe = /<a\b[^>]*\bhref=\{?["'`](\/[^"'`{}\n]*)["'`]\}?/g;
  const objRe = /\b(?:href|link|to|path)\s*:\s*["'`](\/[^"'`{}\n]*)["'`]/g;

  for (const f of files) {
    if (f.endsWith(".test.ts") || f.endsWith(".test.tsx")) continue;
    const src = readFileSync(f, "utf8");
    for (const re of [linkRe, aRe, objRe]) {
      let m: RegExpExecArray | null;
      const kind = re === linkRe ? "Link" : re === aRe ? "anchor" : "obj";
      while ((m = re.exec(src))) {
        const path = m[1].split("?")[0].split("#")[0];
        if (!path.startsWith("/")) continue;
        if (path.startsWith("/api/") || path.startsWith("/assets/")) continue;
        if (/\.[a-z0-9]{2,5}$/i.test(path)) continue;
        links.push({ file: f, to: path, kind });
      }
    }
  }
  return links;
}

const isResolvable = (p: string, exact: Set<string>, prefixes: string[]) =>
  exact.has(p) || prefixes.some((pre) => p === pre || p.startsWith(pre + "/"));

describe("Route integrity", () => {
  const { exact, prefixes } = extractRoutes();
  const links = extractLinks();

  it("App.tsx bevat de verwachte routes", () => {
    expect(exact.has("/programma-op-maat")).toBe(true);
    expect(exact.has("/voorbeeldprogrammas")).toBe(true);
  });

  it("elke interne <Link> target lost op naar een gedefinieerde route", () => {
    const broken = links.filter((l) => !isResolvable(l.to, exact, prefixes));
    expect(broken).toEqual([]);
  });

  it("programma-op-maat en voorbeeldprogrammas hebben minstens één link", () => {
    expect(links.some((l) => l.to === "/programma-op-maat")).toBe(true);
    expect(links.some((l) => l.to === "/voorbeeldprogrammas")).toBe(true);
  });
});
