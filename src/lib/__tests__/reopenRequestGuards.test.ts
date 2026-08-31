/**
 * Source-grep guard op reopen-program-request. Het heropenen van een annulering
 * raakt klantdata: als de update niet ALLE annuleringsvelden leegmaakt blijft
 * het project half-geannuleerd, en als bevestigde/uitgevoerde onderdelen worden
 * teruggezet verliezen we de partnerafspraak.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const src = readFileSync(
  resolve(process.cwd(), "supabase/functions/reopen-program-request/index.ts"),
  "utf8",
);

describe("reopen-program-request", () => {
  it("maakt alle annuleringsvelden leeg en zet status weer actief", () => {
    for (const field of [
      'status: "active"',
      "cancelled_at: null",
      "cancellation_reason: null",
      "archived_at: null",
      "reopened_reason: reason",
    ]) {
      expect(src, `ontbrekend veld in reopen-update: ${field}`).toContain(field);
    }
  });

  it("zet uitsluitend geannuleerde onderdelen terug naar pending", () => {
    expect(src).toMatch(/\.eq\("status",\s*"cancelled"\)/);
    expect(src).toContain('status: "pending"');
    // Geen brede update over alle items van de aanvraag.
    expect(src).not.toMatch(/status:\s*"pending"[\s\S]{0,120}\.eq\("request_id"/);
  });

  it("vereist admin-rol en een reden van minimaal 3 tekens", () => {
    expect(src).toContain('.eq("role", "admin")');
    expect(src).toMatch(/min\(3/);
    expect(src).toMatch(/status:\s*403|403,/);
  });

  it("verstuurt geen e-mail bij heropenen", () => {
    expect(src).not.toMatch(/mailjet|sendMailjet|api\.mailjet\.com/i);
  });
});
