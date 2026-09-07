import { assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  INVOICE_SCAN_SYSTEM_PROMPT,
  INVOICE_SCAN_TOOL,
  normalizeScannedInvoice,
  type ScannedInvoice,
} from "./purchaseInvoiceScan.ts";

const line = (
  description: string,
  unit_price: number,
  vat_rate: number,
  quantity = 1,
) => ({ description, quantity, unit_price, total_excl_vat: null, vat_rate });

Deno.test("horecabon: inclusieve regelprijzen worden naar exclusief omgerekend", () => {
  // Een bon waarvan de prijskolom inclusief btw is: de regels tellen op tot het
  // te betalen bedrag, niet tot het bedrag ex btw.
  const scanned: ScannedInvoice = {
    amount_excl_vat: 100,
    amount_incl_vat: 109,
    prices_include_vat: true,
    line_items: [line("Koffie", 109, 9)],
  };

  normalizeScannedInvoice(scanned);

  assertEquals(scanned.line_items![0].unit_price, 100);
});

Deno.test("de vlag van de scanner wordt gecorrigeerd als de sommen iets anders zeggen", () => {
  // Scanner zegt "exclusief", maar de regels tellen op tot het bedrag INCLUSIEF.
  const scanned: ScannedInvoice = {
    amount_excl_vat: 100,
    amount_incl_vat: 121,
    prices_include_vat: false,
    line_items: [line("Zaalhuur", 121, 21)],
  };

  normalizeScannedInvoice(scanned);

  assertEquals(scanned.prices_include_vat, true);
  assertEquals(scanned.line_items![0].unit_price, 100);
});

Deno.test("exclusieve prijzen blijven ongemoeid", () => {
  const scanned: ScannedInvoice = {
    amount_excl_vat: 100,
    amount_incl_vat: 121,
    prices_include_vat: false,
    line_items: [line("Advies", 100, 21)],
  };

  normalizeScannedInvoice(scanned);

  assertEquals(scanned.line_items![0].unit_price, 100);
  assertEquals(scanned.prices_include_vat, false);
});

Deno.test("regels met verschillende tarieven worden elk tegen hun eigen tarief omgerekend", () => {
  const scanned: ScannedInvoice = {
    amount_excl_vat: 200,
    amount_incl_vat: 230,
    prices_include_vat: true,
    line_items: [line("Eten", 109, 9), line("Drank", 121, 21)],
  };

  normalizeScannedInvoice(scanned);

  assertEquals(scanned.line_items![0].unit_price, 100);
  assertEquals(scanned.line_items![1].unit_price, 100);
});

Deno.test("na omrekening worden regels naar rato bijgesteld op het factuurtotaal", () => {
  // De regels lopen na omrekening ruim een euro uit de pas met de kop; dan wint
  // de kop, want die staat op de factuur.
  const scanned: ScannedInvoice = {
    amount_excl_vat: 100,
    amount_incl_vat: 109,
    prices_include_vat: true,
    line_items: [line("Diverse", 120, 9)],
  };

  normalizeScannedInvoice(scanned);

  assertEquals(scanned.line_items![0].unit_price, 100);
});

Deno.test("houdt rekening met het aantal", () => {
  const scanned: ScannedInvoice = {
    amount_excl_vat: 200,
    amount_incl_vat: 218,
    prices_include_vat: true,
    line_items: [line("Lunch", 21.8, 9, 10)],
  };

  normalizeScannedInvoice(scanned);

  assertEquals(scanned.line_items![0].unit_price, 20);
});

Deno.test("een factuur zonder regels blijft ongewijzigd", () => {
  const scanned: ScannedInvoice = {
    amount_excl_vat: 100,
    amount_incl_vat: 121,
    line_items: [],
  };
  normalizeScannedInvoice(scanned);
  assertEquals(scanned.line_items, []);
});

Deno.test("prompt en schema dekken de velden waar de verwerking op leunt", () => {
  // Deze zaten alleen in de uploadroute en misten in de inbox; die drift is
  // precies wat deze gedeelde module voorkomt.
  assertStringIncludes(INVOICE_SCAN_SYSTEM_PROMPT, "PRICES_INCLUDE_VAT");
  assertStringIncludes(INVOICE_SCAN_SYSTEM_PROMPT, "VAT BREAKDOWN");

  const props = INVOICE_SCAN_TOOL.function.parameters.properties as Record<string, unknown>;
  const required = INVOICE_SCAN_TOOL.function.parameters.required as string[];
  for (const field of ["prices_include_vat", "vat_breakdown", "customer_reference", "line_items"]) {
    assertEquals(field in props, true, `${field} ontbreekt in het schema`);
    assertEquals(required.includes(field), true, `${field} ontbreekt in required`);
  }
});
