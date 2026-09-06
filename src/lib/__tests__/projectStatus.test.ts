import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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
    // Vaste datum: woensdag 10 juni 2026. Zonder die vastzetting hing de uitkomst
    // af van de dag waarop de test toevallig draaide — op een zondag valt "morgen"
    // in de vólgende week (weken beginnen op maandag) en faalde hij.
    const woensdag = new Date(2026, 5, 10, 12, 0, 0);
    const opDag = (day: number) => new Date(2026, 5, day, 12, 0, 0);

    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(woensdag);
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    it("geen datum = no_date", () => {
      expect(getTimeBucket(null)).toBe("no_date");
    });

    it("gisteren = overdue", () => {
      expect(getTimeBucket(opDag(9))).toBe("overdue");
    });

    it("morgen = this_week", () => {
      expect(getTimeBucket(opDag(11))).toBe("this_week");
    });

    it("zondag sluit de week af", () => {
      expect(getTimeBucket(opDag(14))).toBe("this_week");
      expect(getTimeBucket(opDag(15))).toBe("this_month");
    });

    it("later deze maand = this_month", () => {
      expect(getTimeBucket(opDag(29))).toBe("this_month");
    });

    it("verre toekomst = later", () => {
      expect(getTimeBucket(new Date(2026, 7, 10, 12, 0, 0))).toBe("later");
    });

    it("op een zondag valt morgen in de volgende week", () => {
      // Precies het geval waarop deze test elke zondag omviel.
      vi.setSystemTime(new Date(2026, 8, 6, 12, 0, 0));
      expect(getTimeBucket(new Date(2026, 8, 7, 12, 0, 0))).toBe("this_month");
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
