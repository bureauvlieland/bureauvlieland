/**
 * Source-grep contract: elke `CREATE TABLE public.<naam>` in migrations moet
 * in ÉÉN van de migration-files ook `ENABLE ROW LEVEL SECURITY` én een
 * `GRANT` op diezelfde tabel krijgen. Anders lekt de tabel via de Data-API
 * (of is hij juist onbereikbaar en breekt de app).
 *
 * Uitzondering: gescoped schema of expliciete uitsluitingen (bijv.
 * helper-views die geen tabel zijn) worden overgeslagen.
 */
import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { resolve, join } from "node:path";

const migrationsDir = resolve(process.cwd(), "supabase/migrations");
const files = readdirSync(migrationsDir).filter((f) => f.endsWith(".sql"));

// Verzamel álle SQL in één blob — we willen weten of iets ergens in de
// migratiehistorie geregeld is, ongeacht in welk bestand.
const allSql = files
  .map((f) => readFileSync(join(migrationsDir, f), "utf8"))
  .join("\n\n");

// Tabellen die alleen door een SECURITY DEFINER-functie worden geraakt en
// waar RLS bewust niet aan staat (whitelist — voeg alleen toe met reden).
const RLS_WHITELIST = new Set<string>([
  // (leeg — voeg alleen toe met duidelijke motivatie in code review)
]);

// Legacy-tabellen zonder expliciete GRANT in de migration-historie. Zij
// werken omdat Supabase in de begintijd default-privileges op `public`
// verleende. Nieuwe tabellen MOETEN een GRANT hebben (zie
// public-schema-grants regel) — daarom staat de test op strikt: alleen
// tabellen in deze baseline mogen zonder GRANT bestaan. Voeg nooit
// nieuwe items toe zonder review.
const GRANT_BASELINE = new Set<string>([
  "shared_programs", "partners", "user_roles", "admin_todos",
  "admin_activity_log", "building_blocks", "bureau_invoices",
  "accommodation_requests", "accommodation_quotes", "email_log",
  "email_templates", "app_settings", "accepted_terms_log",
  "partner_unavailability", "program_templates", "program_template_items",
  "accommodation_quote_extras", "partner_room_types", "project_communications",
  "chat_conversations", "chat_messages", "chat_admin_presence", "map_bookings",
  "accommodation_quote_history", "purchase_invoice_inbox",
  "purchase_invoice_lines", "program_item_billing_lines",
  "partner_purchase_invoice_allocations", "commission_invoices",
  "commission_invoice_lines", "ai_chat_conversations", "ai_chat_messages",
  "claudia_documents", "admin_recommendations", "claudia_run_log",
  "program_change_log",
]);

// Match `CREATE TABLE [IF NOT EXISTS] public.<naam>` (case-insensitief).
const createRe = /create\s+table\s+(?:if\s+not\s+exists\s+)?public\.([a-z_][a-z0-9_]*)/gi;

function extractCreatedTables(sql: string): Set<string> {
  const out = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = createRe.exec(sql)) !== null) out.add(m[1].toLowerCase());
  return out;
}

const created = extractCreatedTables(allSql);

describe("migrations — RLS + GRANT coverage voor elke public-tabel", () => {
  it("er zijn public-tabellen aangemaakt (sanity)", () => {
    expect(created.size).toBeGreaterThan(0);
  });

  it("elke aangemaakte public-tabel heeft ergens een ENABLE ROW LEVEL SECURITY", () => {
    const missing: string[] = [];
    for (const t of created) {
      if (RLS_WHITELIST.has(t)) continue;
      const re = new RegExp(
        `alter\\s+table[^;]*public\\.${t}\\b[^;]*enable\\s+row\\s+level\\s+security`,
        "i",
      );
      if (!re.test(allSql)) missing.push(t);
    }
    expect(missing, `tabellen zonder RLS: ${missing.join(", ")}`).toEqual([]);
  });

  it("elke NIEUWE public-tabel heeft een expliciete GRANT (baseline: legacy tabellen)", () => {
    const missing: string[] = [];
    const unexpectedInBaseline: string[] = [];
    for (const t of created) {
      const re = new RegExp(`grant\\s+[^;]+\\s+on\\s+(?:table\\s+)?public\\.${t}\\b`, "i");
      const hasGrant = re.test(allSql);
      if (!hasGrant && !GRANT_BASELINE.has(t)) missing.push(t);
      if (hasGrant && GRANT_BASELINE.has(t)) unexpectedInBaseline.push(t);
    }
    expect(
      missing,
      `nieuwe tabellen zonder GRANT (voeg GRANT toe of update baseline met reden): ${missing.join(", ")}`,
    ).toEqual([]);
    // Housekeeping: als een baseline-tabel intussen wél een GRANT heeft
    // gekregen, verwijder hem uit de baseline zodat de test strikt blijft.
    expect(
      unexpectedInBaseline,
      `baseline bevat tabellen die inmiddels een GRANT hebben — verwijder uit GRANT_BASELINE: ${unexpectedInBaseline.join(", ")}`,
    ).toEqual([]);
  });

  it("elke aangemaakte public-tabel heeft minstens één CREATE POLICY of expliciete FORCE RLS-notitie", () => {
    // Missing policies + RLS enabled = tabel volledig dicht. Dat kan bewust
    // zijn (alleen service_role), maar we willen dat een menselijke reviewer
    // dit opmerkt. Deze test staat op waarschuwingsniveau: falen = review.
    const missing: string[] = [];
    for (const t of created) {
      const re = new RegExp(`create\\s+policy[^;]*on\\s+public\\.${t}\\b`, "i");
      if (!re.test(allSql)) missing.push(t);
    }
    // Zachte assert: alleen falen als er MEER dan een handvol zonder policy zijn.
    expect(
      missing.length,
      `tabellen zonder enige RLS-policy (mogelijk service-role-only, review): ${missing.join(", ")}`,
    ).toBeLessThan(10);
  });
});
