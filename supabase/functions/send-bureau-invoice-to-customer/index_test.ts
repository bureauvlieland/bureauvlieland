import { assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { handler } from "./index.ts";

Deno.env.set("SUPABASE_URL", "http://test-supabase.local");
Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "test-key");
Deno.env.set("MAILJET_API_KEY", "mj-key");
Deno.env.set("MAILJET_SECRET_KEY", "mj-secret");

function createRequest(body: unknown, opts?: { auth?: string; origin?: string }): Request {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (opts?.auth) headers["Authorization"] = `Bearer ${opts.auth}`;
  if (opts?.origin) headers["origin"] = opts.origin;
  return new Request("http://test-supabase.local/functions/v1/send-bureau-invoice-to-customer", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

function makeFetch(options: { duplicateIdempotency?: boolean } = {}) {
  return async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = input.toString();
    const method = init?.method ?? "GET";

    if (url.includes("/auth/v1/user") && method === "GET") {
      return new Response(JSON.stringify({ user: { id: "admin-1" } }), { status: 200, headers: { "Content-Type": "application/json" } });
    }
    if (url.includes("/rest/v1/user_roles") && method === "GET") {
      return new Response(JSON.stringify([{ role: "admin" }]), { status: 200, headers: { "Content-Type": "application/json" } });
    }
    if (url.includes("/rest/v1/program_requests") && method === "GET") {
      return new Response(
        JSON.stringify([
          {
            id: "req-1",
            reference_number: "BV-2026-0001",
            customer_name: "Test Klant",
            customer_email: "test@example.com",
            customer_company: null,
            billing_company_name: null,
            billing_contact_name: null,
            billing_contact_email: null,
          },
        ]),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }
    if (url.includes("/rest/v1/email_log") && method === "GET") {
      if (options.duplicateIdempotency && url.includes("idempotency_key=eq.bureau-invoice-FV-2026-0001-test")) {
        return new Response(
          JSON.stringify([{ mailjet_message_id: "existing-123", sent_at: new Date().toISOString() }]),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      return new Response(JSON.stringify([]), { status: 200, headers: { "Content-Type": "application/json" } });
    }
    if (url === "https://api.mailjet.com/v3.1/send" && method === "POST") {
      return new Response(
        JSON.stringify({ Messages: [{ Status: "success", To: [{ Email: "test@example.com", MessageID: 12345 }] }] }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }
    if (url.includes("/rest/v1/email_log") && method === "POST") {
      return new Response(JSON.stringify({}), { status: 200, headers: { "Content-Type": "application/json" } });
    }
    if (url.includes("/rest/v1/program_request_history") && method === "POST") {
      return new Response(JSON.stringify({}), { status: 200, headers: { "Content-Type": "application/json" } });
    }
    return new Response(JSON.stringify({ error: "unexpected fetch", url, method }), { status: 500 });
  };
}

Deno.test({
  name: "send-bureau-invoice-to-customer: 401 zonder auth",
  sanitizeOps: false,
  sanitizeResources: false,
}, async () => {
  const res = await handler(createRequest({}));
  assertEquals(res.status, 401);
});

Deno.test({
  name: "send-bureau-invoice-to-customer: 400 bij ontbrekende velden",
  sanitizeOps: false,
  sanitizeResources: false,
}, async () => {
  const original = globalThis.fetch;
  globalThis.fetch = makeFetch();
  try {
    const res = await handler(createRequest({ requestId: "req-1" }, { auth: "token" }));
    assertEquals(res.status, 400);
    const json = await res.json();
    assertStringIncludes(json.error, "Missing field");
  } finally {
    globalThis.fetch = original;
  }
});

Deno.test({
  name: "send-bureau-invoice-to-customer: verstuurt factuur en logt messageID",
  sanitizeOps: false,
  sanitizeResources: false,
}, async () => {
  const original = globalThis.fetch;
  const logs: { url: string; method: string; body?: unknown }[] = [];
  globalThis.fetch = async (input, init) => {
    const url = input.toString();
    const method = init?.method ?? "GET";
    if (init?.body) {
      try {
        logs.push({ url, method, body: JSON.parse(init.body as string) });
      } catch {
        logs.push({ url, method });
      }
    } else {
      logs.push({ url, method });
    }
    return makeFetch()(input, init);
  };
  try {
    const res = await handler(
      createRequest(
        {
          requestId: "req-1",
          pdfBase64: "BASE64",
          pdfFilename: "factuur.pdf",
          invoiceNumber: "FV-2026-0001",
          invoiceDate: "2026-07-01",
          amountInclVat: 1210,
        },
        { auth: "token" },
      ),
    );
    assertEquals(res.status, 200);
    const json = await res.json();
    assertEquals(json.success, true);
    assertEquals(json.recipient, "test@example.com");

    const mailjetLog = logs.find((l) => l.url === "https://api.mailjet.com/v3.1/send");
    assertEquals(mailjetLog?.method, "POST");
    const emailLog = logs.find((l) => l.url.includes("/rest/v1/email_log") && l.method === "POST");
    assertEquals((emailLog?.body as any)?.mailjet_message_id, "12345");
    assertEquals((emailLog?.body as any)?.metadata?.template_name, "bureau_invoice_to_customer");
    assertEquals((emailLog?.body as any)?.metadata?.actor, "admin → klant");
  } finally {
    globalThis.fetch = original;
  }
});

Deno.test({
  name: "send-bureau-invoice-to-customer: idempotency duplicate voorkomt herhaalde send",
  sanitizeOps: false,
  sanitizeResources: false,
}, async () => {
  const original = globalThis.fetch;
  let mailjetCalls = 0;
  globalThis.fetch = async (input, init) => {
    const url = input.toString();
    if (url === "https://api.mailjet.com/v3.1/send") mailjetCalls++;
    return makeFetch({ duplicateIdempotency: true })(input, init);
  };
  try {
    const res = await handler(
      createRequest(
        {
          requestId: "req-1",
          pdfBase64: "BASE64",
          pdfFilename: "factuur.pdf",
          invoiceNumber: "FV-2026-0001",
          invoiceDate: "2026-07-01",
          amountInclVat: 1210,
        },
        { auth: "token" },
      ),
    );
    assertEquals(res.status, 200);
    const json = await res.json();
    assertEquals(json.deduped, true);
    assertEquals(json.mailjetMessageId, "existing-123");
    assertEquals(mailjetCalls, 0);
  } finally {
    globalThis.fetch = original;
  }
});
