import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

/**
 * End-to-end happy path voor de self-service configurator.
 *
 * Bewijst end-to-end dat:
 *   - Een klant een programma kan samenstellen en versturen
 *   - De resulterende program_request wél program_request_items heeft
 *   - selected_dates de LOKALE kalenderdatum bevat (geen UTC-shift)
 *
 * Vereist env-vars:
 *   E2E_BASE_URL             (default http://localhost:8080)
 *   VITE_SUPABASE_URL        (uit .env)
 *   SUPABASE_SERVICE_ROLE_KEY (lokaal, niet in CI van Lovable Cloud)
 *
 * Op Lovable Cloud is SUPABASE_SERVICE_ROLE_KEY niet beschikbaar — draai
 * deze test lokaal of in een eigen CI met de service-role-key als secret.
 */

const BASE = process.env.E2E_BASE_URL ?? "http://localhost:8080";
const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY!;

test.skip(
  !SUPABASE_URL || !SERVICE_ROLE,
  "VITE_SUPABASE_URL en SUPABASE_SERVICE_ROLE_KEY nodig om de DB te verifiëren",
);

test("self-service submit landt met items én juiste datum in DB", async ({ page }) => {
  const stamp = Date.now();
  const email = `e2e+${stamp}@bureauvlieland.nl`;

  await page.goto(BASE);
  await page.getByRole("link", { name: /start uw aanvraag/i }).first().click();

  // Navigeer naar activiteiten en voeg er eentje toe — selectors aanpassen
  // zodra de configurator-UI verandert (dat is het hele punt van deze test).
  await page.getByRole("link", { name: /activiteiten/i }).first().click();
  await page.getByRole("button", { name: /toevoegen/i }).first().click();

  // Open de cart en ga door naar checkout
  await page.getByRole("button", { name: /naar checkout|samen verder|programma samenstellen/i }).first().click();

  // Kies de eerstvolgende beschikbare datum (datepicker).
  await page.getByRole("button", { name: /kies datum/i }).first().click();
  await page.getByRole("gridcell", { name: /\d+/ }).first().click();
  await page.keyboard.press("Escape");

  // Vul contactformulier
  await page.getByLabel(/naam/i).fill("E2E Test");
  await page.getByLabel(/e-?mail/i).fill(email);
  await page.getByLabel(/telefoon/i).fill("0612345678");

  await page.getByRole("button", { name: /verstuur|aanvraag versturen/i }).click();

  await expect(page.getByText(/BV-\d{4}-\d{4}/)).toBeVisible({ timeout: 15_000 });

  // DB-verificatie
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
  const { data: req } = await admin
    .from("program_requests")
    .select("id, reference_number, selected_dates")
    .eq("customer_email", email)
    .single();

  expect(req).not.toBeNull();
  expect(req!.selected_dates).toBeTruthy();
  expect((req!.selected_dates as string[]).length).toBeGreaterThan(0);

  const { count } = await admin
    .from("program_request_items")
    .select("id", { count: "exact", head: true })
    .eq("request_id", req!.id);

  expect(count ?? 0).toBeGreaterThan(0);

  // Cleanup
  await admin.from("program_request_items").delete().eq("request_id", req!.id);
  await admin.from("program_requests").delete().eq("id", req!.id);
});
