// Tests voor de route "antwoord op commissiefactuur" in inbound-email.
//
// Een partner antwoordt op de commissiefactuurmail (Reply-To
// reply+BVC-JJMM-NNNN@…). Voorheen eindigde dat in "project_not_found"; nu
// moet er een Werkbank-taak komen, gekoppeld aan de partner. We mocken alleen
// de twee gebruikte tabellen (commission_invoices, admin_todos).

import { assert, assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  buildCommissionReplyTodo,
  COMMISSION_REPLY_EXCERPT_LENGTH,
  isCommissionInvoiceReference,
  routeCommissionInvoiceReply,
} from "./commissionReply.ts";

type Row = Record<string, unknown>;

function makeMockSupabase(invoices: Row[]) {
  const inserted: Array<{ table: string; row: Row }> = [];
  const filters: Array<[string, string, unknown]> = [];
  const client = {
    from(table: string) {
      return {
        select(_cols: string) {
          return {
            eq(col: string, val: unknown) {
              filters.push([table, col, val]);
              return {
                maybeSingle() {
                  const hit = invoices.find((r) => r[col] === val) ?? null;
                  return Promise.resolve({ data: hit, error: null });
                },
              };
            },
          };
        },
        insert(row: Row) {
          inserted.push({ table, row });
          return Promise.resolve({ error: null });
        },
      };
    },
  };
  return { client, inserted, filters };
}

Deno.test("isCommissionInvoiceReference: BVC-JJMM-NNNN of jaarreeks JJNNNN", () => {
  assert(isCommissionInvoiceReference("BVC-2611-0004"));
  assert(isCommissionInvoiceReference("260041"));
  assertEquals(isCommissionInvoiceReference("26004"), false);
  assertEquals(isCommissionInvoiceReference("BV-2611-0004"), false);
  assertEquals(isCommissionInvoiceReference("LOG-2611-0004"), false);
  assertEquals(isCommissionInvoiceReference(null), false);
});

Deno.test("buildCommissionReplyTodo: afzender, onderwerp, eerste 500 tekens en partnerkoppeling", () => {
  const longText = "x".repeat(COMMISSION_REPLY_EXCERPT_LENGTH + 100);
  const todo = buildCommissionReplyTodo({
    invoiceNumber: "BVC-2611-0004",
    invoiceId: "inv-1",
    partnerId: "partner-1",
    partnerName: "Strandpaviljoen Zee",
    senderName: "Jan",
    senderEmail: "jan@zee.nl",
    subject: "Re: Commissiefactuur BVC-2611-0004",
    content: longText,
    attachmentNames: ["bon.pdf"],
  });
  assertEquals(todo.status, "todo");
  assertEquals(todo.auto_type, "commission_invoice_reply");
  assertEquals(todo.auto_entity_id, "inv-1");
  assertEquals(todo.related_partner_id, "partner-1");
  assertStringIncludes(todo.title, "BVC-2611-0004");
  assertStringIncludes(todo.title, "Strandpaviljoen Zee");
  assertStringIncludes(todo.description, "Afzender: Jan <jan@zee.nl>");
  assertStringIncludes(todo.description, "Onderwerp: Re: Commissiefactuur BVC-2611-0004");
  assertStringIncludes(todo.description, "Bijlagen: bon.pdf");
  // Tekst is ingekort tot 500 tekens plus een beletselteken.
  assertStringIncludes(todo.description, "x".repeat(COMMISSION_REPLY_EXCERPT_LENGTH) + "…");
  assert(!todo.description.includes("x".repeat(COMMISSION_REPLY_EXCERPT_LENGTH + 1)));
});

Deno.test("routeCommissionInvoiceReply: factuur gevonden → Werkbank-taak bij de partner", async () => {
  const { client, inserted, filters } = makeMockSupabase([
    { id: "inv-1", invoice_number: "BVC-2611-0004", partner_id: "partner-1", partner: { name: "Strandpaviljoen Zee" } },
  ]);
  const routed = await routeCommissionInvoiceReply(client, {
    invoiceNumber: "BVC-2611-0004",
    senderName: "Jan",
    senderEmail: "jan@zee.nl",
    subject: "Dit klopt niet",
    content: "Het bedrag is te hoog.",
  });
  assert(routed);
  assertEquals(routed.partnerId, "partner-1");
  assertEquals(filters, [["commission_invoices", "invoice_number", "BVC-2611-0004"]]);
  assertEquals(inserted.length, 1);
  assertEquals(inserted[0].table, "admin_todos");
  assertEquals(inserted[0].row.auto_type, "commission_invoice_reply");
  assertEquals(inserted[0].row.status, "todo");
  assertEquals(inserted[0].row.related_partner_id, "partner-1");
  assertStringIncludes(String(inserted[0].row.description), "Het bedrag is te hoog.");
});

Deno.test("routeCommissionInvoiceReply: onbekend factuurnummer → null, geen taak", async () => {
  const { client, inserted } = makeMockSupabase([]);
  const routed = await routeCommissionInvoiceReply(client, {
    invoiceNumber: "BVC-2611-9999",
    senderName: null,
    senderEmail: "jan@zee.nl",
    subject: null,
    content: "",
  });
  assertEquals(routed, null);
  assertEquals(inserted.length, 0);
});
