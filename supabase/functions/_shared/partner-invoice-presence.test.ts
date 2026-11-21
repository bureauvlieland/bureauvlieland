import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  buildInvoicePresenceIndex,
  hasPartnerInvoiceSignal,
} from "./partner-invoice-presence.ts";

const partners = [
  { id: "zuiver", email: "info@zuiver-traiteur.nl", contact_email: null },
  { id: "fortuna", email: "winkel@fortunavlieland.nl", contact_email: "Admin@FortunaVlieland.nl" },
];

const item = { id: "item-1", provider_id: "zuiver", request_id: "req-1" };

Deno.test("zonder enig signaal is er geen factuur", () => {
  const index = buildInvoicePresenceIndex({ invoices: [], partners });
  assertEquals(hasPartnerInvoiceSignal(item, index, "BV-2605-0001"), false);
});

Deno.test("directe koppeling, allocatie en factuurnummer blijven werken", () => {
  const direct = buildInvoicePresenceIndex({ invoices: [{ item_id: "item-1", partner_id: "zuiver", invoice_number: "T-1" }] });
  assertEquals(hasPartnerInvoiceSignal(item, direct), true);
  const alloc = buildInvoicePresenceIndex({ invoices: [], allocations: [{ item_id: "item-1" }] });
  assertEquals(hasPartnerInvoiceSignal(item, alloc), true);
  const byNumber = buildInvoicePresenceIndex({ invoices: [{ partner_id: "zuiver", invoice_number: "T 261029" }] });
  assertEquals(hasPartnerInvoiceSignal({ ...item, invoiced_number: "t261029" }, byNumber), true);
});

Deno.test("een inboxfactuur die aan het project hangt (item_id leeg) telt voor dezelfde partner", () => {
  const index = buildInvoicePresenceIndex({
    invoices: [{ item_id: null, partner_id: "zuiver", request_id: "req-1", invoice_number: "T-2" }],
  });
  assertEquals(hasPartnerInvoiceSignal(item, index), true);
  // Andere partner op hetzelfde project: geen signaal.
  assertEquals(hasPartnerInvoiceSignal({ ...item, provider_id: "fortuna" }, index), false);
});

Deno.test("een onverwerkte inboxmail van het partneradres telt als factuur binnen", () => {
  const index = buildInvoicePresenceIndex({
    invoices: [],
    partners,
    inboxMails: [{ from_email: "INFO@zuiver-traiteur.nl", subject: "Factuur", status: "new" }],
  });
  assertEquals(hasPartnerInvoiceSignal(item, index), true);
  assertEquals(hasPartnerInvoiceSignal({ ...item, provider_id: "fortuna" }, index), false);
});

Deno.test("het contactadres van de partner wordt ook herkend, hoofdletterongevoelig", () => {
  const index = buildInvoicePresenceIndex({
    invoices: [],
    partners,
    inboxMails: [{ from_email: "admin@fortunavlieland.nl", status: null }],
  });
  assertEquals(hasPartnerInvoiceSignal({ ...item, provider_id: "fortuna" }, index), true);
});

Deno.test("een inboxmail met het BV-nummer in onderwerp, tekst of scan telt voor dat project", () => {
  const bySubject = buildInvoicePresenceIndex({
    invoices: [],
    inboxMails: [{ from_email: "onbekend@example.com", subject: "Factuur Zuiver voor bv-2605-0001", status: "new" }],
  });
  assertEquals(hasPartnerInvoiceSignal(item, bySubject, "BV-2605-0001"), true);
  assertEquals(hasPartnerInvoiceSignal(item, bySubject, "BV-2605-0002"), false);
  const byScan = buildInvoicePresenceIndex({
    invoices: [],
    inboxMails: [{ from_email: null, scan_result: { reference: "BV-2608-0002" }, status: "new" }],
  });
  assertEquals(hasPartnerInvoiceSignal(item, byScan, "BV-2608-0002"), true);
});

Deno.test("verwerkte of weggegooide inboxmails tellen niet meer", () => {
  const index = buildInvoicePresenceIndex({
    invoices: [],
    partners,
    inboxMails: [
      { from_email: "info@zuiver-traiteur.nl", subject: "BV-2605-0001", status: "processed" },
      { from_email: "info@zuiver-traiteur.nl", subject: "BV-2605-0001", status: "discarded" },
    ],
  });
  assertEquals(hasPartnerInvoiceSignal(item, index, "BV-2605-0001"), false);
});
