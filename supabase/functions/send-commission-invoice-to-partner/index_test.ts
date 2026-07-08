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
  return new Request("http://test-supabase.local/functions/v1/send-commission-invoice-to-partner", {
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
    if (url.includes("/rest/v1/commission_invoices?") && method === "GET") {
      return new Response(
        JSON.stringify([
          {
            id: "inv-1",
            invoice_number: "CF-2026-0001",
            invoice_date: "2026-07-01",
            partner_id: "partner-1",
            amount_excl_vat: 100,
            vat_amount: 21,
            amount_incl_vat: 121,
            vat_rate: 21,
            recipient_email: "partner@example.com",
            recipient_name: "Partner BV",
            status: "draft",
          },
        ]),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }
    if (url.includes("/rest/v1/commission_invoice_lines") && method === "GET") {
      return new Response(JSON.stringify([]), { status: 200, headers: { "Content-Type": "application/json" } });
    }
    if (url.includes("/rest/v1/partners") && method === "GET") {
      return new Response(
        JSON.stringify([{ id: "partner-1", name: "Partner BV", email: "partner@example.com", contact_email: "partner@example.com" }]),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }
    if (url.includes("/storage/v1/object/commission-invoices/") && method === "POST") {
      return new Response(JSON.stringify({ Key: "path" }), { status: 200, headers: { "Content-Type": "application/json" } });
    }
    if (url.includes("/rest/v1/email_log") && method === "GET") {
      if (options.duplicateIdempotency && url.includes("idempotency_key=eq.commission-invoice-inv-1-partner")) {
        return new Response(
          JSON.stringify([{ mailjet_message_id: "existing-comm-123", sent_at: new Date().toISOString() }]),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      return new Response(JSON.stringify([]), { status: 200, headers: { "Content-Type": "application/json" } });
    }
    if (url === "https://api.mailjet.com/v3.1/send" && method === "POST") {
      return new Response(
        JSON.stringify({ Messages: [{ Status: "success", To: [{ Email: "partner@example.com", MessageID: 98765 }] }] }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }
    if (url.includes("/rest/v1/email_log") && method === "POST") {
      return new Response(JSON.stringify({}), { status: 200, headers: { "Content-Type": "application/json" } });
    }
    if (url.includes("/rest/v1/commission_invoices") && method === "PATCH") {
      return new Response(JSON.stringify({}), { status: 200, headers: { "Content-Type": "application/json" } });
    }
    return new Response(JSON.stringify({ error: "unexpected fetch", url, method }), { status: 500 });
  };
}

Deno.test({
  name: "send-commission-invoice-to-partner: 401 zonder auth",
  sanitizeOps: false,
  sanitizeResources: false,
}, async () => {
  const res = await handler(createRequest({}));
  assertEquals(res.status, 401);
});

Deno.test({
  name: "send-commission-invoice-to-partner: 400 bij ontbrekende velden",
  sanitizeOps: false,
  sanitizeResources: false,
}, async () => {
  const original = globalThis.fetch;
  globalThis.fetch = makeFetch();
  try {
    const res = await handler(createRequest({ commissionInvoiceId: "inv-1" }, { auth: "token" }));
    assertEquals(res.status, 400);
    const json = await res.json();
    assertStringIncludes(json.error, "Missing required fields");
  } finally {
    globalThis.fetch = original;
  }
});

Deno.test({
  name: "send-commission-invoice-to-partner: verstuurt commissiefactuur en update status",
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
        { commissionInvoiceId: "inv-1", pdfBase64: "BASE64" },
        { auth: "token" },
      ),
    );
    assertEquals(res.status, 200);
    const json = await res.json();
    assertEquals(json.success, true);
    assertEquals(json.recipient, "partner@example.com");

    const emailLog = logs.find((l) => l.url.includes("/rest/v1/email_log") && l.method === "POST");
    assertEquals((emailLog?.body as any)?.mailjet_message_id, "98765");
    assertEquals((emailLog?.body as any)?.metadata?.template_name, "commission_invoice_sent");
    assertEquals((emailLog?.body as any)?.metadata?.actor, "admin → partner");

    const update = logs.find((l) => l.url.includes("/rest/v1/commission_invoices") && l.method === "PATCH");
    assertEquals((update?.body as any)?.status, "sent");
  } finally {
    globalThis.fetch = original;
  }
});

Deno.test({
  name: "send-commission-invoice-to-partner: idempotency duplicate voorkomt herhaalde send",
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
        { commissionInvoiceId: "inv-1", pdfBase64: "BASE64" },
        { auth: "token" },
      ),
    );
    assertEquals(res.status, 200);
    const json = await res.json();
    assertEquals(json.deduped, true);
    assertEquals(json.mailjetMessageId, "existing-comm-123");
    assertEquals(mailjetCalls, 0);
  } finally {
    globalThis.fetch = original;
  }
});
