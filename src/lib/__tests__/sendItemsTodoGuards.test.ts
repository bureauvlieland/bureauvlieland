/**
 * Source-grep guards voor `ensureSendItemsTodo`. Deze functie is
 * verantwoordelijk voor het openen/sluiten van de auto-todo
 * `send_items_to_partners`. Regressies leiden tot vergeten mailings of
 * eeuwig openstaande todos.
 *
 * Invarianten:
 *  - Sluit todo als project cancelled is (status of cancelled_at).
 *  - Sluit todo als project in facturatie-fase zit
 *    (ready_for_invoice / partially_invoiced / fully_invoiced / completed).
 *  - Sluit todo als `readyForPartner === 0`, laat 'm open anders.
 *  - Auto-type is exact `send_items_to_partners` (reconcile-contract).
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const src = readFileSync(resolve(process.cwd(), "src/lib/sendItemsTodo.ts"), "utf8");

describe("ensureSendItemsTodo — invariants", () => {
  it("gebruikt de exacte auto_type string 'send_items_to_partners'", () => {
    expect(src).toMatch(/auto_type:\s*["']send_items_to_partners["']/);
    // De sluit-query gebruikt ook exact deze string
    expect(src).toMatch(/\.eq\(\s*["']auto_type["']\s*,\s*["']send_items_to_partners["']\s*\)/);
  });

  it("sluit todo bij cancelled project (status of cancelled_at)", () => {
    expect(src).toMatch(/status\s*===\s*["']cancelled["']/);
    expect(src).toMatch(/cancelled_at/);
  });

  it("sluit todo bij facturatie-fase completion_status", () => {
    for (const s of [
      "ready_for_invoice",
      "partially_invoiced",
      "fully_invoiced",
      "completed",
    ]) {
      expect(src, `completion_status '${s}' moet als sluit-trigger genoemd worden`).toMatch(
        new RegExp(`completion_status\\s*===\\s*["']${s}["']`),
      );
    }
  });

  it("sluit bestaande todo (status=done) wanneer readyForPartner === 0", () => {
    expect(src).toMatch(/readyForPartner\s*===\s*0/);
    expect(src).toMatch(/status:\s*["']done["']/);
  });

  it("selecteert alleen niet-done todo's om te updaten (voorkomt herleven)", () => {
    expect(src).toMatch(/\.neq\(\s*["']status["']\s*,\s*["']done["']\s*\)/);
  });

  it("faalt stil naar console.error (voorkomt breken van host-mutatie)", () => {
    expect(src).toMatch(/console\.error\(\s*["']ensureSendItemsTodo failed["']/);
  });
});
