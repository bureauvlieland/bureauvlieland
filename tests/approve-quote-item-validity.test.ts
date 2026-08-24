import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Contract: een al geaccepteerd project (akkoord ontvangen / definitief bevestigd)
 * mag niet geblokkeerd worden door een verlopen quote_valid_until wanneer de klant
 * later toegevoegde of gewijzigde onderdelen goedkeurt.
 */
describe("approve-quote-item geldigheidscheck", () => {
  const src = readFileSync(
    resolve(__dirname, "../supabase/functions/approve-quote-item/index.ts"),
    "utf8",
  );

  it("slaat de verlopen-check over bij akkoord_ontvangen en definitief_bevestigd", () => {
    const match = src.match(/const skipValidityCheck =[\s\S]{0,200}?;/);
    expect(match).not.toBeNull();
    const snippet = match![0];
    expect(snippet).toContain("admin_override");
    expect(snippet).toContain("akkoord_ontvangen");
    expect(snippet).toContain("definitief_bevestigd");
  });

  it("past de check nog wél toe in de offertefase", () => {
    expect(src).toContain("if (!skipValidityCheck && program.quote_valid_until)");
  });
});
