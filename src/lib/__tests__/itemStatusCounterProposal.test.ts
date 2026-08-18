import { describe, it, expect } from "vitest";
import { deriveItemDisplayStatusLoose, itemDisplayStatusConfig } from "@/lib/itemStatus";

describe("tegenvoorstel van klant", () => {
  it("levert de status tegenvoorstel_klant op, ook als de klant eerder akkoord gaf", () => {
    const status = deriveItemDisplayStatusLoose({
      status: "counter_proposed",
      customer_approved_at: "2026-08-18T09:00:00Z",
      customer_accepted_at: "2026-08-18T09:00:00Z",
      proposed_time: "19:30",
      customer_counter_time: "19:00",
    });
    expect(status).toBe("tegenvoorstel_klant");
    expect(itemDisplayStatusConfig[status].actor).toBe("partner");
  });

  it("blijft geaccepteerd zodra de aanbieder heeft bevestigd", () => {
    expect(
      deriveItemDisplayStatusLoose({
        status: "confirmed",
        customer_accepted_at: "2026-08-18T09:00:00Z",
        confirmed_time: "19:00",
      }),
    ).toBe("geaccepteerd");
  });
});
