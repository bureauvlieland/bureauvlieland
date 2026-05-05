import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

const SRC = resolve(__dirname, "../..");
const APP_TSX = resolve(SRC, "App.tsx");

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

function extractRoutes(): { exact: Set<string>; prefixes: string[] } {
  const src = readFileSync(APP_TSX, "utf8");
  const exact = new Set<string>();
  const prefixes: string[] = [];

  // <Route path="..." />
  const routeRe = /<Route\s+path=["']([^"']+)["']/g;
  let m: RegExpExecArray | null;
  while ((m = routeRe.exec(src))) {
    const path = m[1];
    if (path === "*") continue;
    if (path.includes(":")) {
      // dynamic segment — record the static prefix before the first ':'
      const prefix = path.slice(0, path.indexOf(":")).replace(/\/$/, "");
      if (prefix) prefixes.push(prefix);
    } else {
      exact.add(path);
    }
  }
  // NotFound legacy redirects in NotFound.tsx are also valid destinations,
  // but we only check that <Link to="..."> targets resolve in App routes.
  return { exact, prefixes };
}

function extractLinks(): Array<{ file: string; to: string }> {
  const files = walk(SRC);
  const links: Array<{ file: string; to: string }> = [];
  // Match <Link to="..."> with literal string only (skip template/expressions)
  const linkRe = /<Link\b[^>]*\bto=\{?["'`]([^"'`{}\n]+)["'`]\}?/g;
  for (const f of files) {
    const src = readFileSync(f, "utf8");
    let m: RegExpExecArray | null;
    while ((m = linkRe.exec(src))) {
      const raw = m[1];
      // strip query/hash
      const path = raw.split("?")[0].split("#")[0];
      if (!path.startsWith("/")) continue;
      links.push({ file: f, to: path });
    }
  }
  return links;
}

describe("internal route integrity", () => {
  const { exact, prefixes } = extractRoutes();
  const links = extractLinks();

  const isResolvable = (p: string) =>
    exact.has(p) || prefixes.some((pre) => p === pre || p.startsWith(pre + "/") || p.startsWith(pre));

  it("App.tsx defines /programma-op-maat and /voorbeeldprogrammas", () => {
    expect(exact.has("/programma-op-maat")).toBe(true);
    expect(exact.has("/voorbeeldprogrammas")).toBe(true);
  });

  it("every <Link to=\"/programma-op-maat\"> resolves to a defined route", () => {
    const targets = links.filter((l) => l.to === "/programma-op-maat");
    expect(targets.length).toBeGreaterThan(0);
    for (const t of targets) expect(isResolvable(t.to)).toBe(true);
  });

  it("every <Link to=\"/voorbeeldprogrammas\"> resolves to a defined route", () => {
    const targets = links.filter((l) => l.to === "/voorbeeldprogrammas");
    expect(targets.length).toBeGreaterThan(0);
    for (const t of targets) expect(isResolvable(t.to)).toBe(true);
  });

  it("no internal <Link> points to an undefined route", () => {
    const broken = links.filter((l) => !isResolvable(l.to));
    if (broken.length) {
      const summary = broken.map((b) => `  ${b.to}  (in ${b.file.replace(SRC, "src")})`).join("\n");
      throw new Error(`Found ${broken.length} broken internal links:\n${summary}`);
    }
  });
});
