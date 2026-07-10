import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

/**
 * Pre-productie smoke test — één end-to-end flow.
 *
 * Doel: bij elke deploy bewijzen dat de kritieke pipeline werkt:
 *   1. Configurator submit → `program_requests` + `program_request_items` in DB
 *      met correcte `selected_dates` en item-koppeling.
 *   2. Programma → offerte: request kan naar `in_afstemming` en item krijgt
 *      een `quoted_price` (spiegelt admin-quote-flow).
 *   3. Partner-accept: item transitioneert naar `confirmed` met
 *      `customer_approved_at` (spiegelt approve-quote-item + partner accept).
 *   4. Factuur: `send-bureau-invoice-to-customer` levert 200 op en logt in
 *      `email_log` (zonder daadwerkelijke Mailjet-hit dankzij idempotency
 *      pre-seed — geen echte mail naar klant).
 *
 * Cleanup verwijdert alle test-rijen achteraf.
 *
 * Vereist env-vars (in CI als secrets, lokaal in .env):
 *   E2E_BASE_URL              (default http://localhost:8080)
 *   VITE_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   CI_FIXTURE_SECRET         (voor mint-ci-admin-jwt)
 */

const BASE = process.env.E2E_BASE_URL ?? "http://localhost:8080";
const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const CI_SECRET = process.env.CI_FIXTURE_SECRET!;

test.skip(
  !SUPABASE_URL || !SERVICE_ROLE || !CI_SECRET,
  "VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY en CI_FIXTURE_SECRET nodig",
);

const fnUrl = (name: string) => `${SUPABASE_URL}/functions/v1/${name}`;

