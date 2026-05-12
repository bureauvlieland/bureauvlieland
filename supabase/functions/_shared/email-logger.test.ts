import {
  assertEquals,
  assertRejects,
  assertStringIncludes,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import { EmailLogValidationError, logEmail } from "./email-logger.ts";

// Stub Supabase env so logEmail's DB insert is harmless if validation passes.
Deno.env.set("SUPABASE_URL", "http://localhost:54321");
Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "stub");

const baseEntry = {
  email_type: "test_email",
  subject: "Test subject",
  recipient_email: "test@example.com",
  status: "sent" as const,
  sent_by: "unit-test",
};

Deno.test("logEmail rejects when metadata.template_name ontbreekt", async () => {
  const err = await assertRejects(
    () =>
      logEmail({
        ...baseEntry,
        // deno-lint-ignore no-explicit-any
        metadata: { actor: "system" } as any,
      }),
    EmailLogValidationError,
  );
  assertStringIncludes(err.message, "metadata.template_name is required");
});

Deno.test("logEmail rejects when metadata.actor ontbreekt", async () => {
  const err = await assertRejects(
    () =>
      logEmail({
        ...baseEntry,
        // deno-lint-ignore no-explicit-any
        metadata: { template_name: "test_template" } as any,
      }),
    EmailLogValidationError,
  );
  assertStringIncludes(err.message, "metadata.actor is required");
});

Deno.test("logEmail rejects als beide velden ontbreken (rapporteert beide)", async () => {
  const err = await assertRejects(
    () =>
      logEmail({
        ...baseEntry,
        // deno-lint-ignore no-explicit-any
        metadata: {} as any,
      }),
    EmailLogValidationError,
  );
  assertStringIncludes(err.message, "metadata.template_name is required");
  assertStringIncludes(err.message, "metadata.actor is required");
});

Deno.test("logEmail rejects bij lege string voor template_name", async () => {
  await assertRejects(
    () =>
      logEmail({
        ...baseEntry,
        metadata: { template_name: "   ", actor: "system" },
      }),
    EmailLogValidationError,
    "metadata.template_name is required",
  );
});

Deno.test("logEmail rejects bij lege string voor actor", async () => {
  await assertRejects(
    () =>
      logEmail({
        ...baseEntry,
        metadata: { template_name: "test_template", actor: "" },
      }),
    EmailLogValidationError,
    "metadata.actor is required",
  );
});

Deno.test("logEmail rejects bij niet-string template_name", async () => {
  await assertRejects(
    () =>
      logEmail({
        ...baseEntry,
        // deno-lint-ignore no-explicit-any
        metadata: { template_name: 123, actor: "system" } as any,
      }),
    EmailLogValidationError,
    "metadata.template_name is required",
  );
});

Deno.test("EmailLogValidationError bevat email_type en recipient in message", async () => {
  const err = await assertRejects(
    () =>
      logEmail({
        ...baseEntry,
        email_type: "partner_invitation",
        recipient_email: "partner@example.com",
        // deno-lint-ignore no-explicit-any
        metadata: {} as any,
      }),
    EmailLogValidationError,
  );
  assertStringIncludes(err.message, "partner_invitation");
  assertStringIncludes(err.message, "partner@example.com");
});

Deno.test("logEmail accepteert geldige metadata zonder te throwen", async () => {
  // Validation passes; insert may fail tegen stub-URL, maar dat wordt
  // intern gevangen — logEmail mag in geen geval een error gooien.
  let threw = false;
  try {
    await logEmail({
      ...baseEntry,
      metadata: {
        template_name: "test_template",
        actor: "system → test",
        extra: "context",
      },
    });
  } catch {
    threw = true;
  }
  assertEquals(threw, false);
});
