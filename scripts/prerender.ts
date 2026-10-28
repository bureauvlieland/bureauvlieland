/**
 * Prerendert de publieke pagina's na `vite build`.
 *
 * Waarom: de site is een client-side React-app. Zonder deze stap levert elk
 * adres dezelfde lege `index.html` met de meta-tags van de homepage. Google
 * rendert dat wel (trager), maar Facebook, LinkedIn en WhatsApp voeren geen
 * JavaScript uit en tonen bij elke gedeelde link de homepage-kaart; en de
 * bezoeker kijkt 2 à 3 seconden naar een lege pagina (gemeten 28 oktober 2026).
 *
 * Wat: voor elk adres uit `dist/sitemap.xml` opent een headless Chromium de
 * gebouwde site, wacht tot alles geladen is en schrijft de volledige HTML
 * (titel, meta-tags, JSON-LD en inhoud) naar `dist/_prerender/<pad>.html`.
 * In `dist/_redirects` komt vóór de catch-all per adres een rewrite naar dat
 * bestand. De app start daarna gewoon over de momentopname heen
 * (`createRoot` in `src/main.tsx`), dus de pagina blijft volledig dynamisch.
 *
 * Buiten productie (Netlify `CONTEXT` ≠ production, of lokaal) wordt alleen
 * een kleine vaste selectie geprerenderd, om bouwminuten te sparen;
 * `PRERENDER_ALL=1` dwingt alles af. Lukt het niet om Chromium te starten,
 * dan waarschuwt het script en blijft de site als gewone app werken;
 * `PRERENDER_REQUIRED=1` (CI) maakt daar een harde fout van.
 */
import { execSync } from "node:child_process";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, extname, join, resolve } from "node:path";
import type { AddressInfo } from "node:net";

const BASE_URL = "https://bureauvlieland.nl";
export const OUT_DIR = "_prerender";
const MARKER_START = "# --- prerender (automatisch, scripts/prerender.ts) ---";
const MARKER_END = "# --- einde prerender ---";

/** Pagina's die buiten productie altijd meegaan: genoeg om de werking te controleren. */
export const SUBSET = ["/", "/bedrijfsuitje-vlieland", "/groepsreizen-vlieland", "/wadlopen-vlieland"];

/** Alle paden uit de sitemap, zonder slash aan het eind, in volgorde en zonder dubbelen. */
export function routesFromSitemap(xml: string, baseUrl = BASE_URL): string[] {
  const out: string[] = [];
  for (const m of xml.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/g)) {
    const loc = m[1];
    if (!loc.startsWith(baseUrl)) continue;
    let path = loc.slice(baseUrl.length) || "/";
    if (!path.startsWith("/")) path = `/${path}`;
    if (path.length > 1) path = path.replace(/\/+$/, "");
    if (!out.includes(path)) out.push(path);
  }
  return out;
}

/** Bestandsnaam van de momentopname, relatief aan `dist/_prerender`. */
export function snapshotFileFor(route: string): string {
  return route === "/" ? "index.html" : `${route.replace(/^\//, "")}.html`;
}

/**
 * Rewrite-regel voor `_redirects`. De homepage bestaat als bestand
 * (`index.html`), en Netlify laat een bestaand bestand voorgaan op een
 * rewrite; het uitroepteken dwingt de rewrite daar af.
 */
export function rewriteRuleFor(route: string): string {
  const target = `/${OUT_DIR}/${snapshotFileFor(route)}`;
  return `${route.padEnd(60)} ${target.padEnd(60)} ${route === "/" ? "200!" : "200"}`;
}

/**
 * Zet de rewrites vóór de catch-all (`/*`), want Netlify neemt de eerste
 * regel die past. Een eerder blok (tussen de markers) wordt vervangen.
 */
export function insertRewrites(redirects: string, rules: string[]): string {
  const lines = redirects.replace(/\r\n/g, "\n").split("\n");
  const start = lines.indexOf(MARKER_START);
  const end = lines.indexOf(MARKER_END);
  if (start !== -1 && end > start) lines.splice(start, end - start + 1);
  if (rules.length === 0) return lines.join("\n");
  const block = [MARKER_START, ...rules, MARKER_END, ""];
  const catchAll = lines.findIndex((l) => /^\/\*\s/.test(l));
  if (catchAll === -1) return [...lines, "", ...block].join("\n");
  lines.splice(catchAll, 0, ...block);
  return lines.join("\n");
}

