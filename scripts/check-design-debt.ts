/**
 * Ontwerpschuld tellen: losse paletkleuren, knop-overrides, afwijkende
 * hoekradii en schaduwen buiten het ontwerpsysteem. Zelfde plafond-idee als
 * lint en strict-mode in `.github/quality-baselines.env` (DESIGN_DEBT_MAX):
 * het getal mag alleen omlaag. Zie docs/design-systeem.md.
 *
 * Gebruik: `bunx tsx scripts/check-design-debt.ts` (met DESIGN_DEBT_MAX in
 * de omgeving faalt het script boven het plafond; zonder plafond alleen
 * tellen). `--list` toont elke vindplaats.
 *
 * Sinds fase 5 is de regel ook per bestand hard: `.github/design-debt-baseline.json`
 * legt per bestand vast hoeveel vindplaatsen er nu zijn. Een bestand mag
 * daar nooit boven komen, en een bestand dat er niet in staat (nieuw, of
 * al schoon) moet op nul blijven. `--write-baseline` schrijft de stand van
 * nu weg; doe dat na een opruimronde, zodat de lat meteen lager ligt.
 */
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";

const root = resolve(import.meta.dirname ?? ".", "..");
const listAll = process.argv.includes("--list");
const writeBaseline = process.argv.includes("--write-baseline");
const BASELINE_PATH = resolve(root, ".github/design-debt-baseline.json");

// Publieke site en klantportaal. Admin, partner- en logiesportaal volgen later.
const INCLUDE = ["src/pages", "src/components"];
const EXCLUDE = [
  "src/pages/admin",
  "src/components/admin",
  "src/components/partner-portal",
  "src/components/accommodation-portal",
  "src/components/ui",
  "src/components/system",
  "src/pages/Ontwerp.tsx",
];
const EXCLUDE_FILE = /^src\/pages\/Partner[A-Za-z]*\.tsx$|__tests__/;

const PALETTE =
  "(red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|slate|gray|zinc|neutral|stone)";

interface Rule {
  key: string;
  label: string;
  pattern: RegExp;
}