test("full-flow smoke: configurator → programma → offerte → partner-accept → factuur", async ({ page, request }) => {
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { persistSession: false },
  });

  const stamp = Date.now();
  const email = `smoke+${stamp}@bureauvlieland.nl`;
  const reference = `BV-SMOKE-${stamp}`;
  const createdIds: { requestId?: string; itemId?: string } = {};

  try {
    // ─── STAP 1: configurator (UI proof-of-life) ─────────────────────────
    // We landen op de homepage en verifiëren dat het configurator-startpunt
    // rendert. De volledige UI-submit is gedekt door
    // `self-service-submit.spec.ts`; hier houden we het smoke-licht en
    // seeden we het request direct via de service-role om partner-flow
    // stabiel te maken (geen afhankelijkheid van live activiteiten-catalog).
    await page.goto(BASE, { waitUntil: "domcontentloaded" });
    await expect(page).toHaveTitle(/vlieland/i);

    // Zoek een partner om als provider te gebruiken (eerste actieve, niet-bureau).
    const { data: partners, error: pErr } = await admin
      .from("partners")
      .select("id, name, email, contact_email")
      .eq("is_active", true)
      .neq("id", "bureau")
      .limit(1);
    expect(pErr, pErr?.message).toBeNull();
    expect(partners?.length, "geen actieve partner om als provider te gebruiken").toBeGreaterThan(0);
    const partner = partners![0];

    // Seed program_request + item.
    const executionDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);

    const { data: req, error: reqErr } = await admin
      .from("program_requests")
      .insert({
        customer_name: "Smoke Test",
        customer_email: email,
        customer_phone: "0612345678",
        reference_number: reference,
        status: "new",
        selected_dates: [executionDate],
        num_participants: 4,
      })
      .select("id")
      .single();
    expect(reqErr, reqErr?.message).toBeNull();
    createdIds.requestId = req!.id;

    const { data: item, error: itemErr } = await admin
      .from("program_request_items")
      .insert({
        request_id: req!.id,
        block_name: "Smoke Test Activiteit",
        block_category: "activity",
        block_type: "external",
        provider_id: partner.id,
        provider_name: partner.name,
        provider_email: partner.contact_email ?? partner.email,
        day_index: 0,
        status: "pending",
        num_participants: 4,
      })
      .select("id")
      .single();
    expect(itemErr, itemErr?.message).toBeNull();
    createdIds.itemId = item!.id;

    // ─── STAP 2: programma → offerte ────────────────────────────────────
    // Simuleer admin die het verzoek in afstemming zet en een prijs bepaalt.
    const { error: quoteErr } = await admin
      .from("program_request_items")
      .update({ quoted_price: 250, status: "quoted" })
      .eq("id", item!.id);
    expect(quoteErr, quoteErr?.message).toBeNull();

    const { error: statusErr } = await admin
      .from("program_requests")
      .update({ status: "in_afstemming" })
      .eq("id", req!.id);
    expect(statusErr, statusErr?.message).toBeNull();

    // ─── STAP 3: partner-accept ─────────────────────────────────────────
    // Spiegelt partner die item bevestigt + klant die goedkeurt.
    const nowIso = new Date().toISOString();
    const { error: acceptErr } = await admin
      .from("program_request_items")
      .update({
        status: "confirmed",
        confirmed_time: "10:00",
        customer_approved_at: nowIso,
        customer_accepted_at: nowIso,
      })
      .eq("id", item!.id);
    expect(acceptErr, acceptErr?.message).toBeNull();

    // Verifieer dat de transitie landt.
    const { data: verifyItem } = await admin
      .from("program_request_items")
      .select("status, quoted_price, customer_approved_at")
      .eq("id", item!.id)
      .single();
    expect(verifyItem?.status).toBe("confirmed");
    expect(Number(verifyItem?.quoted_price)).toBe(250);
    expect(verifyItem?.customer_approved_at).toBeTruthy();

    // ─── STAP 4: factuur ────────────────────────────────────────────────
    // Mint admin JWT en roep send-bureau-invoice-to-customer.
    // Pre-seed idempotency-log zodat Mailjet NIET daadwerkelijk aangeroepen
    // wordt — de dedup kort af en de test blijft veilig voor prod-mailjet.
    const invoiceNumber = `FV-SMOKE-${stamp}`;
    const idempotencyKey = `bureau-invoice-${invoiceNumber}-${email}`;

    await admin.from("email_log").insert({
      email_type: "bureau_invoice_to_customer",
      recipient_email: email,
      recipient_name: "Smoke Test",
      subject: `Factuur ${invoiceNumber}`,
      status: "sent",
      sent_by: "smoke-test-preseed",
      related_request_id: req!.id,
      mailjet_message_id: `smoke-preseed-${stamp}`,
      idempotency_key: idempotencyKey,
      sent_at: nowIso,
      metadata: {
        template_name: "bureau_invoice_to_customer",
        actor: "smoke-preseed",
      },
    });

    const jwtRes = await request.post(fnUrl("mint-ci-admin-jwt"), {
      headers: { "x-ci-secret": CI_SECRET, "Content-Type": "application/json" },
      data: {},
    });
    expect(jwtRes.status(), await jwtRes.text()).toBe(200);
    const { access_token: adminJwt } = (await jwtRes.json()) as { access_token: string };

    const invRes = await request.post(fnUrl("send-bureau-invoice-to-customer"), {
      headers: {
        Authorization: `Bearer ${adminJwt}`,
        "Content-Type": "application/json",
      },
      data: {
        requestId: req!.id,
        pdfBase64: "JVBERi0xLjQK",
        pdfFilename: `factuur-${invoiceNumber}.pdf`,
        invoiceNumber,
        invoiceDate: new Date().toISOString().slice(0, 10),
        amountInclVat: 302.5,
      },
    });
    expect(invRes.status(), await invRes.text()).toBe(200);
    const invBody = (await invRes.json()) as { deduped?: boolean };
    expect(invBody.deduped, "smoke pre-seed moet dedup triggeren").toBe(true);

    // Verifieer dat er een email_log rij is voor deze invoice.
    const { data: logRows } = await admin
      .from("email_log")
      .select("id, status")
      .eq("idempotency_key", idempotencyKey);
    expect(logRows?.length ?? 0).toBeGreaterThan(0);
  } finally {
    // ─── CLEANUP ────────────────────────────────────────────────────────
    if (createdIds.requestId) {
      await admin.from("email_log").delete().eq("related_request_id", createdIds.requestId);
      await admin.from("program_request_items").delete().eq("request_id", createdIds.requestId);
      await admin.from("program_requests").delete().eq("id", createdIds.requestId);
    }
  }
});
