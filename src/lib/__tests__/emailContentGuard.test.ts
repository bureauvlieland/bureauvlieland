/**
 * Inhoudsbewaking van alle mailteksten (docs/plan-notificaties.md, fase 3):
 * de audit van 21 november vond oude adressen, oude factuurinstructies en
 * dode routes in templates en inline HTML. Deze test leest de bron zelf
 * (edge functions, _shared en elke migratie die email_templates raakt) en
 * eist:
 *
 *  1. geen oude adressen: inkoop@reply…, info@bureauvlieland…,
 *     administratie@bureauvlieland…;
 *  2. geen "upload" of "registreer" binnen 200 tekens van "factuur" (de
 *     factuurroute is de inkoop-inbox: pdf mailen naar invoices@reply…);
 *     commentaarregels (--, // of een *-regel in een blokcommentaar) tellen
 *     niet mee, en de opruimmigratie van de dode templates (20261121150000)
 *     evenmin;
 *  3. elke vaste route in een link (`bureauvlieland.nl/<pad>` of
 *     `${…}/<pad>` achter een URL-achtige expressie zoals baseUrl, origin,
 *     portalLink) bestaat als `path="…"` in src/App.tsx; een `${…}`-segment
 *     matcht een routeparameter (`:id`). Een `${naam}` die in hetzelfde
 *     bestand als `const naam = \`${…}/pad\`` is gedefinieerd wordt één
 *     niveau uitgevouwen, zodat `${portalLink}/login` als `/partner/login/login`
 *     wordt getoetst.
 *
 * Migraties: alleen die vanaf 20261121 (fase 1 van het notificatieplan, toen
 * deze regels zijn afgesproken); oudere migraties beschrijven de werkwijze van
 * toen en zijn door latere migraties overschreven. De oude zin in een
 * `replace(body_html, $old$…$old$, …)` telt niet mee: die wordt juist
 * weggehaald.
 *
 * Zie emailTypeLabelsContract.test.ts voor hetzelfde bron-grep-patroon.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { resolve, join, relative, basename, dirname } from "node:path";

const ROOT = process.cwd();
const FUNCTIONS_ROOT = resolve(ROOT, "supabase/functions");
const MIGRATIONS_ROOT = resolve(ROOT, "supabase/migrations");
const APP_TSX = resolve(ROOT, "src/App.tsx");

/** Migraties die bewust oude teksten citeren (verwijderen van dode templates, WP6). */
const EXEMPT_MIGRATIONS = new Set(["20261121150000_dode-templates.sql"]);

/**
 * De oude registratieroute voor partnerfacturen (portaal typt bedragen in).
 * Staat sinds 17 november achter een noodrem-instelling en verdwijnt in fase 4
 * van docs/plan-inkoopfacturen-via-inbox.md; tot die tijd mag "registreren"
 * daar nog voorkomen. Haal een bestand hier weg zodra het verwijderd is.
 */
const LEGACY_REGISTRATION_FUNCTIONS = new Set([
  "register-partner-invoice",
  "register-accommodation-invoice",
  "attach-accommodation-invoice-pdf",
  "generate-payment-batch",
]);
const isLegacyRegistration = (p: string) =>
  LEGACY_REGISTRATION_FUNCTIONS.has(basename(dirname(p)));

const isTestFile = (name: string) => /(_test|\.test)\.tsx?$/.test(name);

function* walk(dir: string): Generator<string> {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) yield* walk(p);
    else yield p;
  }
}

/** Alle index.ts van de edge functions en de niet-testbestanden in _shared. */
function functionSources(): string[] {
  const files: string[] = [];
  for (const p of walk(FUNCTIONS_ROOT)) {
    const name = basename(p);
    if (isTestFile(name)) continue;
    const rel = relative(FUNCTIONS_ROOT, p);
    if (rel.startsWith("_shared/") && /\.ts$/.test(name)) files.push(p);
    else if (name === "index.ts") files.push(p);
  }
  return files.sort();
}

/** Vanaf fase 1 van het notificatieplan (21 november 2026). */
const MIGRATION_CUTOFF = "20261121";

/** Migraties die email_templates raken, vanaf de cutoff. */
function templateMigrations(): string[] {
  return readdirSync(MIGRATIONS_ROOT)
    .filter((n) => n.endsWith(".sql") && n >= MIGRATION_CUTOFF)
    .map((n) => join(MIGRATIONS_ROOT, n))
    .filter((p) => /email_templates/.test(readFileSync(p, "utf8")))
    .sort();
}

const rel = (p: string) => relative(ROOT, p);

/**
 * Verwijdert commentaarregels (--, //, blokcommentaar-regels met *) en de
 * oude zinnen in $old$…$old$ (die worden door de migratie juist vervangen),
 * zodat uitleg over oude teksten niet meetelt.
 */
function withoutCommentLines(src: string): string {
  return src
    .replace(/\$old\$[\s\S]*?\$old\$/g, "$old$…$old$")
    .split("\n")
    .map((line) => (/^\s*(--|\/\/|\/\*|\*)/.test(line) ? "" : line))
    .join("\n");
}

const FORBIDDEN_ADDRESSES = [/inkoop@reply/i, /info@bureauvlieland/i, /administratie@bureauvlieland/i];

describe("emailContentGuard: oude adressen", () => {
  it("komen in geen edge function, _shared-bestand of templatemigratie voor", () => {
    const hits: string[] = [];
    for (const p of [...functionSources(), ...templateMigrations()]) {
      if (EXEMPT_MIGRATIONS.has(basename(p))) continue;
      const src = withoutCommentLines(readFileSync(p, "utf8"));
      for (const re of FORBIDDEN_ADDRESSES) {
        const m = src.match(re);
        if (m) hits.push(`${rel(p)}: ${m[0]}`);
      }
    }
    expect(hits, `Oude adressen gevonden:\n${hits.join("\n")}`).toEqual([]);
  });
});

