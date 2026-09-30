import { describe, it, expect } from "vitest";
import {
  findDuplicatesInSelection,
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

describe("findDuplicatesInSelection – zelfde bedrag onder een ander nummer", () => {
  it("flagt zelfde partner + bedrag op hetzelfde project", () => {
    const groups = findDuplicatesInSelection([
      row({ id: "a", partner_id: "p1", amount_incl_vat: 2340, invoice_date: "2026-09-14", invoice_number: "BV-2602-0005", request_id: "r1" }),
      row({ id: "b", partner_id: "p1", amount_incl_vat: 2340, invoice_date: "2026-09-14", invoice_number: "2026077", request_id: "r1" }),
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0].reason).toBe("amount");
    expect(groups[0].ids).toEqual(["a", "b"]);
    expect(groups[0].invoiceNumber).toBe("BV-2602-0005 / 2026077");
  });

  it("flagt zelfde partner + bedrag rond dezelfde datum als het project onbekend is", () => {
    const groups = findDuplicatesInSelection([
      row({ id: "a", partner_id: "p1", amount_incl_vat: 225, invoice_date: "2026-06-02", invoice_number: "1" }),
      row({ id: "b", partner_id: "p1", amount_incl_vat: 225, invoice_date: "2026-06-08", invoice_number: "2" }),
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0].reason).toBe("amount");
  });

  it("flagt niet bij een ander bedrag, een ander project of een datum ver weg", () => {
    expect(
      findDuplicatesInSelection([
        row({ id: "a", partner_id: "p1", amount_incl_vat: 490, invoice_date: "2026-05-01", invoice_number: "1", request_id: "r1" }),
        row({ id: "b", partner_id: "p1", amount_incl_vat: 491, invoice_date: "2026-05-01", invoice_number: "2", request_id: "r1" }),
        row({ id: "c", partner_id: "p1", amount_incl_vat: 490, invoice_date: "2026-05-01", invoice_number: "3", request_id: "r2" }),
        row({ id: "d", partner_id: "p1", amount_incl_vat: 490, invoice_date: "2026-11-01", invoice_number: "4" }),
      ]),
    ).toEqual([]);
  });

  it("nummer-groep en bedrag-groep overlappen niet", () => {
    const groups = findDuplicatesInSelection([
      row({ id: "a", partner_id: "p1", amount_incl_vat: 225, invoice_date: "2026-06-02", invoice_number: "T-261008", request_id: "r1" }),
      row({ id: "b", partner_id: "p1", amount_incl_vat: 225, invoice_date: "2026-06-08", invoice_number: "T261008", request_id: "r1" }),
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0].reason).toBe("number");
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
