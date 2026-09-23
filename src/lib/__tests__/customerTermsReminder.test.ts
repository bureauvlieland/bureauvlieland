import { describe, it, expect } from "vitest";
import {
  allItemsConfirmedForTerms,
  pickTermsMail,
} from "../../../supabase/functions/_shared/customerTermsReminder";

const now = new Date("2026-09-23T08:00:00Z");
const daysAgo = (n: number) => new Date(now.getTime() - n * 86400000).toISOString();

describe("allItemsConfirmedForTerms", () => {
  it("true als alle relevante onderdelen bevestigd zijn", () => {
    expect(
      allItemsConfirmedForTerms([
        { status: "confirmed" },
        { status: "accepted" },
        { status: "cancelled" },
        { status: "pending", block_type: "self_arranged" },
        { status: "pending", day_index: -1 },
      ]),
    ).toBe(true);
  });
  it("false als er nog iets bij een partner openstaat", () => {
    expect(allItemsConfirmedForTerms([{ status: "confirmed" }, { status: "pending" }])).toBe(false);
  });
  it("bureau-onderdelen tellen als bevestigd", () => {
    expect(
      allItemsConfirmedForTerms(
        [{ status: "pending", block_type: "bureau" }, { status: "confirmed" }],
        (i) => i.block_type === "bureau",
      ),
    ).toBe(true);
  });
  it("false zonder onderdelen", () => {
    expect(allItemsConfirmedForTerms([])).toBe(false);
    expect(allItemsConfirmedForTerms([{ status: "cancelled" }])).toBe(false);
  });
});

describe("pickTermsMail", () => {
  it("eerste verzoek als het event nog ver weg is", () => {
    expect(pickTermsMail(40, [], now)).toBe("customer_terms_request");
  });
  it("niets als het eerste verzoek al verstuurd is en er nog geen deadline nadert", () => {
    expect(pickTermsMail(40, [{ type: "customer_terms_request", at: daysAgo(10) }], now)).toBeNull();
  });
  it("T-14, T-7 en T-3 herinneringen", () => {
    const sent = [{ type: "customer_terms_request", at: daysAgo(20) }];
    expect(pickTermsMail(14, sent, now)).toBe("customer_terms_reminder_t14");
    expect(pickTermsMail(6, sent, now)).toBe("customer_terms_reminder_t7");
    expect(pickTermsMail(2, sent, now)).toBe("customer_terms_reminder_t3");
  });
  it("laat verzoek: alleen de meest urgente fase", () => {
    expect(pickTermsMail(5, [], now)).toBe("customer_terms_reminder_t7");
    expect(pickTermsMail(0, [], now)).toBe("customer_terms_reminder_t3");
  });
  it("minimaal twee dagen tussen mails", () => {
    expect(pickTermsMail(7, [{ type: "customer_terms_reminder_t14", at: daysAgo(1) }], now)).toBeNull();
    expect(pickTermsMail(7, [{ type: "customer_terms_reminder_t14", at: daysAgo(3) }], now)).toBe(
      "customer_terms_reminder_t7",
    );
  });
  it("niets na het event", () => {
    expect(pickTermsMail(-1, [], now)).toBeNull();
  });
});
