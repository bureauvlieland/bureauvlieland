/**
 * Source-grep contract: elke `email_type` die een edge function in email_log
 * logt, moet een Nederlands label hebben in `emailTypeLabels.ts`. Anders
 * toont het Berichtencentrum de ruwe sleutel.
 *
 * We verzamelen de sleutels uit de bronbestanden onder supabase/functions
 * (tests uitgezonderd) via een paar vaste patronen:
 *   - `email_type: "x"` / `emailType: "x"` / `const EMAIL_TYPE = "x"`
 *   - `EmailTypes.X`, opgelost via het EmailTypes-object in email-logger.ts
 *   - waarden in objecten die op `EmailTypes` eindigen (EmailTypesHeadcount,
 *     LodgingAlertEmailTypes, …) en in de lijst TERMS_MAIL_TYPES
 * Zie reconcileTodosContract.test.ts voor hetzelfde patroon bij taken.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { resolve, join } from "node:path";
import { EMAIL_TYPES } from "../emailTypeLabels";

const FUNCTIONS_ROOT = resolve(process.cwd(), "supabase/functions");

// Sleutels die wel als `email_type:` in de code staan maar niet in email_log
// terechtkomen (bijv. een metadata-markering op project_communications).
const NOT_LOGGED = new Set(["partner_cancellation"]);

function isTestFile(name: string): boolean {
  return /(_test|\.test)\.tsx?$/.test(name);
}

function* sourceFiles(dir: string): Generator<string> {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) yield* sourceFiles(p);
    else if (/\.tsx?$/.test(name) && !isTestFile(name)) yield p;
  }
}

function parseEmailTypesConstants(): Map<string, string> {
  const src = readFileSync(join(FUNCTIONS_ROOT, "_shared/email-logger.ts"), "utf8");
  const block = src.match(/export const EmailTypes = \{([\s\S]*?)\} as const;/);
  const map = new Map<string, string>();
  if (!block) return map;
  const re = /([A-Z_]+)\s*:\s*["']([a-z0-9_]+)["']/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(block[1])) !== null) map.set(m[1], m[2]);
  return map;
}

export function collectLoggedEmailTypes(): Map<string, string[]> {
  const constants = parseEmailTypesConstants();
  const found = new Map<string, string[]>();
  const add = (type: string, file: string) => {
    if (NOT_LOGGED.has(type)) return;
    const list = found.get(type) ?? [];
    if (!list.includes(file)) list.push(file);
    found.set(type, list);
  };

  const literal = /\b(?:email_type|emailType)\s*:\s*["']([a-z0-9_]+)["']/g;
  const constDecl = /\bconst EMAIL_TYPE\s*=\s*["']([a-z0-9_]+)["']/g;
  const viaConstant = /\bEmailTypes\.([A-Z_]+)\b/g;
  const typeMaps = /\b[A-Za-z]*EmailTypes[A-Za-z]*\b\s*(?::[^=]*)?=\s*\{([^}]*)\}/g;
  const mapValue = /[A-Za-z_]+\s*:\s*["']([a-z0-9_]+)["']/g;
  const termsList = /TERMS_MAIL_TYPES\s*=\s*\[([^\]]*)\]/g;
  const listValue = /["']([a-z0-9_]+)["']/g;

  for (const file of sourceFiles(FUNCTIONS_ROOT)) {
    const src = readFileSync(file, "utf8");
    const rel = file.slice(FUNCTIONS_ROOT.length + 1);
    let m: RegExpExecArray | null;
    while ((m = literal.exec(src)) !== null) add(m[1], rel);
    while ((m = constDecl.exec(src)) !== null) add(m[1], rel);
    while ((m = viaConstant.exec(src)) !== null) {
      const value = constants.get(m[1]);
      if (value) add(value, rel);
    }
    while ((m = typeMaps.exec(src)) !== null) {
      let v: RegExpExecArray | null;
      while ((v = mapValue.exec(m[1])) !== null) add(v[1], rel);
    }
    while ((m = termsList.exec(src)) !== null) {
      let v: RegExpExecArray | null;
      while ((v = listValue.exec(m[1])) !== null) add(v[1], rel);
    }
  }
  return found;
}

describe("emailTypeLabels ↔ email_type in supabase/functions", () => {
  const logged = collectLoggedEmailTypes();

  it("vindt een flinke set gelogde sleutels (sanity)", () => {
    expect(logged.size).toBeGreaterThan(40);
    expect(logged.has("program_request_partner")).toBe(true); // via EmailTypes.X
    expect(logged.has("lodging_quote_submitted_bureau")).toBe(true); // via LodgingAlertEmailTypes
    expect(logged.has("customer_terms_reminder_t3")).toBe(true); // via TERMS_MAIL_TYPES
    expect(logged.has("partner_headsup_t3")).toBe(true); // via const EMAIL_TYPE
    expect(logged.has("accommodation_headcount_rejected_partner")).toBe(true); // via EmailTypesHeadcount
  });

  it("elke gelogde email_type heeft een Nederlands label", () => {
    const missing = [...logged.entries()]
      .filter(([type]) => !EMAIL_TYPES[type])
      .map(([type, files]) => `${type} (${files.join(", ")})`);
    expect(
      missing,
      `Voeg deze sleutels toe aan src/lib/emailTypeLabels.ts: ${missing.join("; ")}`,
    ).toEqual([]);
  });

  it("alarmmails staan in de categorie Systeem", () => {
    for (const t of ["critical_selftest_alert", "email_webhook_heartbeat_alert", "auto_close_monitor_alert", "cron_watchdog_alert"]) {
      expect(EMAIL_TYPES[t]?.category, t).toBe("Systeem");
    }
  });

  it("labels zijn Nederlands en niet gelijk aan de sleutel", () => {
    for (const [key, info] of Object.entries(EMAIL_TYPES)) {
      expect(info.label, key).not.toBe(key);
      expect(info.label.trim().length, key).toBeGreaterThan(3);
    }
  });
});
