import { assertAlmostEquals, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { loadReconciliationInputs } from "./commissionReconciliationData.ts";

/**
 * Nep-client: elke tabel geeft de vaste rijen terug, welke filters er ook op
 * staan. Zo draait de hele lader (inclusief de logies-mapping) zonder
 * database. CI draait de Deno-tests met --no-check, dus een verkeerde
 * functienaam viel pas in productie om; deze test voert de code echt uit.
 */
const fakeClient = (tables: Record<string, unknown[]>) => ({
  from(table: string) {
    const result = { data: tables[table] ?? [], error: null };
    const query: Record<string | symbol, unknown> = new Proxy({}, {
      get(_target, prop): unknown {
        if (prop === "then") {
          return (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) =>
            Promise.resolve(result).then(resolve, reject);
        }
        return () => query;
      },
    });
    return query;
  },
});

const quote = {
  id: "q1",
  request_id: "ar1",
  partner_id: "p1",
  accommodation_name: "Hotel Zee",
  price_total: 1090,
  price_includes_vat: true,
  vat_rate: 9,
  commission_percentage: 10,
  commission_status: "pending",
  invoiced_number: null,
  invoiced_amount: null,
  status: "selected",
  purchase_invoice_id: null,
  commission_exempt: false,
  commission_exempt_reason: null,
  commission_exempt_at: null,
  accommodation_requests: {
    id: "ar1",
    reference_number: "BV-2609-0001",
    customer_name: "Test",
    customer_company: null,
    arrival_date: "2026-09-01",
    departure_date: "2026-09-03",
    completion_status: null,
    completed_at: null,
  },
};

const partner = {
  id: "p1",
  name: "Hotel Zee",
  commission_percentage: 10,
  accommodation_commission_percentage: 10,
  extras_commission_percentage: 15,
  pays_by_direct_debit: false,
};

Deno.test("logies-offerte: kamerprijs naar ex btw, extra's apart teruggerekend en opgeteld", async () => {
  const client = fakeClient({
    accommodation_quotes: [quote],
    accommodation_quote_extras: [
      // 121 incl 21 % → 100 ex btw
      { quote_id: "q1", name: "Diner", category: "fb", unit_price: 121, quantity: 1, pricing_type: "fixed", vat_rate: 21, price_includes_vat: true, commission_percentage: 15 },
      // per stuk: 2 × 10,90 incl 9 % → 20 ex btw
      { quote_id: "q1", name: "Ontbijt", category: "fb", unit_price: 10.9, quantity: 2, pricing_type: "per_person", vat_rate: 9, price_includes_vat: true, commission_percentage: null },
    ],
    partners: [partner],
  });
  const inputs = await loadReconciliationInputs(client, { now: new Date("2026-09-20T10:00:00Z") });

  assertEquals(inputs.items.length, 1);
  const item = inputs.items[0];
  assertEquals(item.item_type, "accommodation");
  assertEquals(item.vat_rate, 0);
  // 1090 incl 9 % → 1000, plus 100 + 20 aan extra's
  assertAlmostEquals(item.quoted_price ?? 0, 1120, 0.01);
  assertEquals(item.extras_rate_mismatch, true);
  assertEquals(inputs.projects.map((p) => p.id), ["ar1"]);
});

Deno.test("logies-offerte zonder extra's: alleen de kamerprijs, geen tariefwaarschuwing", async () => {
  const client = fakeClient({ accommodation_quotes: [quote], partners: [partner] });
  const inputs = await loadReconciliationInputs(client, {});
  const item = inputs.items[0];
  assertAlmostEquals(item.quoted_price ?? 0, 1000, 0.01);
  assertEquals(item.extras_rate_mismatch, false);
});

Deno.test("prijs al ex btw (price_includes_vat false) wordt niet nog eens gedeeld", async () => {
  const client = fakeClient({
    accommodation_quotes: [{ ...quote, price_total: 1000, price_includes_vat: false }],
    partners: [partner],
  });
  const inputs = await loadReconciliationInputs(client, {});
  assertAlmostEquals(inputs.items[0].quoted_price ?? 0, 1000, 0.01);
});
