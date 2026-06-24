import { describe, it, expect } from "vitest";
import {
  cooldownFor as _ignored, // ensure module loadable
} from "../projectActivity";
import {
  getProjectActivityState,
  shouldShowDuringCooldown,
  clusterForAutoType,
  HOT_DAYS,
  WARM_DAYS,
} from "../projectActivity";

const NOW = new Date("2026-07-01T12:00:00Z");
const hoursAgo = (h: number) => new Date(NOW.getTime() - h * 3600_000).toISOString();
const daysAgo = (d: number) => new Date(NOW.getTime() - d * 86_400_000).toISOString();

describe("getProjectActivityState", () => {
  it("returns cold when lastContactAt is null", () => {
    const s = getProjectActivityState(null, NOW);
    expect(s.cooldown).toBe("cold");
    expect(s.lastContactAt).toBeNull();
  });

  it("returns hot for contact within HOT_DAYS", () => {
    const s = getProjectActivityState(hoursAgo(6), NOW);
    expect(s.cooldown).toBe("hot");
  });

  it("returns warm between HOT_DAYS and WARM_DAYS", () => {
    const s = getProjectActivityState(daysAgo(HOT_DAYS + 1), NOW);
    expect(s.cooldown).toBe("warm");
  });

  it("returns cold beyond WARM_DAYS", () => {
    const s = getProjectActivityState(daysAgo(WARM_DAYS + 1), NOW);
    expect(s.cooldown).toBe("cold");
  });

  it("handles invalid date string as cold", () => {
    const s = getProjectActivityState("nonsense", NOW);
    expect(s.cooldown).toBe("cold");
  });
});

describe("shouldShowDuringCooldown", () => {
  it("always shows when cold", () => {
    expect(shouldShowDuringCooldown("cold", { priority: "normal", auto_type: "partner_reminder" })).toBe(true);
  });

  it("suppresses normal partner_reminder when hot", () => {
    expect(shouldShowDuringCooldown("hot", { priority: "normal", auto_type: "partner_reminder" })).toBe(false);
  });

  it("suppresses normal customer reminders when warm", () => {
    expect(shouldShowDuringCooldown("warm", { priority: "normal", auto_type: "quote_pending_customer" })).toBe(false);
  });

  it("keeps urgent todos visible even in hot", () => {
    expect(shouldShowDuringCooldown("hot", { priority: "urgent", auto_type: "partner_reminder" })).toBe(true);
  });

  it("keeps high-priority todos visible in warm", () => {
    expect(shouldShowDuringCooldown("warm", { priority: "high", auto_type: "partner_reminder" })).toBe(true);
  });

  it("keeps hard-deadline types visible in hot", () => {
    expect(shouldShowDuringCooldown("hot", { priority: "normal", auto_type: "quote_expired_partner" })).toBe(true);
    expect(shouldShowDuringCooldown("hot", { priority: "normal", auto_type: "inbound_email" })).toBe(true);
    expect(shouldShowDuringCooldown("hot", { priority: "normal", auto_type: "sales_inbox" })).toBe(true);
  });

  it("keeps overdue todos visible regardless of cooldown", () => {
    const yesterday = new Date(NOW.getTime() - 86_400_000).toISOString();
    expect(
      shouldShowDuringCooldown("hot", { priority: "normal", auto_type: "partner_reminder", due_date: yesterday }, NOW),
    ).toBe(true);
  });
});

describe("clusterForAutoType", () => {
  it("maps known types to expected cluster", () => {
    expect(clusterForAutoType("partner_reminder")).toBe("awaiting_partner");
    expect(clusterForAutoType("quote_pending_customer")).toBe("awaiting_customer");
    expect(clusterForAutoType("new_request_received")).toBe("next_action_bureau");
    expect(clusterForAutoType("inbound_email")).toBe("inbound");
    expect(clusterForAutoType("customer_aftersales")).toBe("post_execution");
  });

  it("falls back to 'other' for unknown / null", () => {
    expect(clusterForAutoType(null)).toBe("other");
    expect(clusterForAutoType("nonexistent_type")).toBe("other");
  });
});
