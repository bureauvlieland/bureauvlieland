import { assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { handler } from "./index.ts";

Deno.env.set("SUPABASE_URL", "http://test-supabase.local");
Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "test-key");
Deno.env.set("MAILJET_API_KEY", "mj-key");
Deno.env.set("MAILJET_SECRET_KEY", "mj-secret");

const STORED_PDF_PATH = "partner-1/BVC-2607-0001.pdf";
const STORED_PDF_BYTES = new TextEncoder().encode("%PDF-opgeslagen");

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

interface FetchOptions {
  duplicateIdempotency?: boolean;
  /** Status van de factuur in de database (standaard: definitief). */
  status?: string;
  /** Opgeslagen PDF-pad; null = geen PDF in de opslag. */
  pdfPath?: string | null;
}

function makeFetch(options: FetchOptions = {}) {
  const status = options.status ?? "final";
  const pdfPath = options.pdfPath === undefined ? STORED_PDF_PATH : options.pdfPath;
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
            invoice_number: "BVC-2607-0001",
            invoice_date: "2026-07-01",
            partner_id: "partner-1",
            amount_excl_vat: 100,
            vat_amount: 21,
            amount_incl_vat: 121,
            vat_rate: 21,
            recipient_email: "partner@example.com",
            recipient_name: "Partner BV",
            status,
            pdf_path: pdfPath,
          },
        ]),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
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
    if (url.includes(`/storage/v1/object/commission-invoices/${STORED_PDF_PATH}`) && method === "GET") {
      return new Response(STORED_PDF_BYTES, { status: 200, headers: { "Content-Type": "application/pdf" } });
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

/** Logt elke fetch (url, method, body) en delegeert naar makeFetch. */
function makeLoggingFetch(options: FetchOptions = {}) {
  const logs: { url: string; method: string; body?: unknown }[] = [];
  const base = makeFetch(options);
  const fetchFn = async (input: RequestInfo | URL, init?: RequestInit) => {
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
    return base(input, init);
  };
  return { fetchFn, logs };
}

const testOptions = { sanitizeOps: false, sanitizeResources: false };

Deno.test({
  name: "send-commission-invoice-to-partner: 401 zonder auth",
  ...testOptions,
}, async () => {
  const res = await handler(createRequest({}));
  assertEquals(res.status, 401);
});

Deno.test({
  name: "send-commission-invoice-to-partner: 400 zonder factuur-id",
  ...testOptions,
}, async () => {
  const original = globalThis.fetch;
  globalThis.fetch = makeFetch();
  try {
    const res = await handler(createRequest({ pdfBase64: "BASE64" }, { auth: "token" }));
    assertEquals(res.status, 400);
    const json = await res.json();
    assertStringIncludes(json.error, "Missing required fields");
  } finally {
    globalThis.fetch = original;
  }
});

Deno.test({
  name: "send-commission-invoice-to-partner: een concept kan niet worden verstuurd (409)",
  ...testOptions,
}, async () => {
  const original = globalThis.fetch;
  globalThis.fetch = makeFetch({ status: "draft", pdfPath: null });
  try {
    const res = await handler(
      createRequest({ commissionInvoiceId: "inv-1", pdfBase64: "BASE64" }, { auth: "token" }),
    );
    assertEquals(res.status, 409);
    const json = await res.json();
    assertStringIncludes(json.error, "draft");
  } finally {
    globalThis.fetch = original;
  }
});

Deno.test({
  name: "send-commission-invoice-to-partner: betaalde factuur kan niet opnieuw (409)",
  ...testOptions,
}, async () => {
  const original = globalThis.fetch;
  globalThis.fetch = makeFetch({ status: "paid" });
  try {
    const res = await handler(createRequest({ commissionInvoiceId: "inv-1" }, { auth: "token" }));
    assertEquals(res.status, 409);
  } finally {
    globalThis.fetch = original;
  }
});

Deno.test({
  name: "send-commission-invoice-to-partner: verstuurt met meegestuurde PDF, slaat hem op en zet status op sent",
  ...testOptions,
}, async () => {
  const original = globalThis.fetch;
  const { fetchFn, logs } = makeLoggingFetch();
  globalThis.fetch = fetchFn;
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
    assertEquals(json.pdfPath, "partner-1/BVC-2607-0001.pdf");

    const upload = logs.find((l) => l.url.includes("/storage/v1/object/commission-invoices/") && l.method === "POST");
    assertEquals(!!upload, true);

    const mailjet = logs.find((l) => l.url === "https://api.mailjet.com/v3.1/send");
    // deno-lint-ignore no-explicit-any
    const attachment = (mailjet?.body as any)?.Messages?.[0]?.Attachments?.[0];
    assertEquals(attachment?.Base64Content, "BASE64");
    assertEquals(attachment?.Filename, "Commissiefactuur-BVC-2607-0001.pdf");

    const emailLog = logs.find((l) => l.url.includes("/rest/v1/email_log") && l.method === "POST");
    // deno-lint-ignore no-explicit-any
    assertEquals((emailLog?.body as any)?.mailjet_message_id, "98765");
    // deno-lint-ignore no-explicit-any
    assertEquals((emailLog?.body as any)?.metadata?.template_name, "commission_invoice_sent");
    // deno-lint-ignore no-explicit-any
    assertEquals((emailLog?.body as any)?.metadata?.actor, "admin → partner");

    const update = logs.find((l) => l.url.includes("/rest/v1/commission_invoices") && l.method === "PATCH");
    // deno-lint-ignore no-explicit-any
    assertEquals((update?.body as any)?.status, "sent");
    // deno-lint-ignore no-explicit-any
    assertEquals((update?.body as any)?.pdf_path, "partner-1/BVC-2607-0001.pdf");

    // De bronnen zijn al bij "Definitief maken" gemarkeerd: hier geen updates meer.
    const sourceUpdates = logs.filter(
      (l) => l.method === "PATCH" && /program_request_items|accommodation_quotes|partner_purchase_invoices/.test(l.url),
    );
    assertEquals(sourceUpdates.length, 0);
  } finally {
    globalThis.fetch = original;
  }
});

