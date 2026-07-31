import { describe, it, expect } from "vitest";
import {
  isAwaitingPdfMatch,
  resolveStatusAfterPdfLink,
  isForwardableInvoice,
  daysAwaitingPdf,
} from "@/lib/purchaseInvoiceStatusFlow";

describe("purchaseInvoiceStatusFlow", () => {
  it("markeert alleen pending_email_match zonder PDF als wachtend", () => {
    expect(isAwaitingPdfMatch({ status: "pending_email_match", file_path: null })).toBe(true);
    expect(isAwaitingPdfMatch({ status: "pending_email_match", file_path: "a/b.pdf" })).toBe(false);
    expect(isAwaitingPdfMatch({ status: "pending", file_path: null })).toBe(false);
  });

  it("zet pending_email_match om naar pending zodra de PDF gekoppeld is", () => {
    expect(resolveStatusAfterPdfLink("pending_email_match", true)).toBe("pending");
    expect(resolveStatusAfterPdfLink("pending_email_match", false)).toBeNull();
    expect(resolveStatusAfterPdfLink("pending", true)).toBeNull();
    expect(resolveStatusAfterPdfLink("forwarded", true)).toBeNull();
    expect(resolveStatusAfterPdfLink("paid", true)).toBeNull();
  });

  it("laat een via-e-mail factuur mét PDF niet uit de betaalstroom vallen", () => {
    expect(isForwardableInvoice({ status: "pending_email_match", file_path: "x.pdf" })).toBe(true);
    expect(isForwardableInvoice({ status: "pending_email_match", file_path: null })).toBe(false);
    expect(isForwardableInvoice({ status: "pending", file_path: null })).toBe(true);
    expect(isForwardableInvoice({ status: "forwarded", file_path: null })).toBe(true);
    expect(isForwardableInvoice({ status: "paid", file_path: "x.pdf" })).toBe(false);
  });

  it("telt de wachtdagen alleen voor echt wachtende facturen", () => {
    const now = new Date("2026-07-31T00:00:00Z");
    expect(
      daysAwaitingPdf({ status: "pending_email_match", file_path: null, created_at: "2026-07-11T00:00:00Z" }, now),
    ).toBe(20);
    expect(
      daysAwaitingPdf({ status: "pending_email_match", file_path: "x.pdf", created_at: "2026-07-11T00:00:00Z" }, now),
    ).toBeNull();
  });
});
