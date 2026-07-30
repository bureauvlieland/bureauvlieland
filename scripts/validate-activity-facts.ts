/**
 * Prebuild-validatie: FAQ- en feitenblokken op activiteit-landingspagina's
 * moeten overeenkomen met `src/content/activityContent.ts`.
 *
 * Draait via `predev` en `prebuild`. Bij een mismatch faalt het script met
 * exit code 1, zodat een verouderde pagina niet in productie belandt.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  ACTIVITY_PAGE_MAP,
  canonicalTextFor,
  findFactViolations,
  formatViolations,
  findContentSourceViolations,
  formatSourceViolations,
  type FactViolation,
} from "../src/lib/activityFactConsistency";
import { activityContent } from "../src/content/activityContent";
import { activityFactsSource } from "../src/content/activityFactsSource";

const root = resolve(import.meta.dirname ?? ".", "..");

const violations: FactViolation[] = [];

for (const { file, slug } of ACTIVITY_PAGE_MAP) {
  const entry = activityContent[slug];
  if (!entry) {
    console.error(`[activity-facts] Onbekende slug "${slug}" voor ${file}`);
    process.exit(1);
  }
  const source = readFileSync(resolve(root, file), "utf8");
  violations.push(...findFactViolations(file, slug, source, canonicalTextFor(entry)));
}

const sourceViolations: FactViolation[] = [];

for (const [slug, entry] of Object.entries(activityContent)) {
  const source = activityFactsSource[slug];
  if (!source) {
    console.error(
      `[activity-facts] Geen databasesnapshot voor activityContent["${slug}"] — vul src/content/activityFactsSource.ts aan.`,
    );
    process.exit(1);
  }
  sourceViolations.push(...findContentSourceViolations(slug, canonicalTextFor(entry), source));
}

if (sourceViolations.length > 0) {
  console.error("\n[activity-facts] Content wijkt af van de opgeslagen activiteitdata:\n");
  console.error(formatSourceViolations(sourceViolations));
  console.error("\nCorrigeer de content, of werk de snapshot bij als de bouwsteen is gewijzigd.\n");
  process.exit(1);
}

if (violations.length > 0) {
  console.error("\n[activity-facts] Feiten op landingspagina's wijken af van activityContent:\n");
  console.error(formatViolations(violations));
  console.error("\nPas de pagina óf activityContent aan zodat ze exact overeenkomen.\n");
  process.exit(1);
}

console.log(
  `[activity-facts] OK — ${Object.keys(activityContent).length} activiteiten consistent met de ` +
    `opgeslagen data en ${ACTIVITY_PAGE_MAP.length} landingspagina's consistent met de content.`,
);
