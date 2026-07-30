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
  type FactViolation,
} from "../src/lib/activityFactConsistency";
import { activityContent } from "../src/content/activityContent";

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

if (violations.length > 0) {
  console.error("\n[activity-facts] Feiten op landingspagina's wijken af van activityContent:\n");
  console.error(formatViolations(violations));
  console.error("\nPas de pagina óf activityContent aan zodat ze exact overeenkomen.\n");
  process.exit(1);
}

console.log(`[activity-facts] OK — ${ACTIVITY_PAGE_MAP.length} landingspagina's consistent.`);
