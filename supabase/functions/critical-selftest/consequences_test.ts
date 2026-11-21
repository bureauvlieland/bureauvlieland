import { assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { buildSelftestAlertHtml, buildSelftestAlertSubject, CHECK_CONSEQUENCES, consequenceFor, whatToDoFor, type AlertCheck } from "./consequences.ts";

const KEYS = [
  "self_service_submit", "public_building_blocks", "public_partners_view", "pricing_structures",
  "customer_portal_token", "shared_program_rpc", "ferry_api", "mail_config", "recent_email_failures",
  "webhook_match_ratio", "mailjet_account_match", "suppression_enforced", "email_body_storage",
  "commission_worklist_coverage",
];

Deno.test("elke controle uit critical-selftest heeft een gevolg-zin", async () => {
  const src = await Deno.readTextFile(new URL("./index.ts", import.meta.url));
  for (const key of KEYS) {
    assertStringIncludes(src, `"${key}"`, `check ${key} bestaat niet meer in index.ts`);
    assertEquals(typeof CHECK_CONSEQUENCES[key], "string", `gevolg-zin ontbreekt voor ${key}`);
  }
  assertStringIncludes(consequenceFor("onbekend"), "Email health");
});

Deno.test("alarmmail: per probleem wat het betekent en wat te doen, de technische tabel eronder", () => {
  const checks: AlertCheck[] = [
    { key: "mail_config", label: "Mailconfiguratie", severity: "critical", ok: false, detail: "MAILJET_API_KEY ontbreekt", fixHint: "Zet MAILJET_API_KEY als secret", durationMs: 3 },
    { key: "ferry_api", label: "Veerboottijden", severity: "warning", ok: true, detail: "ok", durationMs: 120 },
  ];
  const html = buildSelftestAlertHtml(checks);
  assertStringIncludes(html, "Wat betekent dit: Er gaat geen enkele mail meer uit");
  assertStringIncludes(html, "Wat te doen: Geef dit vandaag door aan de ontwikkelaar");
  assertStringIncludes(html, "Open Email health");
  assertEquals(html.includes("Systeemgezondheid"), false);
  assertEquals(html.indexOf("Wat te doen") < html.indexOf("Technische details"), true);
  assertStringIncludes(html, "Fix: Zet MAILJET_API_KEY als secret");
  assertEquals(buildSelftestAlertSubject(checks.filter((c) => !c.ok)), "[ALERT] Kritieke zelftest: 1 probleem(en) — Mailconfiguratie");
});

Deno.test("wat te doen hangt af van ernst en autofix", () => {
  assertStringIncludes(whatToDoFor({ severity: "warning" }), "volgende gelegenheid");
  assertStringIncludes(whatToDoFor({ severity: "critical" }), "vandaag");
  assertStringIncludes(whatToDoFor({ severity: "critical", fixedByAutofix: true }), "automatisch hersteld");
});
