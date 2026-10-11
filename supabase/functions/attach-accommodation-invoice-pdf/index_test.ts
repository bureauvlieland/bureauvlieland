import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { handler, isPathInPartnerFolder } from "./index.ts";

Deno.env.set("SUPABASE_URL", "http://test-supabase.local");
Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "test-key");

interface Captured {
  urls: string[];
  updateBody: unknown;
}

function installFetch(options: { partnerFound?: boolean; quote?: Record<string, unknown> | null; fileExists?: boolean } = {}): Captured {
  const captured: Captured = { urls: [], updateBody: null };
  const quote = options.quote === undefined ? { id: "q-1", invoiced_number: "F-2026-12", invoiced_file_path: null } : options.quote;
  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = input.toString();
    const method = init?.method ?? "GET";
    captured.urls.push(`${method} ${url}`);
    const ok = (body: unknown) => new Response(JSON.stringify(body), { status: 200, headers: { "Content-Type": "application/json" } });
    if (url.includes("/rest/v1/partners?")) return ok(options.partnerFound === false ? [] : [{ id: "partner-1", name: "Hotel Zeezicht" }]);
    if (url.includes("/rest/v1/accommodation_quotes?") && method === "GET") return ok(quote ? [quote] : []);
    if (url.includes("/rest/v1/accommodation_quotes?") && method === "PATCH") {
      captured.updateBody = JSON.parse(String(init?.body));
      return ok([]);
    }
    if (url.includes("/storage/v1/object/list/partner-invoices") && method === "POST") {
      return ok(options.fileExists === false ? [] : [{ name: "q-1-123.pdf", id: "obj-1" }]);
    }
    return new Response("not found", { status: 404 });
  };
  return captured;
}

const testOptions = { sanitizeOps: false, sanitizeResources: false };
const request = (body: unknown, method = "POST") =>
  new Request("http://test-supabase.local/functions/v1/attach-accommodation-invoice-pdf", {
    method,
    headers: { "Content-Type": "application/json" },
    body: method === "POST" ? JSON.stringify(body) : undefined,
  });
const GOOD = { quoteId: "q-1", partnerToken: "geheim", filePath: "partner-1/req-1/q-1-123.pdf" };

Deno.test("isPathInPartnerFolder: alleen een pdf in de eigen map", () => {
  assertEquals(isPathInPartnerFolder("partner-1/req/q.pdf", "partner-1"), true);
  assertEquals(isPathInPartnerFolder("partner-1/req/q.PDF", "partner-1"), true);
  assertEquals(isPathInPartnerFolder("partner-2/req/q.pdf", "partner-1"), false);
  assertEquals(isPathInPartnerFolder("partner-1/../partner-2/q.pdf", "partner-1"), false);
  assertEquals(isPathInPartnerFolder("partner-1/req/q.jpg", "partner-1"), false);
  assertEquals(isPathInPartnerFolder("partner-10/q.pdf", "partner-1"), false);
});

Deno.test({ name: "OPTIONS: CORS-preflight", ...testOptions, fn: async () => {
  const res = await handler(request(null, "OPTIONS"));
  assertEquals(res.status, 200);
  assertEquals(res.headers.get("Access-Control-Allow-Origin"), "*");
} });

Deno.test({ name: "zonder velden: 400", ...testOptions, fn: async () => {
  installFetch();
  const res = await handler(request({ quoteId: "q-1" }));
  assertEquals(res.status, 400);
} });

Deno.test({ name: "onbekend token: 404", ...testOptions, fn: async () => {
  installFetch({ partnerFound: false });
  assertEquals((await handler(request(GOOD))).status, 404);
} });

Deno.test({ name: "pad buiten de eigen map: 400, zonder update", ...testOptions, fn: async () => {
  const captured = installFetch();
  const res = await handler(request({ ...GOOD, filePath: "partner-2/req-1/q-1.pdf" }));
  assertEquals(res.status, 400);
  assertEquals(captured.updateBody, null);
} });

Deno.test({ name: "offerte van een andere partner: 404", ...testOptions, fn: async () => {
  installFetch({ quote: null });
  assertEquals((await handler(request(GOOD))).status, 404);
} });

Deno.test({ name: "nog geen factuur geregistreerd: 400", ...testOptions, fn: async () => {
  installFetch({ quote: { id: "q-1", invoiced_number: null, invoiced_file_path: null } });
  const res = await handler(request(GOOD));
  assertEquals(res.status, 400);
  assertEquals((await res.json()).error, "Registreer eerst de factuur, voeg daarna de pdf toe");
} });

Deno.test({ name: "bestand niet in de opslag: 404, zonder update", ...testOptions, fn: async () => {
  const captured = installFetch({ fileExists: false });
  assertEquals((await handler(request(GOOD))).status, 404);
  assertEquals(captured.updateBody, null);
} });

Deno.test({ name: "koppelt het pad aan de offerte van de partner", ...testOptions, fn: async () => {
  const captured = installFetch();
  const res = await handler(request(GOOD));
  assertEquals(res.status, 200);
  assertEquals((await res.json()).success, true);
  assertEquals((captured.updateBody as { invoiced_file_path: string }).invoiced_file_path, GOOD.filePath);
  const quoteQuery = captured.urls.find((u) => u.startsWith("GET") && u.includes("/rest/v1/accommodation_quotes?")) ?? "";
  assertEquals(quoteQuery.includes("partner_id=eq.partner-1"), true, "alleen de eigen offerte");
  const update = captured.urls.find((u) => u.startsWith("PATCH")) ?? "";
  assertEquals(update.includes("id=eq.q-1"), true);
} });
