import { describe, expect, it } from "vitest";
import { buildFunnel, googleReviewsPerMonth, responsePercentage, type FunnelReview } from "@/lib/reviewFunnel";

const now = new Date("2026-09-22T12:00:00Z");
const review = (extra: Partial<FunnelReview>): FunnelReview => ({
  created_at: "2026-09-01T10:00:00Z",
  status: "new",
  source: "portal",
  google_clicked_at: null,
  reminder_sent_at: null,
  ...extra,
});

describe("buildFunnel", () => {
  it("telt per stap, recent en totaal, en laat bestaande citaten buiten de eigen beoordelingen", () => {
    const rows = buildFunnel({
      now,
      reviews: [
        review({ status: "published", google_clicked_at: "2026-09-02T10:00:00Z" }),
        review({ created_at: "2026-03-01T10:00:00Z", status: "published", reminder_sent_at: "2026-03-08T10:00:00Z" }),
        review({ created_at: "2026-09-10T10:00:00Z", status: "hidden" }),
        review({ source: "legacy", status: "published" }),
        review({ created_at: "rommel" }),
      ],
      aftersalesSentAt: ["2026-09-01T09:00:00Z", "2026-02-01T09:00:00Z", "2026-08-01T09:00:00Z"],
      referencesPublishedAt: ["2026-09-20T10:00:00Z"],
    });
    expect(rows.map((r) => [r.key, r.recent, r.total])).toEqual([
      ["verstuurd", 2, 3],
      ["ingevuld", 2, 3],
      ["gepubliceerd", 1, 2],
      ["google", 1, 1],
      ["herinnerd", 0, 1],
      ["referenties", 1, 1],
    ]);
    expect(responsePercentage(rows, "recent")).toBe(100);
    expect(responsePercentage(rows, "total")).toBe(100);
  });

  it("geeft geen percentage zonder verstuurde mails", () => {
    const rows = buildFunnel({ now, reviews: [review({})], aftersalesSentAt: [], referencesPublishedAt: [] });
    expect(responsePercentage(rows, "total")).toBeNull();
  });
});

describe("googleReviewsPerMonth", () => {
  it("telt de laatste maanden, oudste eerst, met lege maanden op nul", () => {
    const rows = googleReviewsPerMonth(
      [
        { publish_time: "2026-09-03T10:00:00Z" },
        { publish_time: "2026-09-21T10:00:00Z" },
        { publish_time: "2026-07-15T10:00:00Z" },
        { publish_time: "2025-12-15T10:00:00Z" },
        { publish_time: null },
        { publish_time: "geen datum" },
      ],
      now,
      4,
    );
    expect(rows.map((r) => [r.month, r.count])).toEqual([
      ["2026-06", 0],
      ["2026-07", 1],
      ["2026-08", 0],
      ["2026-09", 2],
    ]);
    expect(rows[3].label).toBe("september 2026");
  });
});
