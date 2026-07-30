import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { EMAIL_TEMPLATE_VARIABLES } from "@/content/emailTemplateVariables";

/**
 * Statische borging: elke `getRenderedTemplate(...)`-aanroep in de edge functions
 * moet álle {{placeholders}} van het bijbehorende databasetemplate aanleveren.
 * Zo kan een mail nooit meer met een leeg blok of een lege link verstuurd worden.
 */

const FUNCTIONS_DIR = "supabase/functions";
// Placeholders die uit template-conditionals komen en geen echte variabele zijn.
const IGNORED = new Set(["else"]);

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (p.endsWith(".ts")) out.push(p);
  }
  return out;
}

function templateIdMap(): Record<string, string> {
  const src = readFileSync(join(FUNCTIONS_DIR, "_shared/email-templates.ts"), "utf8");
  return Object.fromEntries(
    [...src.matchAll(/([A-Z0-9_]+):\s*"([a-z0-9_]+)"/g)].map((m) => [m[1], m[2]]),
  );
}

function topLevelKeys(body: string): Set<string> {
  const keys = new Set<string>();
  let depth = 0;
  let atKeyPosition = true;
  for (let i = 0; i < body.length; i++) {
    const ch = body[i];
    if ("{[(".includes(ch)) depth++;
    else if ("}])".includes(ch)) depth--;
    if (depth === 0 && atKeyPosition) {
      const m = /^\s*([a-zA-Z0-9_]+)\s*:/.exec(body.slice(i));
      if (m) {
        keys.add(m[1]);
        i += m[0].length - 1;
      }
    }
    atKeyPosition = ch === "," || ch === "\n" || (atKeyPosition && /\s/.test(ch));
  }
  return keys;
}

interface CallSite {
  file: string;
  templateId: string;
  keys: Set<string>;
}

function collectCallSites(): CallSite[] {
  const ids = templateIdMap();
  const sites: CallSite[] = [];
  for (const file of walk(FUNCTIONS_DIR)) {
    const src = readFileSync(file, "utf8");
    const re = /getRenderedTemplate\(\s*(?:TemplateIds\.([A-Z0-9_]+)|"([a-z0-9_]+)")\s*,\s*\{/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(src))) {
      const templateId = m[1] ? ids[m[1]] : m[2];
      if (!templateId) continue;
      let depth = 0;
      let end = re.lastIndex - 1;
      for (let i = re.lastIndex - 1; i < src.length; i++) {
        if (src[i] === "{") depth++;
        else if (src[i] === "}") {
          depth--;
          if (depth === 0) {
            end = i;
            break;
          }
        }
      }
      sites.push({ file, templateId, keys: topLevelKeys(src.slice(re.lastIndex, end)) });
    }
  }
  return sites;
}

describe("e-mailtemplate variabelen", () => {
  const sites = collectCallSites();

  it("vindt call sites in de edge functions", () => {
    expect(sites.length).toBeGreaterThan(20);
  });

  it("kent elk gebruikt template in de snapshot", () => {
    const unknown = sites
      .filter((s) => !EMAIL_TEMPLATE_VARIABLES[s.templateId])
      .map((s) => `${s.templateId} (${s.file})`);
    expect(unknown).toEqual([]);
  });

  it("levert alle vereiste placeholders aan per aanroep", () => {
    const problems: string[] = [];
    for (const site of sites) {
      const required = EMAIL_TEMPLATE_VARIABLES[site.templateId];
      if (!required) continue;
      const missing = required.filter((v) => !IGNORED.has(v) && !site.keys.has(v));
      if (missing.length) {
        problems.push(`${site.templateId} (${site.file}): mist ${missing.join(", ")}`);
      }
    }
    expect(problems).toEqual([]);
  });
});