const RULES: Rule[] = [
  {
    key: "palette",
    label: "losse paletkleur (bg-amber-50, text-green-600, …) in plaats van een token",
    pattern: new RegExp(`\\b(?:bg|text|border|from|to|via|ring|fill|stroke)-${PALETTE}-\\d{2,3}\\b`, "g"),
  },
  {
    key: "white-black",
    label: "text-white/bg-white/black in plaats van primary-foreground of ocean-deep",
    pattern: /\b(?:bg|text|border|from|to|via)-(?:white|black)\b/g,
  },
  {
    key: "button-override",
    label: "<Button> met eigen kleur, hoogte of radius in className",
    pattern:
      /<Button\b[^>]*className=["'`][^"'`]*\b(?:bg-accent|bg-primary|bg-white|bg-sunset|bg-sand|bg-ocean-deep|bg-primary-foreground|bg-secondary|h-1[1-6]|rounded-(?:sm|md|lg|xl|full)|text-lg|px-10)\b[^>]*>/gs,
  },
  {
    key: "radius",
    label: "rounded-xl/2xl/3xl (schaal eindigt bij lg)",
    pattern: /\brounded-(?:xl|2xl|3xl)\b/g,
  },
  {
    key: "shadow",
    label: "Tailwind-schaduw (shadow-sm/md/lg/xl/2xl) in plaats van soft/medium/dramatic",
    pattern: /\bshadow-(?:sm|md|lg|xl|2xl)\b/g,
  },
  {
    key: "hsl-literal",
    label: "hsl(var(--…)) met de hand geschreven waar een utility bestaat",
    pattern: /hsl\(var\(--/g,
  },
  {
    key: "eyebrow",
    label: "eigen eyebrow-stijl (uppercase tracking-…) in plaats van SectionHeader",
    pattern: /\buppercase tracking-(?:\[[0-9.]+em\]|widest|wider|wide)\b/g,
  },
];

const walk = (dir: string, out: string[]) => {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const rel = relative(root, full).replace(/\\/g, "/");
    if (EXCLUDE.some((e) => rel === e || rel.startsWith(e + "/"))) continue;
    if (statSync(full).isDirectory()) {
      walk(full, out);
    } else if (/\.tsx?$/.test(name) && !EXCLUDE_FILE.test(rel)) {
      out.push(full);
    }
  }
};

const files: string[] = [];
for (const dir of INCLUDE) walk(resolve(root, dir), files);

const perRule = new Map<string, number>(RULES.map((r) => [r.key, 0]));
const perFile = new Map<string, number>();
const hits: string[] = [];

for (const file of files) {
  const source = readFileSync(file, "utf8");
  const rel = relative(root, file).replace(/\\/g, "/");
  for (const rule of RULES) {
    const matches = [...source.matchAll(rule.pattern)];
    if (matches.length === 0) continue;
    perRule.set(rule.key, (perRule.get(rule.key) ?? 0) + matches.length);
    perFile.set(rel, (perFile.get(rel) ?? 0) + matches.length);
    if (listAll) {
      for (const m of matches) {
        const line = source.slice(0, m.index ?? 0).split("\n").length;
        hits.push(`${rel}:${line} [${rule.key}] ${m[0].replace(/\s+/g, " ").slice(0, 90)}`);
      }
    }
  }
}

const total = [...perRule.values()].reduce((a, b) => a + b, 0);

console.log(`Ontwerpschuld: ${total} vindplaatsen in ${perFile.size} bestanden (${files.length} gescand)`);
for (const rule of RULES) {
  console.log(`  ${String(perRule.get(rule.key) ?? 0).padStart(4)}  ${rule.label}`);
}
const worst = [...perFile.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
console.log("Meeste schuld:");
for (const [file, n] of worst) console.log(`  ${String(n).padStart(4)}  ${file}`);
if (listAll) {
  console.log("");
  for (const h of hits) console.log(h);
}

// Per bestand: de vastgelegde stand mag nooit worden overschreden.
const current: Record<string, number> = Object.fromEntries([...perFile.entries()].sort(([a], [b]) => a.localeCompare(b)));
if (writeBaseline) {
  writeFileSync(BASELINE_PATH, JSON.stringify(current, null, 2) + "\n");
  console.log(`\nBaseline geschreven naar ${relative(root, BASELINE_PATH)} (${perFile.size} bestanden).`);
} else if (existsSync(BASELINE_PATH)) {
  const baseline = JSON.parse(readFileSync(BASELINE_PATH, "utf8")) as Record<string, number>;
  const worse = Object.entries(current).filter(([file, n]) => n > (baseline[file] ?? 0));
  const better = Object.entries(baseline).filter(([file, n]) => (current[file] ?? 0) < n);
  if (worse.length > 0) {
    console.error("\nOntwerpschuld gestegen in:");
    for (const [file, n] of worse) console.error(`  ${file}: ${baseline[file] ?? 0} → ${n}`);
    console.error("Gebruik de tokens en componenten uit docs/design-systeem.md; `--list` toont elke vindplaats.");
    process.exit(1);
  }
  if (better.length > 0) {
    console.log(`\n${better.length} bestand(en) onder hun baseline. Leg de nieuwe stand vast met \`bunx tsx scripts/check-design-debt.ts --write-baseline\`.`);
  }
}

const max = process.env.DESIGN_DEBT_MAX ? Number(process.env.DESIGN_DEBT_MAX) : null;
if (max !== null && Number.isFinite(max)) {
  if (total > max) {
    console.error(`\nOntwerpschuld gestegen van maximaal ${max} naar ${total}. Gebruik de tokens en componenten uit docs/design-systeem.md.`);
    process.exit(1);
  }
  if (total < max) {
    console.log(`\nOnder het plafond (${total} < ${max}). Verlaag DESIGN_DEBT_MAX in .github/quality-baselines.env.`);
  }
}
