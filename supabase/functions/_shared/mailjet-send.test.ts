import {
  assertEquals,
  assertStringIncludes,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  extractMessageIds,
  sendMailjet,
  checkEmailSuppressed,
  findRecentIdempotentSend,
} from "./mailjet-send.ts";

Deno.env.set("SUPABASE_URL", "http://test-supabase.local");
Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "test-key");

function withFetchStub(stub: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>, fn: () => Promise<void>) {
  const original = globalThis.fetch;
  globalThis.fetch = stub;
  return fn().finally(() => {
    globalThis.fetch = original;
  });
}

Deno.test("extractMessageIds haalt MessageID's op uit Mailjet-response", () => {
  const raw = {
    Messages: [
      {
        Status: "success",
        To: [
          { Email: "a@example.com", MessageID: 123456789 },
          { Email: "b@example.com", MessageID: "987654321" },
        ],
      },
    ],
  };
  assertEquals(extractMessageIds(raw), ["123456789", "987654321"]);
});

Deno.test("extractMessageIds geeft lege array bij ongeldige response", () => {
  assertEquals(extractMessageIds(null), []);
  assertEquals(extractMessageIds({}), []);
  assertEquals(extractMessageIds({ Messages: "nope" }), []);
  assertEquals(extractMessageIds({ Messages: [{ To: [] }] }), []);
});

Deno.test("sendMailjet faalt wanneer credentials ontbreken", async () => {
  Deno.env.delete("MAILJET_API_KEY");
  Deno.env.delete("MAILJET_SECRET_KEY");
  Deno.env.delete("MAILJET_TEST_MODE");
  const result = await sendMailjet({ messages: [] });
  assertEquals(result.ok, false);
  assertStringIncludes((result as { error: string }).error, "credentials not configured");
});

Deno.test("sendMailjet test mode geeft fake MessageID terug", async () => {
  Deno.env.set("MAILJET_TEST_MODE", "1");
  const result = await sendMailjet({
    messages: [{ From: { Email: "x@bureauvlieland.nl" }, To: [{ Email: "a@example.com" }], Subject: "T" }],
  });
  assertEquals(result.ok, true);
  const r = result as { ok: true; messageId: string; skipped: string };
  assertEquals(r.skipped, "test_mode");
  assertEquals(typeof r.messageId, "string");
  assertStringIncludes(r.messageId, "test-");
});

Deno.test({
  name: "sendMailjet verstuurt echt en extraheert MessageID",
  sanitizeOps: false,
  sanitizeResources: false,
}, async () => {
  Deno.env.delete("MAILJET_TEST_MODE");
  Deno.env.set("MAILJET_API_KEY", "key");
  Deno.env.set("MAILJET_SECRET_KEY", "secret");

  await withFetchStub(
    async (input) => {
      const url = input.toString();
      if (url.startsWith("http://test-supabase.local")) {
        return new Response(JSON.stringify([]), { status: 200 });
      }
      return new Response(
        JSON.stringify({
          Messages: [{ Status: "success", To: [{ Email: "a@example.com", MessageID: 777 }] }],
        }),
        { status: 200 },
      );
    },
    async () => {
      const result = await sendMailjet({
        messages: [{ From: { Email: "x@bureauvlieland.nl" }, To: [{ Email: "a@example.com" }], Subject: "T" }],
        checkSuppression: false,
      });
      assertEquals(result.ok, true);
      const r = result as { ok: true; messageId: string; messageIds: string[] };
      assertEquals(r.messageId, "777");
      assertEquals(r.messageIds, ["777"]);
    },
  );
});

Deno.test({
  name: "sendMailjet blokkeert bij suppression",
  sanitizeOps: false,
  sanitizeResources: false,
}, async () => {
  Deno.env.set("MAILJET_API_KEY", "key");
  Deno.env.set("MAILJET_SECRET_KEY", "secret");

  await withFetchStub(
    async (input) => {
      const url = input.toString();
      if (url.includes("/email_suppressions")) {
        return new Response(JSON.stringify({ reason: "bounce", source: "mailjet" }), { status: 200 });
      }
      return new Response("{}", { status: 200 });
    },
    async () => {
      const result = await sendMailjet({
        messages: [{ From: { Email: "x@bureauvlieland.nl" }, To: [{ Email: "bounce@example.com" }], Subject: "T" }],
      });
      assertEquals(result.ok, true);
      const r = result as { ok: true; skipped: string; suppressedRecipient?: { email: string; reason: string } };
      assertEquals(r.skipped, "suppressed");
      assertEquals(r.suppressedRecipient?.email, "bounce@example.com");
      assertEquals(r.suppressedRecipient?.reason, "bounce");
    },
  );
});

Deno.test({
  name: "sendMailjet slaat over bij idempotency duplicate",
  sanitizeOps: false,
  sanitizeResources: false,
}, async () => {
  Deno.env.set("MAILJET_API_KEY", "key");
  Deno.env.set("MAILJET_SECRET_KEY", "secret");

  await withFetchStub(
    async (input) => {
      const url = input.toString();
      if (url.includes("/email_log")) {
        return new Response(
          JSON.stringify({ mailjet_message_id: "existing-id-123", sent_at: new Date().toISOString() }),
          { status: 200 },
        );
      }
      return new Response("{}", { status: 200 });
    },
    async () => {
      const result = await sendMailjet({
        messages: [{ From: { Email: "x@bureauvlieland.nl" }, To: [{ Email: "a@example.com" }], Subject: "T" }],
        idempotencyKey: "invoice-123",
        checkSuppression: false,
      });
      assertEquals(result.ok, true);
      const r = result as { ok: true; skipped: string; messageId: string };
      assertEquals(r.skipped, "duplicate");
      assertEquals(r.messageId, "existing-id-123");
    },
  );
});

Deno.test({
  name: "checkEmailSuppressed detecteert suppressed adres",
  sanitizeOps: false,
  sanitizeResources: false,
}, async () => {
  await withFetchStub(
    async () => new Response(JSON.stringify({ reason: "unsub", source: "manual" }), { status: 200 }),
    async () => {
      const result = await checkEmailSuppressed("unsub@example.com");
      assertEquals(result, { reason: "unsub", source: "manual" });
    },
  );
});

Deno.test({
  name: "checkEmailSuppressed fail-open bij DB-fout",
  sanitizeOps: false,
  sanitizeResources: false,
}, async () => {
  await withFetchStub(
    async () => new Response("{}", { status: 500 }),
    async () => {
      const result = await checkEmailSuppressed("x@example.com");
      assertEquals(result, null);
    },
  );
});

Deno.test({
  name: "findRecentIdempotentSend vindt recente send",
  sanitizeOps: false,
  sanitizeResources: false,
}, async () => {
  await withFetchStub(
    async () =>
      new Response(
        JSON.stringify({ mailjet_message_id: "id-abc", sent_at: new Date().toISOString() }),
        { status: 200 },
      ),
    async () => {
      const result = await findRecentIdempotentSend("key-1", 10);
      assertEquals(result?.mailjetMessageId, "id-abc");
    },
  );
});

Deno.test({
  name: "findRecentIdempotentSend fail-open bij DB-fout",
  sanitizeOps: false,
  sanitizeResources: false,
}, async () => {
  await withFetchStub(
    async () => new Response("boom", { status: 500 }),
    async () => {
      const result = await findRecentIdempotentSend("key-1", 10);
      assertEquals(result, null);
    },
  );
});
