/**
 * Doorverwezen bruiloften zijn stil in de Werkbank
 * (docs/plan-bruiloftsdoorverwijzingen.md → Werkbank). De frontend bepaalt welke
 * auto-taken vervallen via isTodoPausedByReferral; de edge functions gebruiken de
 * gespiegelde lijst REFERRAL_PAUSED_AUTO_TYPES. Deze test houdt beide gelijk en
 * bewaakt dat beide cron-functies de doorverwijzing meenemen.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { isTodoPausedByReferral, referralPausedAutoTypes } from "../projectActivity";
import { resolveProjectCommunicationState } from "../projectCommunication";

const read = (p: string) => readFileSync(resolve(process.cwd(), p), "utf8");

describe("isTodoPausedByReferral", () => {
  it("pauzeert de taken die het bureau aan het project laten werken", () => {
    for (const t of [
      "request_no_response",
      "new_program_request",
      "quote_pending_customer",
      "send_items_to_partners",
      "partner_reminder",
      "post_execution_feedback",
      "terms_reminder",
    ]) {
      expect(isTodoPausedByReferral(t), t).toBe(true);
    }
  });

  it("laat handmatige taken, inbound en de doorverwijzing zelf staan", () => {
    expect(isTodoPausedByReferral(null)).toBe(false);
    expect(isTodoPausedByReferral(undefined)).toBe(false);
    expect(isTodoPausedByReferral("inbound_email")).toBe(false);
    expect(isTodoPausedByReferral("sales_inbox")).toBe(false);
    expect(isTodoPausedByReferral("purchase_invoice_inbox")).toBe(false);
    expect(isTodoPausedByReferral("wedding_referral_claim")).toBe(false);
    expect(isTodoPausedByReferral("critical_selftest_failure")).toBe(false);
    expect(isTodoPausedByReferral("lodging_board_missing")).toBe(false);
  });
});

describe("resolveProjectCommunicationState", () => {
  it("een doorverwezen dossier is 'doorverwezen', wat de sporen ook zeggen", () => {
    expect(resolveProjectCommunicationState({ referred: true, states: ["bij_bureau"] })).toBe("doorverwezen");
    expect(resolveProjectCommunicationState({ referred: true, states: ["stilte", "wacht_op_klant"] })).toBe("doorverwezen");
    expect(resolveProjectCommunicationState({ referred: true, states: [] })).toBe("doorverwezen");
  });

  it("zonder doorverwijzing geldt de gewone combinatie", () => {
    expect(resolveProjectCommunicationState({ referred: false, states: ["wacht_op_klant", "bij_bureau"] })).toBe("bij_bureau");
    expect(resolveProjectCommunicationState({ referred: false, states: [] })).toBe("klaar");
  });
});

describe("spiegel met de edge functions", () => {
  it("REFERRAL_PAUSED_AUTO_TYPES in _shared/project-activity.ts is gelijk aan isTodoPausedByReferral", () => {
    const src = read("supabase/functions/_shared/project-activity.ts");
    const m = src.match(/REFERRAL_PAUSED_AUTO_TYPES[^=]*=\s*new Set\(\[([\s\S]*?)\]\)/);
    expect(m, "REFERRAL_PAUSED_AUTO_TYPES niet gevonden").toBeTruthy();
    const deno = [...m![1].matchAll(/"([a-z_]+)"/g)].map((x) => x[1]).sort();
    expect(deno).toEqual(referralPausedAutoTypes());
  });

  it("check-pending-items maakt niets aan voor doorverwezen projecten", () => {
    const src = read("supabase/functions/check-pending-items/index.ts");
    expect(src).toContain("fetchReferredRequestIds(supabase)");
    expect(src).toContain("referredRequestIds.has(id)");
    // Elke plek die vroeger alleen op snooze keek, kijkt nu op isPaused.
    expect(src).not.toMatch(/isSnoozed\(/);
    expect((src.match(/isPaused\(/g) ?? []).length).toBeGreaterThan(10);
  });

  it("reconcile-admin-todos sluit de projecttaken van doorverwezen projecten", () => {
    const src = read("supabase/functions/reconcile-admin-todos/index.ts");
    expect(src).toContain("REFERRAL_PAUSED_AUTO_TYPES.has(t.auto_type)");
    expect(src).toContain('markClosed(t.id, "referred")');
  });
});
