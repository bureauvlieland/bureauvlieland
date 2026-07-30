// Quick audit: which {{placeholders}} of DB templates are not supplied by their call site?
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";

const snapshot = JSON.parse(readFileSync("scripts/.template-vars.json", "utf8"));

const ids = Object.fromEntries(
  [...readFileSync("supabase/functions/_shared/email-templates.ts", "utf8")
    .matchAll(/([A-Z0-9_]+):\s*"([a-z0-9_]+)"/g)].map((m) => [m[1], m[2]]),
);

function walk(dir, out = []) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (p.endsWith(".ts")) out.push(p);
  }
  return out;
}

const problems = [];
for (const file of walk("supabase/functions")) {
  const src = readFileSync(file, "utf8");
  const re = /getRenderedTemplate\(\s*(?:TemplateIds\.([A-Z0-9_]+)|"([a-z0-9_]+)")\s*,\s*\{/g;
  let m;
  while ((m = re.exec(src))) {
    const templateId = m[1] ? ids[m[1]] : m[2];
    if (!templateId) continue;
    // brace match from the '{'
    let i = re.lastIndex - 1, depth = 0, end = i;
    for (; i < src.length; i++) {
      if (src[i] === "{") depth++;
      else if (src[i] === "}") { depth--; if (depth === 0) { end = i; break; } }
    }
    const body = src.slice(re.lastIndex, end);
    // top-level keys only
    const keys = new Set();
    let d = 0;
    let lineStart = true;
    for (let j = 0; j < body.length; j++) {
      const ch = body[j];
      if ("{[(".includes(ch)) d++;
      else if ("}])".includes(ch)) d--;
      if (d === 0) {
        const mm = /^\s*([a-zA-Z0-9_]+)\s*:/.exec(body.slice(j));
        if (mm && lineStart) { keys.add(mm[1]); j += mm[0].length - 1; }
      }
      lineStart = ch === "," || ch === "\n" || (lineStart && /\s/.test(ch));
    }
    const expected = snapshot[templateId] ?? null;
    if (!expected) { problems.push(`${templateId}: NIET in snapshot (${file})`); continue; }
    const missing = expected.filter((v) => !keys.has(v) && v !== "else");
    if (missing.length) problems.push(`${templateId} (${file}): mist ${missing.join(", ")}`);
  }
}
console.log(problems.join("\n") || "alles ok");
