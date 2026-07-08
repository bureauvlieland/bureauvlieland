import { describe, it, expect } from "vitest";
import {
  getDerivedStatus,
  getTimeBucket,
  isPastDate,
  daysUntil,
} from "@/lib/projectStatus";

describe("projectStatus", () => {
  describe("getDerivedStatus", () => {
    it("program cancelled → geannuleerd", () => {
      expect(getDerivedStatus({ program_status: "cancelled", accommodation_status: null, completion_status: null, terms_accepted_at: null, quote_status: null }))
        .toBe("geannuleerd");
    });

    it("accommodation cancelled → geannuleerd", () => {
      expect(getDerivedStatus({ program_status: null, accommodation_status: "cancelled", completion_status: null, terms_accepted_at: null, quote_status: null }))
        .toBe("geannuleerd");
    });

    it("fully_invoiced → afgerond", () => {
      expect(getDerivedStatus({ program_status: null, accommodation_status: null, completion_status: "fully_invoiced", terms_accepted_at: null, quote_status: null }))
        .toBe("afgerond");
    });

    it("ready_for_invoice → facturatie", () => {
      expect(getDerivedStatus({ program_status: null, accommodation_status: null, completion_status: "ready_for_invoice", terms_accepted_at: null, quote_status: null }))
        .toBe("facturatie");
    });

    it("terms accepted → av_getekend", () => {
      expect(getDerivedStatus({ program_status: null, accommodation_status: null, completion_status: null, terms_accepted_at: "2026-07-01", quote_status: null }))
        .toBe("av_getekend");
    });

    it("quote akkoord → akkoord_ontvangen", () => {
      expect(getDerivedStatus({ program_status: null, accommodation_status: null, completion_status: null, terms_accepted_at: null, quote_status: "akkoord_ontvangen" }))
        .toBe("akkoord_ontvangen");
    });

    it("offerte verstuurd → offerte_verstuurd", () => {
      expect(getDerivedStatus({ program_status: null, accommodation_status: null, completion_status: null, terms_accepted_at: null, quote_status: "offerte_verstuurd" }))
        .toBe("offerte_verstuurd");
    });

    it("default → concept", () => {
      expect(getDerivedStatus({ program_status: null, accommodation_status: null, completion_status: null, terms_accepted_at: null, quote_status: null }))
        .toBe("concept");
    });
  });

  describe("getTimeBucket", () => {
    it("null date = no_date", () => {
      expect(getTimeBucket(null)).toBe("no_date");
    });

    it("yesterday = overdue", () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      expect(getTimeBucket(yesterday)).toBe("overdue");
    });

    it("tomorrow = this_week", () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      expect(getTimeBucket(tomorrow)).toBe("this_week");
    });

    it("far future = later", () => {
      const future = new Date();
      future.setMonth(future.getMonth() + 2);
      expect(getTimeBucket(future)).toBe("later");
    });
  });

  describe("isPastDate", () => {
    it("yesterday is past", () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      expect(isPastDate(yesterday)).toBe(true);
    });

    it("tomorrow is not past", () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      expect(isPastDate(tomorrow)).toBe(false);
    });
  });

  describe("daysUntil", () => {
    it("tomorrow = 1", () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      expect(daysUntil(tomorrow)).toBe(1);
    });

    it("null = null", () => {
      expect(daysUntil(null)).toBeNull();
    });
  });
});
