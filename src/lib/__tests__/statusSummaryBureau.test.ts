import { describe, it, expect } from "vitest";
import { calculateStatusSummary } from "@/types/programRequest";
import { deriveItemDisplayStatusLoose } from "@/lib/itemStatus";

const item = (over: Record<string, unknown> = {}) =>
  ({
    id: Math.random().toString(36).slice(2),
    block_type: "partner",
    block_category: "excursies",
    provider_id: "zeehonden",
    status: "pending",
    skip_partner_notification: false,
    customer_approved_at: "2026-08-01T10:00:00Z",
    customer_accepted_at: "2026-08-01T10:00:00Z",
    day_index: 0,
    ...over,
  }) as never;

const bureauItem = (over: Record<string, unknown> = {}) =>
  item({ block_type: "bureau", block_category: "vervoer", provider_id: "bureau", skip_partner_notification: true, ...over });

describe("calculateStatusSummary — bureau-onderdelen na klant-akkoord", () => {
  it("bureau-onderdelen op pending tellen als bevestigd zodra de klant akkoord is", () => {
    const summary = calculateStatusSummary([
      bureauItem(),
      bureauItem(),
      bureauItem(),
      item({ status: "confirmed" }),
      item({ status: "confirmed", provider_id: "trattoria-oliva" }),
      item({ status: "pending" }),
    ]);

    expect(summary.total).toBe(6);
    expect(summary.bureauManaged).toBe(3);
    expect(summary.partnerTotal).toBe(3);
    expect(summary.partnerConfirmed).toBe(2);
    expect(summary.confirmed).toBe(5);
    expect(summary.pending).toBe(1);
  });

  it("bureau-onderdeel zonder klant-akkoord telt niet als bevestigd", () => {
    const summary = calculateStatusSummary([
      bureauItem({ customer_approved_at: null, customer_accepted_at: null }),
    ]);
    expect(summary.confirmed).toBe(0);
  });

  it("managed-service vervoer (rederij) geldt als bureau-onderdeel", () => {
    const summary = calculateStatusSummary([
      item({ block_type: "bureau", block_category: "vervoer", provider_id: "rederij", skip_partner_notification: true }),
    ]);
    expect(summary.bureauManaged).toBe(1);
    expect(summary.confirmed).toBe(1);

    expect(
      deriveItemDisplayStatusLoose(
        item({ block_type: "bureau", block_category: "vervoer", provider_id: "rederij" }),
        { quoteStatus: "akkoord_ontvangen" },
      ),
    ).toBe("klant_akkoord_bureau");
  });

  it("catering van een managed-service partner blijft een partner-onderdeel", () => {
    const summary = calculateStatusSummary([
      item({ block_type: "partner", block_category: "catering", provider_id: "rederij", status: "pending" }),
    ]);
    expect(summary.bureauManaged).toBe(0);
    expect(summary.partnerTotal).toBe(1);
    expect(summary.confirmed).toBe(0);
  });
});
