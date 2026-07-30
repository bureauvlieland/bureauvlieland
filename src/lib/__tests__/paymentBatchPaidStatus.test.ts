import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  buildBatchPaidUpdate,
  buildBatchCancelUpdate,
  isPaidViaBatch,
} from "@/lib/paymentBatchGuards";

describe("betaalstatus rond betaalbatches", () => {
  it("markeert een factuur als betaald bij opname in een batch", () => {
    const iso = "2026-07-30T09:00:00.000Z";
    expect(buildBatchPaidUpdate("batch-1", iso)).toEqual({
      payment_batch_id: "batch-1",
      status: "paid",
      paid_at: iso,
      updated_at: iso,
    });
  });

  it("draait de betaalmarkering terug bij annulering van de batch", () => {
    const iso = "2026-07-30T09:00:00.000Z";
    const update = buildBatchCancelUpdate(iso);
    expect(update.status).toBe("forwarded");
    expect(update.paid_at).toBeNull();
    expect(update.payment_batch_id).toBeNull();
  });

  it("een geannuleerde factuur komt weer in aanmerking voor een nieuwe batch", () => {
    const reverted = buildBatchCancelUpdate("2026-07-30T09:00:00.000Z");
    // candidates-query filtert op status 'forwarded' + payment_batch_id is null
    expect(reverted.status).toBe("forwarded");
    expect(reverted.payment_batch_id).toBeNull();
  });

  it("herkent betaald-via-batch en onderscheidt het van handmatig betaald", () => {
    expect(
      isPaidViaBatch({ status: "paid", paid_at: "x", payment_batch_id: "b1" }),
    ).toBe(true);
    expect(
      isPaidViaBatch({ status: "paid", paid_at: "x", payment_batch_id: null }),
    ).toBe(false);
    expect(
      isPaidViaBatch({ status: "forwarded", paid_at: null, payment_batch_id: "b1" }),
    ).toBe(false);
  });
});

describe("broncontract: batchgeneratie zet status op betaald", () => {
  const src = readFileSync(
    resolve(process.cwd(), "supabase/functions/generate-payment-batch/index.ts"),
    "utf8",
  );

  it("koppelt de facturen en zet ze in dezelfde update op paid", () => {
    const linkBlock = src.slice(src.indexOf("payment_batch_id: batch.id"));
    const upTo = linkBlock.slice(0, 300);
    expect(upTo).toContain('status: "paid"');
    expect(upTo).toContain("paid_at");
  });

  it("markeert pas nadat alle validaties zijn gepasseerd", () => {
    const validationExit = src.indexOf("if (errors.length > 0)");
    const paidUpdate = src.indexOf("payment_batch_id: batch.id");
    expect(validationExit).toBeGreaterThan(-1);
    expect(paidUpdate).toBeGreaterThan(validationExit);
  });
});

describe("broncontract: annuleren draait terug", () => {
  const src = readFileSync(
    resolve(process.cwd(), "src/pages/admin/AdminPaymentBatches.tsx"),
    "utf8",
  );

  it("gebruikt de gedeelde terugdraai-payload bij annuleren", () => {
    expect(src).toContain("buildBatchCancelUpdate");
    expect(src).not.toContain("update({ payment_batch_id: null })");
  });
});
