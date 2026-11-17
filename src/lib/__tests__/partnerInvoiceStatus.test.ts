import { describe, it, expect } from "vitest";
import { mailsForProject, partnerInvoiceStatusForProject, unmatchedOpenMails, type PartnerInvoiceMailRow, type PartnerPurchaseInvoiceRow } from "@/lib/partnerInvoiceStatus";

const mail = (over: Partial<PartnerInvoiceMailRow> & { id: string }): PartnerInvoiceMailRow => ({
  received_at: "2026-11-10T09:00:00Z",
  status: "new",
  scan_status: "scanned",
  reference_numbers: ["BV-2606-0004"],
  processed_invoice_id: null,
  ...over,
});

const invoice = (over: Partial<PartnerPurchaseInvoiceRow> & { id: string }): PartnerPurchaseInvoiceRow => ({
  request_ids: ["req-1"],
  invoice_number: "202600482",
  invoice_date: "2026-11-07",
  amount_incl_vat: 507.5,
  status: "pending",
  paid_at: null,
  created_at: "2026-11-07T13:00:00Z",
  ...over,
});

const base = { requestId: "req-1", referenceNumber: "BV-2606-0004" };

describe("factuurstatus per project in het portaal", () => {
  it("wacht zolang er geen mail en geen factuur is", () => {
    const s = partnerInvoiceStatusForProject({ ...base, invoices: [], mails: [] });
    expect(s.key).toBe("waiting");
    expect(s.label).toBe("Nog niet ontvangen");
  });

  it("toont 'ontvangen' bij een nieuwe mail met ons nummer erin", () => {
    const s = partnerInvoiceStatusForProject({ ...base, invoices: [], mails: [mail({ id: "m1" })] });
    expect(s.key).toBe("received");
    expect(s.label).toBe("Ontvangen op 10 november, wordt verwerkt");
  });

  it("vraagt om een losse pdf als de scan mislukte", () => {
    const s = partnerInvoiceStatusForProject({ ...base, invoices: [], mails: [mail({ id: "m1", scan_status: "failed" })] });
    expect(s.key).toBe("unreadable");
    expect(s.label).toContain("mail de factuur opnieuw als losse pdf-bijlage");
  });

  it("negeert mails zonder ons nummer en mails die al verwerkt of weggegooid zijn", () => {
    const mails = [mail({ id: "m1", reference_numbers: ["BV-2606-0099"] }), mail({ id: "m2", status: "discarded" }), mail({ id: "m3", status: "processed", processed_invoice_id: "inv" })];
    expect(partnerInvoiceStatusForProject({ ...base, invoices: [], mails }).key).toBe("waiting");
    expect(mailsForProject(mails, "bv-2606-0004").map((m) => m.id)).toEqual(["m2", "m3"]);
  });

  it("toont de verwerkte factuur met nummer en bedrag, en daarna 'betaald'", () => {
    const processed = partnerInvoiceStatusForProject({ ...base, invoices: [invoice({ id: "i1" })], mails: [mail({ id: "m1" })] });
    expect(processed.key).toBe("processed");
    expect(processed.label).toContain("factuur 202600482");
    expect(processed.label).toContain("507,50");

    const paid = partnerInvoiceStatusForProject({ ...base, invoices: [invoice({ id: "i1", status: "paid", paid_at: "2026-11-20T10:00:00Z" })], mails: [] });
    expect(paid.key).toBe("paid");
    expect(paid.label).toBe("Betaald op 20 november");
  });

  it("kent een verzamelfactuur aan elk project van zijn regels toe", () => {
    const inv = invoice({ id: "i1", request_ids: ["req-1", "req-2"] });
    expect(partnerInvoiceStatusForProject({ ...base, invoices: [inv], mails: [] }).key).toBe("processed");
    expect(partnerInvoiceStatusForProject({ ...base, requestId: "req-3", invoices: [inv], mails: [] }).key).toBe("waiting");
  });

  it("vindt open mails die bij geen enkel project passen", () => {
    const mails = [mail({ id: "m1", reference_numbers: [] }), mail({ id: "m2" }), mail({ id: "m3", reference_numbers: [], status: "processed" })];
    expect(unmatchedOpenMails(mails, ["BV-2606-0004", null]).map((m) => m.id)).toEqual(["m1"]);
  });
});
