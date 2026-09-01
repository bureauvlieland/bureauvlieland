/**
 * De suppressielijst is nooit in werking getest: hij bleef leeg omdat er
 * sinds 8 juli 2026 geen bounce-events meer binnenkwamen. Deze test
 * controleert dat een geblokkeerd adres daadwerkelijk niet wordt gemaild.
 */
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { sendMailjet } from "./mailjet-send.ts";

const baseMessage = {
  From: { Email: "noreply@bureauvlieland.nl", Name: "Bureau Vlieland" },
  To: [{ Email: "geblokkeerd@example.com" }],
  Subject: "Test",
  HTMLPart: "<p>Test</p>",
};

Deno.test("geblokkeerd adres wordt niet verstuurd", async () => {
  Deno.env.set("MAILJET_TEST_MODE", "0");
  Deno.env.set("MAILJET_API_KEY", "dummy");
  Deno.env.set("MAILJET_SECRET_KEY", "dummy");

  const originalFetch = globalThis.fetch;
  let fetchCalled = false;
  globalThis.fetch = ((..._args: unknown[]) => {
    fetchCalled = true;
    return Promise.resolve(new Response("{}", { status: 200 }));
  }) as typeof fetch;

  try {
    const result = await sendMailjet({
      source: "suppression-test",
      messages: [baseMessage],
      suppressionLookup: () => Promise.resolve({ reason: "bounce", source: "test" }),
    });

    assertEquals(result.ok, true);
    assertEquals(fetchCalled, false, "er mag geen Mailjet-call gedaan worden");
    assertEquals(result.ok === true ? result.skipped : null, "suppressed");
    assertEquals(
      result.ok === true ? result.suppressedRecipient?.reason : null,
      "bounce",
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

Deno.test("niet-geblokkeerd adres gaat wel naar Mailjet", async () => {
  Deno.env.set("MAILJET_TEST_MODE", "0");
  Deno.env.set("MAILJET_API_KEY", "dummy");
  Deno.env.set("MAILJET_SECRET_KEY", "dummy");

  const originalFetch = globalThis.fetch;
  let fetchCalled = false;
  globalThis.fetch = ((..._args: unknown[]) => {
    fetchCalled = true;
    return Promise.resolve(
      new Response(
        JSON.stringify({
          Messages: [{
            Status: "success",
            To: [{ Email: "ok@example.com", MessageID: 42, MessageUUID: "uuid" }],
          }],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
  }) as typeof fetch;

  try {
    const result = await sendMailjet({
      source: "suppression-test",
      messages: [{ ...baseMessage, To: [{ Email: "ok@example.com" }] }],
      suppressionLookup: () => Promise.resolve(null),
    });

    assertEquals(fetchCalled, true);
    assertEquals(result.ok, true);
    assertEquals(result.ok === true ? result.messageId : null, "42");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
