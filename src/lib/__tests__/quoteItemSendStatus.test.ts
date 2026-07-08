import { describe, it, expect } from "vitest";
import {
  getQuoteItemSendPhase,
  countReadyToSend,
  countWaitingForCustomer,
} from "@/lib/quoteItemSendStatus";

describe("quoteItemSendStatus", () => {
  const baseProgram = { quote_status: null as string | null };

  it("skip_partner_notification false = verstuurd", () => {
    expect(getQuoteItemSendPhase({ status: "pending", skip_partner_notification: false }, baseProgram)).toBe("verstuurd");
  });

  it("customer_approved_at = klaar_om_te_sturen", () => {
    expect(getQuoteItemSendPhase({ status: "pending", skip_partner_notification: true, customer_approved_at: "2026-07-01" }, baseProgram))
      .toBe("klaar_om_te_sturen");
  });

  it("overall quote akkoord = klaar_om_te_sturen", () => {
    expect(getQuoteItemSendPhase({ status: "pending", skip_partner_notification: true }, { quote_status: "akkoord_ontvangen" }))
      .toBe("klaar_om_te_sturen");
  });

  it("definitief_bevestigd = klaar_om_te_sturen", () => {
    expect(getQuoteItemSendPhase({ status: "pending", skip_partner_notification: true }, { quote_status: "definitief_bevestigd" }))
      .toBe("klaar_om_te_sturen");
  });

  it("offerte_verstuurd = wacht_op_klant", () => {
    expect(getQuoteItemSendPhase({ status: "pending", skip_partner_notification: true }, { quote_status: "offerte_verstuurd" }))
      .toBe("wacht_op_klant");
  });

  it("concept = klaar_om_te_sturen", () => {
    expect(getQuoteItemSendPhase({ status: "pending", skip_partner_notification: true }, { quote_status: "concept" }))
      .toBe("klaar_om_te_sturen");
  });

  it("countReadyToSend telt alleen klaar items", () => {
    const items = [
      { status: "pending", skip_partner_notification: true },
      { status: "pending", skip_partner_notification: false },
      { status: "cancelled", skip_partner_notification: true },
    ];
    expect(countReadyToSend(items as any, { quote_status: "akkoord_ontvangen" })).toBe(1);
  });

  it("countWaitingForCustomer telt alleen wachtende items", () => {
    const items = [
      { status: "pending", skip_partner_notification: true },
      { status: "pending", skip_partner_notification: true },
      { status: "cancelled", skip_partner_notification: true },
    ];
    expect(countWaitingForCustomer(items as any, { quote_status: "offerte_verstuurd" })).toBe(2);
  });
});
