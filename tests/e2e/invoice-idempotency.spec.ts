import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

/**
 * E2E: bureau-factuur naar klant — idempotency.
 *
 * Bewijst dat een tweede aanroep met dezelfde invoiceNumber+recipient BINNEN
 * het idempotency-venster (10 min) niet nogmaals via Mailjet verstuurt, maar
 * de eerder gelogde mailjet_message_id retourneert met `deduped: true`.
 *
 * Vereisten:
 *   VITE_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   CI_FIXTURE_SECRET   (voor mint-ci-admin-jwt)
 *
 * Zonder deze secrets wordt de test overgeslagen — Lovable Cloud CI heeft de
 * service-role-key niet, dus dit draait lokaal of in eigen CI.
 */

const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const CI_SECRET = process.env.CI_FIXTURE_SECRET!;

test.skip(
  !SUPABASE_URL || !SERVICE_ROLE || !CI_SECRET,
  "VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY en CI_FIXTURE_SECRET nodig",
);

const fnUrl = (name: string) => `${SUPABASE_URL}/functions/v1/${name}`;

test("bureau-invoice: tweede send met zelfde idempotency-key wordt gededupliceerd", async ({ request }) => {
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { persistSession: false },
  });

  // 1. Mint admin JWT via bestaande CI-helper.
  const jwtRes = await request.post(fnUrl("mint-ci-admin-jwt"), {
    headers: { "x-ci-secret": CI_SECRET, "Content-Type": "application/json" },
    data: {},
  });
  expect(jwtRes.status(), await jwtRes.text()).toBe(200);
  const { access_token: adminJwt } = (await jwtRes.json()) as { access_token: string };
  expect(adminJwt).toBeTruthy();

  // 2. Seed een minimal program_requests rij.
  const stamp = Date.now();
  const email = `e2e-idem+${stamp}@bureauvlieland.nl`;
  const invoiceNumber = `FV-E2E-${stamp}`;
  const { data: req, error: reqErr } = await admin
    .from("program_requests")
    .insert({
      customer_name: "E2E Idempotency",
      customer_email: email,
      reference_number: `BV-E2E-${stamp}`,
      status: "new",
    })
    .select("id")
    .single();
  expect(reqErr, reqErr?.message).toBeNull();
  const requestId = req!.id as string;

  // 3. Pre-seed een email_log rij met exact de idempotency-key die de
  //    functie zal berekenen. `finalRecipient` valt terug op customer_email.
  const idempotencyKey = `bureau-invoice-${invoiceNumber}-${email}`;
  const preloadMessageId = `preseed-${stamp}`;
  const { error: logErr } = await admin.from("email_log").insert({
    email_type: "bureau_invoice_to_customer",
    recipient_email: email,
    recipient_name: "E2E Idempotency",
    subject: `Factuur ${invoiceNumber}`,
    status: "sent",
    sent_by: "e2e-test",
    related_request_id: requestId,
    mailjet_message_id: preloadMessageId,
    idempotency_key: idempotencyKey,
    sent_at: new Date().toISOString(),
    metadata: {
      template_name: "bureau_invoice_to_customer",
      actor: "e2e-preseed",
    },
  });
  expect(logErr, logErr?.message).toBeNull();

  // 4. Roep send-bureau-invoice-to-customer aan met dezelfde parameters.
  //    Mailjet mag NIET aangesproken worden — de idempotency-check kort af.
  const sendRes = await request.post(fnUrl("send-bureau-invoice-to-customer"), {
    headers: {
      Authorization: `Bearer ${adminJwt}`,
      "Content-Type": "application/json",
    },
    data: {
      requestId,
      pdfBase64: "JVBERi0xLjQK", // "%PDF-1.4\n" — geen echte inhoud nodig
      pdfFilename: `factuur-${invoiceNumber}.pdf`,
      invoiceNumber,
      invoiceDate: "2026-07-01",
      amountInclVat: 1210,
    },
  });
  expect(sendRes.status(), await sendRes.text()).toBe(200);
  const payload = (await sendRes.json()) as {
    success: boolean;
    deduped?: boolean;
    mailjetMessageId?: string | null;
  };
  expect(payload.success).toBe(true);
  expect(payload.deduped).toBe(true);
  expect(payload.mailjetMessageId).toBe(preloadMessageId);

  // 5. Verifieer dat er nog steeds precies één email_log-rij bestaat voor
  //    deze idempotency-key — de dedup mag geen tweede rij hebben aangemaakt.
  const { data: logRows, error: fetchErr } = await admin
    .from("email_log")
    .select("id, mailjet_message_id, status")
    .eq("idempotency_key", idempotencyKey);
  expect(fetchErr, fetchErr?.message).toBeNull();
  expect(logRows).toHaveLength(1);
  expect(logRows![0].mailjet_message_id).toBe(preloadMessageId);

  // Cleanup
  await admin.from("email_log").delete().eq("idempotency_key", idempotencyKey);
  await admin.from("program_requests").delete().eq("id", requestId);
});
