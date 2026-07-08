import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

/**
 * E2E: inbound-purchase-invoice — Mailjet Parse-webhook.
 *
 * Verifieert dat een inbound mail zonder PDF-bijlage netjes wordt gelogd als
 * `scan_status='failed'` in `purchase_invoice_inbox`, zodat admin een
 * duidelijke foutmelding ziet in plaats van een silent drop.
 *
 * Vereisten:
 *   VITE_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY!;

test.skip(
  !SUPABASE_URL || !SERVICE_ROLE,
  "VITE_SUPABASE_URL en SUPABASE_SERVICE_ROLE_KEY nodig",
);

const url = `${SUPABASE_URL}/functions/v1/inbound-purchase-invoice`;

test("inbound-purchase-invoice: mail zonder PDF-bijlage komt in inbox met scan_status=failed", async ({ request }) => {
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { persistSession: false },
  });

  const stamp = Date.now();
  const fromEmail = `e2e-inbound+${stamp}@leverancier.test`;
  const subject = `E2E factuur ${stamp}`;

  const res = await request.post(url, {
    headers: { "Content-Type": "application/json" },
    data: {
      From: `"Test Leverancier" <${fromEmail}>`,
      Subject: subject,
      "Text-part": "Zie factuur in bijlage",
      // Geen Attachment* keys — moet leiden tot scan_status=failed.
    },
  });
  expect(res.status(), await res.text()).toBe(200);
  const body = (await res.json()) as { status: string; reason?: string };
  expect(body.status).toBe("ok");
  expect(body.reason).toBe("no_pdf_attachment");

  // Verifieer inbox-rij.
  const { data: rows, error } = await admin
    .from("purchase_invoice_inbox")
    .select("id, scan_status, scan_error, subject")
    .eq("from_email", fromEmail)
    .eq("subject", subject);
  expect(error, error?.message).toBeNull();
  expect(rows).toHaveLength(1);
  expect(rows![0].scan_status).toBe("failed");
  expect(rows![0].scan_error).toContain("Geen PDF-bijlage");

  // Cleanup
  await admin.from("purchase_invoice_inbox").delete().eq("id", rows![0].id);
});

test("inbound-purchase-invoice: OPTIONS geeft CORS-headers", async ({ request }) => {
  const res = await request.fetch(url, { method: "OPTIONS" });
  expect(res.status()).toBe(200);
  expect(res.headers()["access-control-allow-origin"]).toBe("*");
});
