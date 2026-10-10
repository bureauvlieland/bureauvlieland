import { assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { handler, PARTNER_VISIBLE_STATUSES } from "./index.ts";

Deno.env.set("SUPABASE_URL", "http://test-supabase.local");
Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "test-key");

const INVOICES = [
  {
    id: "inv-1",
    invoice_number: "BVC-2610-0001",
    invoice_date: "2026-10-01",
    due_date: "2026-10-15",
    status: "sent",
    amount_excl_vat: 100,
    vat_amount: 21,
    amount_incl_vat: 121,
    vat_rate: 21,
    pdf_path: "partner-1/BVC-2610-0001.pdf",
    sent_at: "2026-10-01T10:00:00Z",
    paid_at: null,
    credited_at: null,
    credits_invoice_id: null,
    credit_reason: null,
    notes: null,
  },
  {
    id: "inv-2",
    invoice_number: "BVC-2609-0004",
    invoice_date: "2026-09-10",
    due_date: "2026-09-24",
    status: "paid",
    amount_excl_vat: 50,
    vat_amount: 10.5,
    amount_incl_vat: 60.5,
    vat_rate: 21,
    pdf_path: null,
    sent_at: "2026-09-10T10:00:00Z",
    paid_at: "2026-09-20T10:00:00Z",
    credited_at: null,
    credits_invoice_id: null,
    credit_reason: null,
    notes: null,
  },
];

const LINES = [
  { id: "l1", invoice_id: "inv-1", item_type: "activity", block_name: "Diner", customer_label: "Acme", event_date: "2026-09-20", reference_number: "BV-2609-0007", invoiced_amount_excl_vat: 1000, commission_percentage: 10, commission_amount: 100, description: null, sort_order: 0 },
  { id: "l2", invoice_id: "inv-2", item_type: "accommodation", block_name: "Logies", customer_label: "Bedrijf", event_date: "2026-08-01", reference_number: "LOG-2608-0002", invoiced_amount_excl_vat: 500, commission_percentage: 10, commission_amount: 50, description: null, sort_order: 0 },
];

interface Captured {
  urls: string[];
  signBody: unknown;
}

function installFetch(options: { partnerFound?: boolean } = {}): Captured {
  const captured: Captured = { urls: [], signBody: null };
  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = input.toString();
    const method = init?.method ?? "GET";
    captured.urls.push(`${method} ${url}`);
    const ok = (body: unknown) =>
      new Response(JSON.stringify(body), { status: 200, headers: { "Content-Type": "application/json" } });

    if (url.includes("/rest/v1/partners?")) {
      return ok(options.partnerFound === false ? [] : [{ id: "partner-1", name: "Partner BV" }]);
    }
    if (url.includes("/rest/v1/commission_invoices?")) return ok(INVOICES);
    if (url.includes("/rest/v1/commission_invoice_lines?")) return ok(LINES);
    if (url.includes("/storage/v1/object/sign/commission-invoices") && method === "POST") {
      captured.signBody = JSON.parse(String(init?.body));
      return ok([
        { error: null, path: "partner-1/BVC-2610-0001.pdf", signedURL: "/object/sign/commission-invoices/partner-1/BVC-2610-0001.pdf?token=abc" },
      ]);
    }
    return new Response("not found", { status: 404 });
  };
  return captured;
}

const testOptions = { sanitizeOps: false, sanitizeResources: false };

const request = (query: string, method = "GET") =>
  new Request(`http://test-supabase.local/functions/v1/get-partner-commission-invoices${query}`, { method });

Deno.test({ name: "OPTIONS: CORS-preflight zonder body", ...testOptions, fn: async () => {
  const res = await handler(request("", "OPTIONS"));
  assertEquals(res.status, 200);
  assertEquals(res.headers.get("Access-Control-Allow-Origin"), "*");
} });

Deno.test({ name: "zonder token: 400", ...testOptions, fn: async () => {
  installFetch();
  const res = await handler(request(""));
  assertEquals(res.status, 400);
} });

Deno.test({ name: "onbekend of inactief token: 404", ...testOptions, fn: async () => {
  installFetch({ partnerFound: false });
  const res = await handler(request("?token=nope"));
  assertEquals(res.status, 404);
} });

Deno.test({ name: "facturen van de partner met regels en een tijdelijke PDF-link", ...testOptions, fn: async () => {
  const captured = installFetch();
  const res = await handler(request("?token=geheim"));
  assertEquals(res.status, 200);
  const body = await res.json();

  assertEquals(body.partner, { id: "partner-1", name: "Partner BV" });
  assertEquals(body.invoices.length, 2);

  const first = body.invoices[0];
  assertEquals(first.invoice_number, "BVC-2610-0001");
  assertEquals(first.lines.length, 1);
  assertEquals(first.lines[0].block_name, "Diner");
  assertStringIncludes(first.pdfUrl, "/storage/v1/object/sign/commission-invoices/partner-1/BVC-2610-0001.pdf");
  assertEquals(first.pdf_path, undefined, "het opslagpad blijft intern");

  const second = body.invoices[1];
  assertEquals(second.pdfUrl, null, "zonder opgeslagen PDF geen link");
  assertEquals(second.lines[0].reference_number, "LOG-2608-0002");

  // Alleen de statussen die de partner mag zien, en alleen zijn eigen facturen.
  const invoiceQuery = captured.urls.find((u) => u.includes("/rest/v1/commission_invoices?")) ?? "";
  assertStringIncludes(invoiceQuery, "partner_id=eq.partner-1");
  for (const status of PARTNER_VISIBLE_STATUSES) assertStringIncludes(invoiceQuery, status);
  assertStringIncludes(invoiceQuery, "status=in.");

  // Eén aanvraag voor alle PDF-links, alleen voor facturen met een PDF.
  assertEquals((captured.signBody as { paths: string[] }).paths, ["partner-1/BVC-2610-0001.pdf"]);
} });

Deno.test({ name: "partner zonder facturen: lege lijst zonder storage-aanroep", ...testOptions, fn: async () => {
  const captured = installFetch();
  globalThis.fetch = (() => {
    const inner = globalThis.fetch;
    return async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = input.toString();
      if (url.includes("/rest/v1/commission_invoices?")) {
        captured.urls.push(`GET ${url}`);
        return new Response("[]", { status: 200, headers: { "Content-Type": "application/json" } });
      }
      return inner(input, init);
    };
  })();
  const res = await handler(request("?token=geheim"));
  assertEquals(res.status, 200);
  const body = await res.json();
  assertEquals(body.invoices, []);
  assertEquals(captured.urls.some((u) => u.includes("/storage/v1/")), false);
  assertEquals(captured.urls.some((u) => u.includes("commission_invoice_lines")), false);
} });