/** Welke paden meegaan: alles in productie of met PRERENDER_ALL=1, anders de vaste selectie. */
export function selectRoutes(all: string[], env: Record<string, string | undefined>): string[] {
  if (env.PRERENDER_ALL === "1" || env.CONTEXT === "production") return all;
  const first = all.find((r) => r.startsWith("/activiteit/"));
  return [...SUBSET, ...(first ? [first] : [])].filter((r, i, arr) => all.includes(r) && arr.indexOf(r) === i);
}

/**
 * Voegt `modulepreload`-links toe voor de JS-chunks die de pagina tijdens de
 * momentopname laadde (de lazy route en haar inhoud), voor zover index.html
 * ze nog niet noemt. Zo haalt de browser ze samen met de hoofdbundel op in
 * plaats van pas nadat React gestart is.
 */
export function injectModulePreloads(html: string, chunkPaths: string[]): string {
  const missing = chunkPaths.filter((p) => /^\/assets\/[^"]+\.js$/.test(p) && !html.includes(`href="${p}"`) && !html.includes(`src="${p}"`));
  if (missing.length === 0) return html;
  const links = missing.map((p) => `<link rel="modulepreload" crossorigin href="${p}">`).join("\n");
  return html.replace("</head>", `${links}\n</head>`);
}

/** Een momentopname die niet af is (404, geen kop, lege app) wordt niet weggeschreven. */
export function looksComplete(html: string): boolean {
  if (!/<h1[\s>]/i.test(html)) return false;
  if (/<title>[^<]*niet gevonden/i.test(html)) return false;
  const root = html.match(/<div id="root">([\s\S]*?)<\/div>\s*<script/i)?.[1] ?? html.match(/<div id="root">([\s\S]*)/i)?.[1] ?? "";
  return root.replace(/<[^>]+>/g, "").trim().length > 500;
}

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".xml": "application/xml",
  ".txt": "text/plain",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".webmanifest": "application/manifest+json",
};

/** Mini-server die `dist` serveert zoals Netlify: bestand als het bestaat, anders de app. */
function serveDist(dist: string) {
  const index = readFileSync(join(dist, "index.html"));
  const handler = (req: IncomingMessage, res: ServerResponse) => {
    const path = decodeURIComponent((req.url ?? "/").split("?")[0]);
    const file = join(dist, path);
    if (path !== "/" && existsSync(file) && statSync(file).isFile()) {
      res.writeHead(200, { "content-type": MIME[extname(file)] ?? "application/octet-stream" });
      res.end(readFileSync(file));
      return;
    }
    res.writeHead(200, { "content-type": MIME[".html"] });
    res.end(index);
  };
  return new Promise<{ origin: string; close: () => void }>((ok) => {
    const server = createServer(handler).listen(0, "127.0.0.1", () => {
      const { port } = server.address() as AddressInfo;
      ok({ origin: `http://127.0.0.1:${port}`, close: () => server.close() });
    });
  });
}

const BLOCKED = /googletagmanager\.com|google-analytics\.com|doubleclick\.net|sentry\.io|ingest\.sentry/;

async function launchBrowser() {
  const { chromium } = await import("@playwright/test");
  const executablePath = process.env.PRERENDER_CHROMIUM_PATH || undefined;
  try {
    return await chromium.launch({ executablePath });
  } catch (err) {
    if (process.env.NETLIFY !== "true" || executablePath) throw err;
    // Eerste build op Netlify (of na een wijziging van de Playwright-versie):
    // de browser staat nog niet in node_modules (PLAYWRIGHT_BROWSERS_PATH=0).
    console.log("[prerender] Chromium ontbreekt, installeren…");
    execSync("npx playwright install chromium", { stdio: "inherit" });
    return await chromium.launch();
  }
}

async function main() {
  const dist = resolve("dist");
  const sitemapPath = join(dist, "sitemap.xml");
  if (!existsSync(join(dist, "index.html")) || !existsSync(sitemapPath)) {
    throw new Error("dist/index.html of dist/sitemap.xml ontbreekt: eerst `vite build` draaien.");
  }
  const all = routesFromSitemap(readFileSync(sitemapPath, "utf8"));
  const routes = selectRoutes(all, process.env);
  console.log(`[prerender] ${routes.length} van ${all.length} pagina's (${process.env.CONTEXT ?? "lokaal"})`);

  let browser;
  try {
    browser = await launchBrowser();
  } catch (err) {
    const msg = err instanceof Error ? err.message.split("\n")[0] : String(err);
    if (process.env.PRERENDER_REQUIRED === "1") throw err;
    console.warn(`[prerender] Chromium start niet (${msg}); de site blijft werken als gewone app, zonder momentopnames.`);
    return;
  }

  const server = await serveDist(dist);
  const written: string[] = [];
  const skipped: string[] = [];
  const started = Date.now();

  try {
    const queue = [...routes];
    const worker = async () => {
      const context = await browser.newContext({
        viewport: { width: 1280, height: 900 },
        locale: "nl-NL",
        reducedMotion: "reduce",
        userAgent: "Mozilla/5.0 (X11; Linux x86_64) BureauVlielandPrerender/1.0 Chrome/131.0 Safari/537.36",
      });
      // Geen cookiebanner in de momentopname, en geen metingen vanuit de build.
      await context.addInitScript(() => {
        try {
          localStorage.setItem(
            "cookie-consent",
            JSON.stringify({ necessary: true, analytics: false, marketing: false, timestamp: Date.now() }),
          );
        } catch {
          /* geen opslag */
        }
      });
      await context.route("**/*", (route) => (BLOCKED.test(route.request().url()) ? route.abort() : route.continue()));
      const page = await context.newPage();
      const chunks = new Set<string>();
      page.on("request", (req) => {
        const url = req.url();
        if (req.resourceType() === "script" && url.startsWith(server.origin)) chunks.add(url.slice(server.origin.length));
      });

      for (let route = queue.shift(); route; route = queue.shift()) {
        chunks.clear();
        try {
          try {
            await page.goto(`${server.origin}${route}`, { waitUntil: "networkidle", timeout: 60_000 });
          } catch {
            await page.goto(`${server.origin}${route}`, { waitUntil: "load", timeout: 60_000 });
            await page.waitForTimeout(3_000);
          }
          // Door de pagina scrollen, zodat `whileInView`-secties hun eindstand bereiken.
          await page.evaluate(async () => {
            const stap = 600;
            for (let y = 0; y < document.body.scrollHeight; y += stap) {
              window.scrollTo(0, y);
              await new Promise((r) => setTimeout(r, 40));
            }
            window.scrollTo(0, 0);
          });
          await page.waitForTimeout(500);
          const rendered = await page.evaluate(() => {
            document
              .querySelectorAll('script[src*="googletagmanager"], [data-radix-portal], [data-sonner-toaster], [data-prerender-remove]')
              .forEach((el) => el.remove());
            document.querySelectorAll<HTMLElement>('[style*="opacity"]').forEach((el) => {
              if (el.style.opacity === "0") {
                el.style.removeProperty("opacity");
                el.style.removeProperty("transform");
              }
            });
            document.body.style.removeProperty("overflow");
            document.body.style.removeProperty("pointer-events");
            return `<!doctype html>\n${document.documentElement.outerHTML}`;
          });
          const html = injectModulePreloads(rendered, [...chunks]);
          if (!looksComplete(html)) {
            skipped.push(route);
            console.warn(`[prerender] overgeslagen (onvolledig): ${route}`);
            continue;
          }
          const file = join(dist, OUT_DIR, snapshotFileFor(route));
          mkdirSync(dirname(file), { recursive: true });
          writeFileSync(file, `${html}\n<!-- prerender ${new Date().toISOString()} -->\n`);
          written.push(route);
        } catch (err) {
          skipped.push(route);
          console.warn(`[prerender] overgeslagen (fout): ${route}: ${err instanceof Error ? err.message.split("\n")[0] : err}`);
        }
      }
      await context.close();
    };
    await Promise.all(Array.from({ length: Math.min(4, routes.length) }, worker));
  } finally {
    await browser.close();
    server.close();
  }

  const redirectsPath = join(dist, "_redirects");
  const current = existsSync(redirectsPath) ? readFileSync(redirectsPath, "utf8") : "";
  const rules = routes.filter((r) => written.includes(r)).map(rewriteRuleFor);
  writeFileSync(redirectsPath, insertRewrites(current, rules));

  const seconds = Math.round((Date.now() - started) / 1000);
  console.log(`[prerender] ${written.length} pagina's weggeschreven, ${skipped.length} overgeslagen, ${seconds}s`);
  if (written.length === 0 && routes.length > 0) {
    throw new Error("geen enkele pagina kon worden geprerenderd");
  }
}

const isDirectRun = typeof process.argv[1] === "string" && import.meta.url === `file://${process.argv[1]}`;

if (isDirectRun) {
  main().catch((err) => {
    console.error("[prerender] mislukt:", err);
    process.exit(1);
  });
}
