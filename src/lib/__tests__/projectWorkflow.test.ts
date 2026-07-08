import { describe, it, expect } from "vitest";
import {
  getProjectPipelineStage,
  getItemSendPhase,
  getItemSendCounts,
} from "@/lib/projectWorkflow";

describe("projectWorkflow", () => {
  describe("getProjectPipelineStage", () => {
    it("cancelled → geannuleerd", () => {
      expect(getProjectPipelineStage({ status: "cancelled" })).toBe("geannuleerd");
    });

    it("fully_invoiced → afgerond", () => {
      expect(getProjectPipelineStage({ completion_status: "fully_invoiced" })).toBe("afgerond");
    });

    it("ready_for_invoice → facturatie", () => {
      expect(getProjectPipelineStage({ completion_status: "ready_for_invoice" })).toBe("facturatie");
    });

    it("partially_invoiced → facturatie", () => {
      expect(getProjectPipelineStage({ completion_status: "partially_invoiced" })).toBe("facturatie");
    });

    it("terms_accepted_at → av_getekend", () => {
      expect(getProjectPipelineStage({ terms_accepted_at: "2026-07-01" })).toBe("av_getekend");
    });

    it("akkoord_ontvangen → akkoord_ontvangen", () => {
      expect(getProjectPipelineStage({ quote_status: "akkoord_ontvangen" })).toBe("akkoord_ontvangen");
    });

    it("definitief_bevestigd → akkoord_ontvangen", () => {
      expect(getProjectPipelineStage({ quote_status: "definitief_bevestigd" })).toBe("akkoord_ontvangen");
    });

    it("offerte_verstuurd → offerte_verstuurd", () => {
      expect(getProjectPipelineStage({ quote_status: "offerte_verstuurd" })).toBe("offerte_verstuurd");
    });

    it("default → concept", () => {
      expect(getProjectPipelineStage({})).toBe("concept");
    });
  });

  describe("getItemSendPhase", () => {
    const project = { quote_status: null as string | null };

    it("cancelled item = niet_van_toepassing", () => {
      expect(getItemSendPhase({ status: "cancelled", skip_partner_notification: true }, project)).toBe("niet_van_toepassing");
    });

    it("bureau item = niet_van_toepassing", () => {
      expect(getItemSendPhase({ status: "pending", skip_partner_notification: true, provider_id: "bureau" }, project))
        .toBe("niet_van_toepassing");
    });

    it("reeds verstuurd", () => {
      expect(getItemSendPhase({ status: "pending", skip_partner_notification: false }, project)).toBe("verstuurd");
    });

    it("klaar voor partner na customer_approved_at", () => {
      expect(
        getItemSendPhase({ status: "pending", skip_partner_notification: true, customer_approved_at: "2026-07-01" }, project),
      ).toBe("klaar_voor_partner");
    });

    it("klaar voor partner bij overall akkoord", () => {
      expect(
        getItemSendPhase({ status: "pending", skip_partner_notification: true }, { quote_status: "akkoord_ontvangen" }),
      ).toBe("klaar_voor_partner");
    });

    it("wacht op klant bij offerte_verstuurd", () => {
      expect(
        getItemSendPhase({ status: "pending", skip_partner_notification: true }, { quote_status: "offerte_verstuurd" }),
      ).toBe("wacht_op_klant");
    });

    it("concept = klaar voor partner", () => {
      expect(
        getItemSendPhase({ status: "pending", skip_partner_notification: true }, { quote_status: "concept" }),
      ).toBe("klaar_voor_partner");
    });
  });

  describe("getItemSendCounts", () => {
    it("telt fasen correct", () => {
      const items = [
        { status: "pending", skip_partner_notification: true }, // concept → klaar
        { status: "pending", skip_partner_notification: false }, // verstuurd
        { status: "cancelled", skip_partner_notification: true }, // niet van toepassing
      ];
      const counts = getItemSendCounts(items as any, { quote_status: "concept" });
      expect(counts.readyForPartner).toBe(1);
      expect(counts.alreadySent).toBe(1);
      expect(counts.waitingForCustomer).toBe(0);
    });
  });
});