describe("emailContentGuard: factuurinstructie", () => {
  it("vraagt nergens meer om uploaden of registreren van een factuur", () => {
    const hits: string[] = [];
    const WINDOW = 200;
    for (const p of [...functionSources(), ...templateMigrations()]) {
      if (EXEMPT_MIGRATIONS.has(basename(p))) continue;
      if (isLegacyRegistration(p)) continue;
      const src = withoutCommentLines(readFileSync(p, "utf8"));
      const re = /factuur/gi;
      let m: RegExpExecArray | null;
      while ((m = re.exec(src))) {
        const window = src.slice(Math.max(0, m.index - WINDOW), m.index + m[0].length + WINDOW);
        const bad = window.match(/upload|registreer/i);
        if (bad) {
          const line = src.slice(0, m.index).split("\n").length;
          hits.push(`${rel(p)}:${line} — "${bad[0]}" bij "factuur": …${window.replace(/\s+/g, " ").slice(0, 160)}…`);
          // Eén melding per plek is genoeg.
          re.lastIndex = m.index + WINDOW;
        }
      }
    }
    expect(hits, `Oude factuurinstructie gevonden:\n${hits.join("\n")}`).toEqual([]);
  });
});

/** Routes uit src/App.tsx, als segmentlijsten. */
function appRoutes(): string[][] {
  const src = readFileSync(APP_TSX, "utf8");
  const routes: string[][] = [];
  for (const m of src.matchAll(/path="([^"]+)"/g)) {
    if (m[1] === "*") continue;
    routes.push(splitPath(m[1]));
  }
  return routes;
}

function splitPath(path: string): string[] {
  return path.replace(/[?#].*$/, "").split("/").filter(Boolean);
}

const PLACEHOLDER = /^\$\{.*\}$/;

function routeExists(segments: string[], routes: string[][]): boolean {
  return routes.some(
    (route) =>
      route.length === segments.length &&
      route.every((seg, i) => seg === segments[i] || seg.startsWith(":") || PLACEHOLDER.test(segments[i])),
  );
}

/** Paden die geen app-routes zijn: Supabase-API's en statische bestanden. */
const NOT_A_ROUTE_PREFIX = ["functions", "rest", "auth", "storage", "realtime"];

/** Een `${…}`-expressie die op een basis-URL van de app lijkt (niet een externe API, bedrag of score). */
const URL_LIKE_EXPRESSION = /getPortalBaseUrl|baseUrl|base\b|origin|portal|siteUrl|adminUrl|url\b|Link\b|link\b/;

/**
 * `const naam = \`${…}/pad\`` of `const naam = "https://bureauvlieland.nl/pad"`
 * in hetzelfde bestand: het vaste pad achter de naam, één niveau diep.
 */
function definedPrefixes(src: string): Map<string, string> {
  const map = new Map<string, string>();
  for (const m of src.matchAll(/const\s+(\w+)\s*=\s*`\$\{[^}]*\}(\/[A-Za-z0-9\-_/]*)`/g)) map.set(m[1], m[2]);
  for (const m of src.matchAll(/const\s+(\w+)\s*=\s*"https:\/\/bureauvlieland\.nl(\/[A-Za-z0-9\-_/]*)"/g)) map.set(m[1], m[2]);
  return map;
}

/**
 * Vaste paden uit de bron: `bureauvlieland.nl/<pad>` en `${…}/<pad>`.
 * Een pad dat met een placeholder begint (`${a}/${b}`) is geen route.
 */
function fixedPaths(src: string): string[] {
  const out: string[] = [];
  const prefixes = definedPrefixes(src);
  const patterns = [
    /bureauvlieland\.nl(\/[A-Za-z0-9\-_./${}():?=&]*)/g,
    /\$\{([^}]*)\}(\/[A-Za-z0-9\-_./${}():?=&]*)/g,
  ];
  for (const re of patterns) {
    for (const m of src.matchAll(re)) {
      let raw: string;
      if (m.length === 3) {
        const expr = m[1].trim();
        if (!URL_LIKE_EXPRESSION.test(expr)) continue;
        raw = (prefixes.get(expr) ?? "") + m[2];
      } else {
        raw = m[1];
      }
      raw = raw.replace(/[.,;:)]+$/, "");
      const segments = splitPath(raw);
      if (segments.length === 0) continue; // "/" of "/?chat=open": de homepage
      if (PLACEHOLDER.test(segments[0])) continue;
      if (NOT_A_ROUTE_PREFIX.includes(segments[0])) continue;
      if (/\.[a-z0-9]{2,5}$/i.test(segments[segments.length - 1])) continue; // bestand (logo, pdf)
      out.push(segments.join("/"));
    }
  }
  return out;
}

describe("emailContentGuard: routes in links", () => {
  it("elke vaste route in een mail of melding bestaat in src/App.tsx", () => {
    const routes = appRoutes();
    expect(routes.length).toBeGreaterThan(50);
    const missing: string[] = [];
    for (const p of [...functionSources(), ...templateMigrations()]) {
      const src = withoutCommentLines(readFileSync(p, "utf8"));
      for (const path of new Set(fixedPaths(src))) {
        if (!routeExists(path.split("/"), routes)) missing.push(`${rel(p)}: /${path}`);
      }
    }
    expect(missing, `Routes die niet in App.tsx bestaan:\n${missing.join("\n")}`).toEqual([]);
  });
});
