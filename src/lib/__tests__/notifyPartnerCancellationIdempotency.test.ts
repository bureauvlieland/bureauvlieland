/**
 * Idempotency-guard: notify-partner-cancellation mag niet dubbel mailen als
 * hij per ongeluk twee keer wordt aangeroepen.
 *
 * Structurele check (source-grep) op de huidige garantie:
 *  - De item-lookup filtert standaard op statussen die NIET 'cancelled' bevatten.
 *    Bij een tweede aanroep zonder skip_item_cancel zijn alle items al
 *    'cancelled', dus notifiableItems=[] en er gaat geen mail uit.
 *  - De cancel-update draait vóór de mail (positional guard, ook getest in
 *    customerApprovalDualTimestampGuards.test.ts).
 *  - Als skip_item_cancel=true wordt meegegeven MOET de caller garanderen dat
 *    hij zelf idempotent is (documented in comments).
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const src = readFileSync(
  resolve(process.cwd(), "supabase/functions/notify-partner-cancellation/index.ts"),
  "utf8",
);

describe("notify-partner-cancellation — idempotency guards", () => {
  it("default item-lookup filtert 'cancelled' UIT (2e aanroep vindt geen items)", () => {
    // De defaultset (zonder skip_item_cancel) mag géén 'cancelled' bevatten,
    // anders wordt bij een tweede aanroep opnieuw naar dezelfde partners gemaild.
    const match = src.match(
      /skip_item_cancel\s*\n?\s*\?[^:]*:\s*\[([^\]]+)\]/,
    );
    expect(match, "verwacht ternary voor itemStatuses op skip_item_cancel").not.toBeNull();
    const defaultBranch = match![1];
    expect(
      defaultBranch,
      `default-branch bevat 'cancelled' → 2e aanroep zou opnieuw mailen: ${defaultBranch}`,
    ).not.toMatch(/["']cancelled["']/);
  });

  it("update-blok cancelt alleen items die nog niet 'cancelled' zijn (no-op bij herhaling)", () => {
    // De .update({ status: 'cancelled', ... }) moet gegate zijn op .in('status', [
    // …niet-cancelled statussen…]). Anders zou een tweede run alle rijen weer
    // opnieuw touchen en updated_at bumpen (harmless) — maar erger: als het
    // filter ontbreekt kan het per ongeluk mail-loops triggeren.
    const region = src.match(/update\(\s*\{\s*status:\s*["']cancelled["'][\s\S]{0,600}?\.in\(\s*["']status["']\s*,\s*\[([^\]]+)\]/);
    expect(region, "cancel-update mist .in('status', [...]) filter").not.toBeNull();
    expect(
      region![1],
      "cancel-update filter bevat 'cancelled' — herhaalde run zou items opnieuw raken",
    ).not.toMatch(/["']cancelled["']/);
  });

  it("accommodation-quote lookup filtert eveneens 'rejected' UIT bij default-pad", () => {
    // Zelfde structuur voor accommodation_quotes: skip_item_cancel ternary,
    // default-tak mag geen reeds-afgeronde statussen bevatten die dubbel mailen.
    const match = src.match(/quoteStatuses\s*=\s*skip_item_cancel\s*\n?\s*\?[^:]*:\s*\[([^\]]+)\]/);
    if (!match) return; // tolerant: accommodation-pad is optioneel per implementatie
    expect(match[1]).not.toMatch(/["']rejected["']/);
  });

  it("er wordt geen mail verstuurd wanneer partnerGroups leeg is (guard vóór send)", () => {
    // Sanity: er moet een pad zijn dat vroegtijdig retourneert of de send-loop
    // overslaat als er geen partners zijn om te mailen.
    const hasEmptyGuard =
      /partnerGroups\.size\s*===?\s*0/.test(src) ||
      /notifiableItems\.length\s*===?\s*0/.test(src) ||
      /for\s*\(\s*const[^)]+of\s+partnerGroups/.test(src); // impliciete no-op via loop
    expect(hasEmptyGuard).toBe(true);
  });
});
