import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

/**
 * E2E: mailjet-event-webhook — auth, statusverwerking en auto-suppress.
 *
 * Vereisten:
 *   VITE_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   MAILJET_WEBHOOK_TOKEN   (moet gelijk zijn aan de secret in de functie)
 *
 * De webhook faalt closed als het token op de server niet gezet is; deze test
 * gebruikt hetzelfde token om een gecontroleerd event te posten.
 */

const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const WEBHOOK_TOKEN = process.env.MAILJET_WEBHOOK_TOKEN!;

test.skip(
  !SUPABASE_URL || !SERVICE_ROLE || !WEBHOOK_TOKEN,
  "VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY en MAILJET_WEBHOOK_TOKEN nodig",
);

const url = `${SUPABASE_URL}/functions/v1/mailjet-event-webhook`;

test("mailjet-webhook: zonder token geeft 401", async ({ request }) => {
  const res = await request.post(url, {
    headers: { "Content-Type": "application/json" },
    data: { event: "sent", MessageID: 1 },
  });
  expect(res.status()).toBe(401);
});

test("mailjet-webhook: hard bounce update email_log en zet suppression", async ({ request }) => {
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { persistSession: false },
  });

  const stamp = Date.now();
  const email = `e2e-bounce+${stamp}@bureauvlieland.nl`;
  const messageId = `mj-e2e-${stamp}`;

  // Seed een 'sent' email_log-rij die de webhook kan matchen.
  const { data: log, error: logErr } = await admin
    .from("email_log")
    .insert({
      email_type: "e2e_test",
      recipient_email: email,
      subject: "E2E bounce test",
      status: "sent",
      sent_by: "e2e-test",
      mailjet_message_id: messageId,
      sent_at: new Date().toISOString(),
      metadata: { template_name: "e2e_test", actor: "e2e" },
    })
    .select("id")
    .single();
  expect(logErr, logErr?.message).toBeNull();
  const logId = log!.id as string;

  // Post een hard-bounce event.
  const res = await request.post(`${url}?token=${encodeURIComponent(WEBHOOK_TOKEN)}`, {
    headers: { "Content-Type": "application/json" },
    data: [
      {
        event: "bounce",
        time: Math.floor(Date.now() / 1000),
        MessageID: messageId,
        email,
        error: "user unknown",
        hard_bounce: true,
      },
    ],
  });
  expect(res.status(), await res.text()).toBe(200);
  const body = (await res.json()) as { processed: number; unmatched: number };
  expect(body.processed).toBeGreaterThanOrEqual(1);
  expect(body.unmatched).toBe(0);

  // email_log moet nu status=bounced hebben.
  const { data: updated } = await admin
    .from("email_log")
    .select("status, bounced_at, error_message")
    .eq("id", logId)
    .single();
  expect(updated?.status).toBe("bounced");
  expect(updated?.bounced_at).toBeTruthy();
  expect(updated?.error_message).toContain("user unknown");

  // email_suppressions moet een 'bounce' entry hebben voor dit adres.
  const { data: supp } = await admin
    .from("email_suppressions")
    .select("reason, source")
    .ilike("email", email);
  expect(supp?.length ?? 0).toBeGreaterThanOrEqual(1);
  expect(supp![0].reason).toBe("bounce");
  expect(supp![0].source).toBe("mailjet-webhook");

  // Cleanup
  await admin.from("email_suppressions").delete().ilike("email", email);
  await admin.from("email_log").delete().eq("id", logId);
});
