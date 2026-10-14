import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { isPartnerDashboardItemVisible, lastRequestDate, type DashboardItemLike } from "./partnerDashboardItems.ts";

const now = new Date("2026-10-14T12:00:00Z");
const iso = (daysAgo: number) => new Date(now.getTime() - daysAgo * 86400000).toISOString();

const item = (overrides: Partial<DashboardItemLike> = {}): DashboardItemLike => ({
  status: "executed",
  updated_at: iso(200),
  invoiced_number: null,
  partner_dismissed_at: null,
  skip_partner_notification: false,
  program_requests: { status: "active", cancelled_at: null, selected_dates: ["2026-05-20", "2026-05-21"] },
  ...overrides,
});

Deno.test("gefactureerd onderdeel blijft zichtbaar, ook op een afgerond of oud project", () => {
  // De situatie van Zeehondentochten Vlieland: alle facturen op afgeronde projecten.
  assertEquals(isPartnerDashboardItemVisible(item({ invoiced_number: "2026081" }), now), true);
  assertEquals(
    isPartnerDashboardItemVisible(item({ status: "invoiced", invoiced_number: "2026015", updated_at: iso(400) }), now),
    true,
  );
  assertEquals(
    isPartnerDashboardItemVisible(
      item({ invoiced_number: "2026016", program_requests: { status: "cancelled", cancelled_at: iso(500), selected_dates: [] } }),
      now,
    ),
    true,
  );
});

Deno.test("door de partner gesloten onderdeel verdwijnt, ook met factuurnummer", () => {
  assertEquals(isPartnerDashboardItemVisible(item({ partner_dismissed_at: iso(1) }), now), false);
  assertEquals(isPartnerDashboardItemVisible(item({ partner_dismissed_at: iso(1), invoiced_number: "x" }), now), false);
});

Deno.test("concept-onderdeel met verstreken datum verdwijnt, met toekomstige datum niet", () => {
  const concept = (dates: string[]) =>
    item({ status: "pending", skip_partner_notification: true, program_requests: { status: "active", selected_dates: dates } });
  assertEquals(isPartnerDashboardItemVisible(concept(["2026-06-17", "2026-06-18"]), now), false);
  assertEquals(isPartnerDashboardItemVisible(concept(["2028-04-05"]), now), true);
  assertEquals(isPartnerDashboardItemVisible(concept([]), now), true);
});

Deno.test("lopende statussen altijd, afgesloten statussen drie maanden", () => {
  assertEquals(isPartnerDashboardItemVisible(item({ status: "confirmed", updated_at: iso(400) }), now), true);
  assertEquals(isPartnerDashboardItemVisible(item({ status: "completed", updated_at: iso(80) }), now), true);
  assertEquals(isPartnerDashboardItemVisible(item({ status: "completed", updated_at: iso(100) }), now), false);
});

Deno.test("geannuleerd blijft twaalf maanden zichtbaar", () => {
  assertEquals(isPartnerDashboardItemVisible(item({ status: "cancelled", updated_at: iso(300) }), now), true);
  assertEquals(isPartnerDashboardItemVisible(item({ status: "cancelled", updated_at: iso(400) }), now), false);
  assertEquals(
    isPartnerDashboardItemVisible(
      item({ status: "confirmed", updated_at: iso(30), program_requests: { status: "cancelled", cancelled_at: iso(30), selected_dates: [] } }),
      now,
    ),
    true,
  );
});

Deno.test("lastRequestDate neemt de laatste dag en negeert rommel", () => {
  assertEquals(lastRequestDate({ selected_dates: ["2026-05-21", "2026-05-20", 7] }), "2026-05-21");
  assertEquals(lastRequestDate({ selected_dates: ["9 april 2027"] }), "9 april 20");
  assertEquals(lastRequestDate({ selected_dates: null }), null);
});
