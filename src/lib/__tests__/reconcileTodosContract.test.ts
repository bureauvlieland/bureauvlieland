/**
 * Source-grep contract: elk auto_type dat reconcile-admin-todos afsluit,
 * moet ergens in check-pending-items ook worden aangemaakt. Voorkomt
 * typo-drift waarbij een todo eeuwig openstaat omdat de sluit-handler
 * naar een verkeerde string kijkt.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { resolve, join } from "node:path";

const reconcile = readFileSync(
  resolve(process.cwd(), "supabase/functions/reconcile-admin-todos/index.ts"),
  "utf8",
);

// auto_type kan door meerdere creators worden aangemaakt (check-pending-items,
// autoTodoCreator, individuele edge functions). We verzamelen alle strings
// project-breed zodat de contract-test niet false-positives geeft.
function collectAllAutoTypes(): Set<string> {
  const roots = ["supabase/functions", "src/lib", "src/pages"];
  const found = new Set<string>();
  const re = /auto_type\s*[:=]\s*["']([a-z_]+)["']/g;
  function walk(dir: string) {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      const st = statSync(p);
      if (st.isDirectory()) walk(p);
      else if (/\.(ts|tsx)$/.test(name)) {
        const src = readFileSync(p, "utf8");
        let m: RegExpExecArray | null;
        while ((m = re.exec(src)) !== null) found.add(m[1]);
      }
    }
  }
  for (const r of roots) walk(resolve(process.cwd(), r));
  return found;
}

// Types die reconcile universeel/informatief hanteert of alleen als legacy-alias
// nog afsluit (oude naam blijft ondersteund voor bestaande open todos).
const UNIVERSAL = new Set([
  "customer_cancellation",
  "new_program_request", // aangemaakt door de DB-trigger create_todo_for_new_program_request
  "stale_pending_change", // aangemaakt door de DB-functie scan_stale_pending_changes
  // Samengevoegd in fase 3 (docs/plan-notificaties.md): niet meer aangemaakt,
  // reconcile sluit open exemplaren met completion_reason 'samengevoegd_fase3'.
  "customer_status_email_due", // → customer_status_update_due
  "post_execution_feedback", // → customer_aftersales
  "post_execution_invoice_check", // → commission_missing_invoice
  "new_request_received", // → new_program_request
]);

function extractSwitchCases(src: string): string[] {
  const cases = new Set<string>();
  const re = /case\s+"([a-z_]+)"\s*:/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src)) !== null) cases.add(m[1]);
  return [...cases];
}


describe("reconcile-admin-todos ↔ auto_type creators", () => {
  const closed = extractSwitchCases(reconcile).filter((t) => !UNIVERSAL.has(t));
  const created = collectAllAutoTypes();

  it("reconcile heeft ten minste een handvol switch-cases (sanity)", () => {
    expect(closed.length).toBeGreaterThan(5);
  });

  it("elk gesloten auto_type wordt ergens in de codebase aangemaakt", () => {
    const missing = closed.filter((t) => !created.has(t));
    expect(
      missing,
      `reconcile sluit types die nooit aangemaakt worden (typo?): ${missing.join(", ")}`,
    ).toEqual([]);
  });

  it("de vier samengevoegde sleutels worden nergens meer aangemaakt", () => {
    for (const t of [
      "customer_status_email_due",
      "post_execution_feedback",
      "post_execution_invoice_check",
      "new_request_received",
    ]) {
      expect(created.has(t), `${t} wordt nog aangemaakt`).toBe(false);
    }
  });

  it("elke sluiting krijgt een completion_reason", () => {
    expect(reconcile).toMatch(/completion_reason: reason/);
    expect(reconcile).toMatch(/markClosed\(t\.id, "samengevoegd_fase3"\)/);
    // Geen sluiting zonder reden: de enige update op admin_todos schrijft de reden mee.
    const updates = reconcile.match(/\.from\("admin_todos"\)\s*\.update\(/g) ?? [];
    expect(updates.length).toBe(1);
  });

  it("reconcile bevat expliciete lookup-error guards (geen 'silent close on fetch failure')", () => {
    // Regressie: eerder werden todos gesloten als 'project_deleted' omdat een
    // lookup faalde. Alle .from(...).select(...).in(...) queries in reconcile
    // moeten hun .error afvangen met throw.
    expect(reconcile).toMatch(/if \(reqs\.error\) throw/);
    expect(reconcile).toMatch(/if \(items\.error\) throw/);
    expect(reconcile).toMatch(/if \(quotes\.error\) throw/);
    expect(reconcile).toMatch(/if \(pInvoices\.error\) throw/);
    expect(reconcile).toMatch(/if \(batches\.error\) throw/);
  });
});
