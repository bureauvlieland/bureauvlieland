import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { shouldFlag, todoForRow, type FlagTodoRow } from "./index.ts";

const row = (overrides: Partial<FlagTodoRow> = {}): FlagTodoRow => ({
  status: "missing_invoice",
  itemId: "item-1",
  invoiceId: null,
  partnerId: "oliva",
  partnerName: "Trattoria Oliva",
  label: "Diner",
  projectReference: "BV-2606-0001",
  programRequestId: "req-1",
  invoiceNumber: null,
  salesExclVat: 1000,
  purchaseExclVat: null,
  commissionAtRisk: 100,
  ...overrides,
});

Deno.test("programma-onderdeel zonder factuur: taak hangt aan het programma", () => {
  const todo = todoForRow(row());
  assertEquals(todo?.auto_type, "commission_missing_invoice");
  assertEquals(todo?.auto_entity_id, "item-1");
  assertEquals(todo?.related_request_id, "req-1");
  assertEquals(todo?.related_partner_id, "oliva");
  assertEquals(todo?.priority, "normal");
});

Deno.test("logies zonder factuur: taak hangt aan het gekoppelde programma, niet aan de logiesaanvraag", () => {
  // Regressie 4–15 oktober: related_request_id kreeg de id van de
  // logiesaanvraag en de insert viel om op de foreign key naar program_requests.
  const todo = todoForRow(row({
    itemId: "quote-1",
    partnerId: "badhotel-bruin",
    partnerName: "Badhotel Bruin",
    label: "Badhotel Bruin",
    projectReference: "LOG-2602-0004",
    programRequestId: "prog-7",
    commissionAtRisk: 300,
  }));
  assertEquals(todo?.related_request_id, "prog-7");
  assertEquals(todo?.priority, "high");
  assertEquals(todo?.title, "Inkoopfactuur ontbreekt: Badhotel Bruin — Badhotel Bruin (LOG-2602-0004)");
});

Deno.test("losse logiesaanvraag zonder programma: geen related_request_id", () => {
  const todo = todoForRow(row({ itemId: "quote-2", programRequestId: null }));
  assertEquals(todo?.related_request_id, null);
  assertEquals(todo?.auto_entity_id, "quote-2");
});

Deno.test("niet-gekoppelde inkoopfactuur: taak op de factuur", () => {
  const todo = todoForRow(row({
    status: "unlinked_invoice",
    itemId: null,
    invoiceId: "inv-9",
    invoiceNumber: "2026-017",
    programRequestId: null,
    purchaseExclVat: 420,
    commissionAtRisk: 42,
  }));
  assertEquals(todo?.auto_type, "commission_unlinked_invoice");
  assertEquals(todo?.auto_entity_id, "inv-9");
  assertEquals(todo?.related_request_id, null);
  assertEquals(todo?.title, "Inkoopfactuur niet gekoppeld: Trattoria Oliva — factuur 2026-017");
});

Deno.test("zonder entiteit geen taak", () => {
  assertEquals(todoForRow(row({ itemId: null })), null);
  assertEquals(todoForRow(row({ status: "unlinked_invoice", invoiceId: null })), null);
});

Deno.test("shouldFlag: drempels, verwachte regels en commissievrij", () => {
  const cfg = { missingDays: 14, unlinkedDays: 7 };
  assertEquals(shouldFlag({ status: "missing_invoice", ageDays: 14 }, cfg), true);
  assertEquals(shouldFlag({ status: "missing_invoice", ageDays: 13 }, cfg), false);
  assertEquals(shouldFlag({ status: "unlinked_invoice", ageDays: 7 }, cfg), true);
  assertEquals(shouldFlag({ status: "unlinked_invoice", ageDays: 6 }, cfg), false);
  assertEquals(shouldFlag({ status: "missing_invoice", ageDays: null }, cfg), false);
  assertEquals(shouldFlag({ status: "missing_invoice", ageDays: 40, readiness: "expected" }, cfg), false);
  assertEquals(shouldFlag({ status: "missing_invoice", ageDays: 40, commissionExempt: true }, cfg), false);
  assertEquals(shouldFlag({ status: "match", ageDays: 40 }, cfg), false);
});
