/**
 * Source-grep contract-tests voor kritieke workflow-invarianten die eerder
 * stukgingen of makkelijk stuk kunnen gaan. Deze tests parseren de
 * edge-function-broncode en zoeken naar structurele patronen — geen
 * runtime mocks, wél harde regressie-vangnetten.
 *
 * Getest wordt:
 *  1. accept-quote-proposal zet ALTIJD zowel customer_approved_at als
 *     customer_accepted_at samen (silence=agreement invariant).
 *  2. update-partner-item-status wist BEIDE timestamps samen bij een
 *     substantiële wijziging (alternative/unavailable). Nooit één van de twee.
 *  3. notify-partner-cancellation cancelt program_request_items VÓÓRDAT
 *     partner-mails uitgaan, tenzij de caller expliciet skip_item_cancel
 *     meegeeft. Voorkomt "partner denkt nog geboekt" na project-verwijdering.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (p: string) => readFileSync(resolve(process.cwd(), p), "utf8");

/** Extract elk `.update({...})`-blok als string. Balanced braces. */
function extractUpdateBlocks(src: string): string[] {
  const blocks: string[] = [];
  const re = /\.update\(\s*\{/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src)) !== null) {
    let depth = 1;
    let i = m.index + m[0].length;
    const start = i;
    while (i < src.length && depth > 0) {
      const ch = src[i];
      if (ch === "{") depth++;
      else if (ch === "}") depth--;
      i++;
    }
    blocks.push(src.slice(start, i - 1));
  }
  return blocks;
}

describe("accept-quote-proposal — dual-timestamp invariant", () => {
  const src = read("supabase/functions/accept-quote-proposal/index.ts");
  const blocks = extractUpdateBlocks(src);
  const timestampBlocks = blocks.filter(
    (b) => b.includes("customer_approved_at") || b.includes("customer_accepted_at"),
  );

  it("heeft ten minste één update-blok dat beide timestamps schrijft", () => {
    expect(timestampBlocks.length).toBeGreaterThan(0);
  });

  it("ELK update-blok dat customer_approved_at zet, zet ook customer_accepted_at (en omgekeerd)", () => {
    for (const block of timestampBlocks) {
      const hasApproved = /customer_approved_at\s*:/.test(block);
      const hasAccepted = /customer_accepted_at\s*:/.test(block);
      expect(hasApproved, `Blok met customer_accepted_at mist customer_approved_at:\n${block}`).toBe(true);
      expect(hasAccepted, `Blok met customer_approved_at mist customer_accepted_at:\n${block}`).toBe(true);
    }
  });
});

describe("update-partner-item-status — clear-both-together invariant", () => {
  const src = read("supabase/functions/update-partner-item-status/index.ts");

  it("elke plek die customer_approved_at = null zet, zet in dezelfde regio ook customer_accepted_at = null", () => {
    // Zoek elke `customer_approved_at = null` en controleer of binnen 3 regels
    // ervoor of erna ook `customer_accepted_at = null` staat.
    const lines = src.split("\n");
    const clearApproved: number[] = [];
    lines.forEach((l, i) => {
      if (/customer_approved_at\s*[:=]\s*null/.test(l)) clearApproved.push(i);
    });
    expect(clearApproved.length).toBeGreaterThan(0);
    for (const idx of clearApproved) {
      const window = lines.slice(Math.max(0, idx - 3), idx + 4).join("\n");
      expect(
        /customer_accepted_at\s*[:=]\s*null/.test(window),
        `customer_approved_at=null op regel ${idx + 1} zonder customer_accepted_at=null in de buurt:\n${window}`,
      ).toBe(true);
    }
  });

  it("verlopen alternative/unavailable status wist BEIDE timestamps (regressie-guard)", () => {
    // Deze paden gingen historisch stuk: als de partner "alternative" of
    // "unavailable" stuurt, moet klantakkoord op DIT item vervallen zodat het
    // niet meer meetelt in "alles goedgekeurd" en de klant opnieuw kan tekenen.
    for (const label of ["alternative", "unavailable"] as const) {
      // Zoek het update-blok (niet de validatie-guards eerder in de file):
      // dat is de laatste `if (status === "<label>") {` gevolgd door een
      // updateData-toewijzing binnen ~500 chars.
      const re = new RegExp(`if \\(status === "${label}"\\)\\s*\\{[^}]*updateData\\.`, "g");
      const matches = [...src.matchAll(re)];
      expect(matches.length, `${label}: update-blok niet gevonden`).toBeGreaterThan(0);
      const startIdx = matches[matches.length - 1].index!;
      const region = src.slice(startIdx, startIdx + 1500);
      expect(region, `${label}: mist customer_approved_at reset`).toMatch(/customer_approved_at\s*=\s*null/);
      expect(region, `${label}: mist customer_accepted_at reset`).toMatch(/customer_accepted_at\s*=\s*null/);
    }
  });
});

describe("notify-partner-cancellation — items-cancelled-vóór-mail invariant", () => {
  const src = read("supabase/functions/notify-partner-cancellation/index.ts");

  it("bevat een update die status op 'cancelled' zet, gated op !skip_item_cancel", () => {
    // Voorkomt regressie waarin partner een annuleringsmail krijgt terwijl
    // het item in de DB nog 'pending' of 'confirmed' staat.
    const match = src.match(/!skip_item_cancel[\s\S]{0,400}?\.update\(\s*\{[^}]*status\s*:\s*["']cancelled["']/);
    expect(
      match,
      "verwacht `.update({ status: 'cancelled', ... })` binnen een `!skip_item_cancel`-gate vóór partner-mails",
    ).not.toBeNull();
  });

  it("de cancel-update staat vóór de eerste Mailjet-send (positional guard)", () => {
    const cancelIdx = src.search(/\.update\(\s*\{[^}]*status\s*:\s*["']cancelled["']/);
    const mailjetIdx = src.search(/api\.mailjet\.com|mailjet\.com\/v3\.1\/send/);
    expect(cancelIdx).toBeGreaterThan(-1);
    if (mailjetIdx > -1) {
      expect(
        cancelIdx,
        "items moeten op 'cancelled' staan vóórdat er een Mailjet-request uitgaat",
      ).toBeLessThan(mailjetIdx);
    }
  });
});
