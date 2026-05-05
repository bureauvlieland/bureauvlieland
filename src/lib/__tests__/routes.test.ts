/**
 * Route integrity check.
 * Verifies every literal `<Link to="/...">` in the source resolves to a route
 * defined in src/App.tsx. Specifically asserts that links to
 * `/programma-op-maat` and `/voorbeeldprogrammas` exist and resolve.
 *
 * Run: `bun run src/lib/__tests__/routes.test.ts`
 * Exit code 1 on failure.
 */
// @ts-nocheck
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
  const links: Array<{ file: string; to: string }> = [];
  const linkRe = /<Link\b[^>]*\bto=\{?["'`]([^"'`{}\n]+)["'`]\}?/g;
  for (const f of files) {
    const src = readFileSync(f, "utf8");
    let m: RegExpExecArray | null;
    while ((m = linkRe.exec(src))) {
      const path = m[1].split("?")[0].split("#")[0];
      if (!path.startsWith("/")) continue;
      links.push({ file: f, to: path });
    }
  }
  return links;
}

export function runRouteIntegrityChecks(): void {
  const { exact, prefixes } = extractRoutes();
  const links = extractLinks();
  const errors: string[] = [];

  const isResolvable = (p: string) =>
    exact.has(p) || prefixes.some((pre) => p === pre || p.startsWith(pre + "/"));

  if (!exact.has("/programma-op-maat")) errors.push("App.tsx mist route /programma-op-maat");
  if (!exact.has("/voorbeeldprogrammas")) errors.push("App.tsx mist route /voorbeeldprogrammas");

  const checkTarget = (target: string) => {
    const found = links.filter((l) => l.to === target);
    if (found.length === 0) errors.push(`Geen <Link to="${target}"> gevonden in code`);
    for (const l of found) {
      if (!isResolvable(l.to)) errors.push(`Broken link → ${l.to} in ${l.file.replace(SRC, "src")}`);
    }
  };
  checkTarget("/programma-op-maat");
  checkTarget("/voorbeeldprogrammas");

  const broken = links.filter((l) => !isResolvable(l.to));
  for (const b of broken) {
    errors.push(`Broken internal link: ${b.to} (in ${b.file.replace(SRC, "src")})`);
  }

  console.log(`✓ ${exact.size} exact routes, ${prefixes.length} dynamic-prefix routes`);
  console.log(`✓ ${links.length} interne <Link> targets gescand`);

  if (errors.length) {
    console.error(`\n✗ ${errors.length} probleem(en):`);
    for (const e of errors) console.error("  - " + e);
    process.exit(1);
  }
  console.log("✓ Alle routes / links OK");
}

// Auto-run when invoked directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runRouteIntegrityChecks();
}
