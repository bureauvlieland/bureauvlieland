import { describe, it, expect } from "vitest";
import {
  findDuplicatesInSelection,
  findAmountDateCollisions,
  buildBatchPaidUpdate,
  buildBatchCancelUpdate,
  isPaidViaBatch,
  type BatchCandidate,
} from "@/lib/paymentBatchGuards";

const row = (over: Partial<BatchCandidate> & { id: string }): BatchCandidate => ({
  invoice_number: null,
  amount_incl_vat: null,
  invoice_date: null,
  ...over,
});

describe("findDuplicatesInSelection", () => {
  it("vindt hetzelfde factuurnummer bij dezelfde partner, ongeacht opmaak", () => {
    const groups = findDuplicatesInSelection([
      row({ id: "a", partner_id: "p1", invoice_number: "2025-0225" }),
      row({ id: "b", partner_id: "p1", invoice_number: "202 50225" }),
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0].ids.sort()).toEqual(["a", "b"]);
  });

  it("negeert hetzelfde nummer bij verschillende partners", () => {
    expect(
      findDuplicatesInSelection([
        row({ id: "a", partner_id: "p1", invoice_number: "1001" }),
        row({ id: "b", partner_id: "p2", invoice_number: "1001" }),
      ]),
    ).toEqual([]);
  });

  it("slaat rijen zonder partner of zonder factuurnummer over", () => {
    expect(
      findDuplicatesInSelection([
        row({ id: "a", invoice_number: "1001" }),
        row({ id: "b", invoice_number: "1001" }),
        row({ id: "c", partner_id: "p1", invoice_number: null }),
        row({ id: "d", partner_id: "p1", invoice_number: "" }),
      ]),
    ).toEqual([]);
  });

  it("leest partner-id ook uit de genestte partners-relatie en neemt de naam over", () => {
    const groups = findDuplicatesInSelection([
      row({ id: "a", partners: { id: "p1", name: "Zeezicht" }, invoice_number: "F-1" }),
      row({ id: "b", partner_id: "p1", invoice_number: "f1" }),
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0].partnerName).toBe("Zeezicht");
    expect(groups[0].normalized).toBe("F1");
  });
});

describe("findAmountDateCollisions", () => {
  it("flagt zelfde partner + bedrag + datum met verschillende nummers", () => {
    const groups = findAmountDateCollisions([
      row({ id: "a", partner_id: "p1", amount_incl_vat: 490, invoice_date: "2026-05-01", invoice_number: "1" }),
      row({ id: "b", partner_id: "p1", amount_incl_vat: 490, invoice_date: "2026-05-01", invoice_number: "2" }),
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0].ids).toHaveLength(2);
  });

  it("flagt niet bij een ander bedrag of andere datum", () => {
    expect(
      findAmountDateCollisions([
        row({ id: "a", partner_id: "p1", amount_incl_vat: 490, invoice_date: "2026-05-01" }),
        row({ id: "b", partner_id: "p1", amount_incl_vat: 491, invoice_date: "2026-05-01" }),
        row({ id: "c", partner_id: "p1", amount_incl_vat: 490, invoice_date: "2026-05-02" }),
      ]),
    ).toEqual([]);
  });

  it("negeert rijen zonder bedrag of datum", () => {
    expect(
      findAmountDateCollisions([
        row({ id: "a", partner_id: "p1", amount_incl_vat: 0, invoice_date: "2026-05-01" }),
        row({ id: "b", partner_id: "p1", amount_incl_vat: 0, invoice_date: "2026-05-01" }),
        row({ id: "c", partner_id: "p1", amount_incl_vat: 100, invoice_date: null }),
        row({ id: "d", partner_id: "p1", amount_incl_vat: 100, invoice_date: null }),
      ]),
    ).toEqual([]);
  });
});

describe("batch-statusovergangen", () => {
  it("markeert facturen in een gegenereerde batch als betaald", () => {
    const iso = "2026-07-31T10:00:00.000Z";
    expect(buildBatchPaidUpdate("batch-1", iso)).toEqual({
      payment_batch_id: "batch-1",
      status: "paid",
      paid_at: iso,
      updated_at: iso,
    });
  });

  it("draait de betaalmarkering terug naar doorgestuurd bij annulering", () => {
    const iso = "2026-07-31T11:00:00.000Z";
    expect(buildBatchCancelUpdate(iso)).toEqual({
      payment_batch_id: null,
      status: "forwarded",
      paid_at: null,
      updated_at: iso,
    });
  });

  it("heen-en-terug levert geen batch-koppeling of betaaldatum op", () => {
    const paid = buildBatchPaidUpdate("batch-1", "2026-07-31T10:00:00.000Z");
    const reverted = buildBatchCancelUpdate("2026-07-31T11:00:00.000Z");
    expect(isPaidViaBatch({ ...paid })).toBe(true);
    expect(isPaidViaBatch({ ...paid, ...reverted })).toBe(false);
  });

  it("betaald zonder batch geldt niet als betaald via batch", () => {
    expect(
      isPaidViaBatch({ status: "paid", paid_at: "2026-07-01", payment_batch_id: null }),
    ).toBe(false);
    expect(
      isPaidViaBatch({ status: "forwarded", paid_at: null, payment_batch_id: "batch-1" }),
    ).toBe(false);
  });
});