Deno.test({
  name: "send-commission-invoice-to-partner: zonder meegestuurde PDF gaat de opgeslagen PDF mee",
  ...testOptions,
}, async () => {
  const original = globalThis.fetch;
  const { fetchFn, logs } = makeLoggingFetch();
  globalThis.fetch = fetchFn;
  try {
    const res = await handler(createRequest({ commissionInvoiceId: "inv-1" }, { auth: "token" }));
    assertEquals(res.status, 200);

    const download = logs.find(
      (l) => l.url.includes(`/storage/v1/object/commission-invoices/${STORED_PDF_PATH}`) && l.method === "GET",
    );
    assertEquals(!!download, true);
    const upload = logs.find((l) => l.url.includes("/storage/v1/object/commission-invoices/") && l.method === "POST");
    assertEquals(upload, undefined);

    const mailjet = logs.find((l) => l.url === "https://api.mailjet.com/v3.1/send");
    // deno-lint-ignore no-explicit-any
    const attachment = (mailjet?.body as any)?.Messages?.[0]?.Attachments?.[0];
    assertEquals(attachment?.Base64Content, btoa(String.fromCharCode(...STORED_PDF_BYTES)));
  } finally {
    globalThis.fetch = original;
  }
});

Deno.test({
  name: "send-commission-invoice-to-partner: zonder PDF in de opslag en zonder bijlage → 400",
  ...testOptions,
}, async () => {
  const original = globalThis.fetch;
  globalThis.fetch = makeFetch({ pdfPath: null });
  try {
    const res = await handler(createRequest({ commissionInvoiceId: "inv-1" }, { auth: "token" }));
    assertEquals(res.status, 400);
    const json = await res.json();
    assertStringIncludes(json.error, "Geen PDF");
  } finally {
    globalThis.fetch = original;
  }
});

Deno.test({
  name: "send-commission-invoice-to-partner: opnieuw versturen houdt de verzenddatum",
  ...testOptions,
}, async () => {
  const original = globalThis.fetch;
  const { fetchFn, logs } = makeLoggingFetch({ status: "sent" });
  globalThis.fetch = fetchFn;
  try {
    const res = await handler(createRequest({ commissionInvoiceId: "inv-1" }, { auth: "token" }));
    assertEquals(res.status, 200);
    const update = logs.find((l) => l.url.includes("/rest/v1/commission_invoices") && l.method === "PATCH");
    // deno-lint-ignore no-explicit-any
    const body = update?.body as any;
    assertEquals(body?.status, undefined);
    assertEquals(body?.sent_at, undefined);
    assertEquals(body?.pdf_path, STORED_PDF_PATH);
  } finally {
    globalThis.fetch = original;
  }
});

Deno.test({
  name: "send-commission-invoice-to-partner: idempotency duplicate voorkomt herhaalde send",
  ...testOptions,
}, async () => {
  const original = globalThis.fetch;
  let mailjetCalls = 0;
  const base = makeFetch({ duplicateIdempotency: true });
  globalThis.fetch = async (input, init) => {
    const url = input.toString();
    if (url === "https://api.mailjet.com/v3.1/send") mailjetCalls++;
    return base(input, init);
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
