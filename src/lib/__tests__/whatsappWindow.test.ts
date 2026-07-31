import { describe, expect, it } from "vitest";
import { getWhatsappWindowState, WHATSAPP_WINDOW_MS } from "@/lib/whatsappWindow";

const now = new Date("2026-07-31T12:00:00Z");

describe("getWhatsappWindowState", () => {
  it("is closed when there is no inbound message", () => {
    expect(getWhatsappWindowState(null, now).isOpen).toBe(false);
  });

  it("is open within 24 hours and reports remaining time", () => {
    const last = new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString();
    const state = getWhatsappWindowState(last, now);
    expect(state.isOpen).toBe(true);
    expect(state.remainingLabel).toBe("21 uur 0 min");
  });

  it("is closed exactly at and after the 24 hour boundary", () => {
    const last = new Date(now.getTime() - WHATSAPP_WINDOW_MS).toISOString();
    expect(getWhatsappWindowState(last, now).isOpen).toBe(false);
    const older = new Date(now.getTime() - WHATSAPP_WINDOW_MS - 1000).toISOString();
    expect(getWhatsappWindowState(older, now).isOpen).toBe(false);
  });

  it("ignores invalid dates", () => {
    expect(getWhatsappWindowState("niet-een-datum", now).isOpen).toBe(false);
  });
});
