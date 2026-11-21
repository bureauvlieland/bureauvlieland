import { assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";

Deno.env.set("SUPABASE_URL", "http://test-supabase.local");
Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "srv");
Deno.env.set("MAILJET_API_KEY", "mj");
Deno.env.set("MAILJET_SECRET_KEY", "mj");

const { handler, markdownToHtml, buildQuoteRequestInner, quoteRequestSubject } = await import("./index.ts");
const url = "http://test-supabase.local/functions/v1/send-accommodation-quote-request";

Deno.test({ name: "send-accommodation-quote-request: OPTIONS returns CORS", sanitizeOps: false, sanitizeResources: false }, async () => {
  const res = await handler(new Request(url, { method: "OPTIONS" }));
  assertEquals(res.status, 200);
});

Deno.test({ name: "send-accommodation-quote-request: 401 zonder Authorization", sanitizeOps: false, sanitizeResources: false }, async () => {
  const res = await handler(new Request(url, { method: "POST", body: "{}" }));
  assertEquals(res.status, 401);
  await res.text();
});

Deno.test("send-accommodation-quote-request: markdown-bullets en vet worden omgezet, HTML ontsmet", () => {
  const html = markdownToHtml("Beste partner,\n\n**Aanvraaggegevens:**\n- Klant: Jansen <b>\n- Aantal gasten: 12 personen\n\nTot snel");
  assertStringIncludes(html, "<strong>Aanvraaggegevens:</strong>");
  assertStringIncludes(html, '<li style="margin:2px 0;">Klant: Jansen &lt;b&gt;</li>');
  assertStringIncludes(html, "<li style=\"margin:2px 0;\">Aantal gasten: 12 personen</li>");
  assertEquals(html.includes("- Klant"), false);
  assertStringIncludes(html, "Tot snel");
});

Deno.test("send-accommodation-quote-request: tabnaam Logiesaanvragen, geldigheid en referentie in de tekst; geen eigen skelet", () => {
  const inner = buildQuoteRequestInner({
    body: "Hoi",
    portalBaseUrl: "https://bureauvlieland.nl",
    referenceNumber: "LOG-2611-0007",
    validUntilLabel: "zaterdag 5 december 2026",
  });
  assertStringIncludes(inner, 'onder "Logiesaanvragen"');
  assertEquals(inner.includes("Logies aanvragen"), false);
  assertStringIncludes(inner, "referentie LOG-2611-0007");
  assertStringIncludes(inner, "geldig tot zaterdag 5 december 2026");
  assertStringIncludes(inner, "https://bureauvlieland.nl/partner/login");
  assertEquals(inner.includes("<html"), false);
  assertEquals(inner.includes("Je partner voor Vlieland evenementen"), false);
});

Deno.test("send-accommodation-quote-request: LOG-nummer achter het onderwerp, niet dubbel", () => {
  assertEquals(quoteRequestSubject("Offerteaanvraag logies - Jansen (12 gasten)", "LOG-2611-0007"), "Offerteaanvraag logies - Jansen (12 gasten) (LOG-2611-0007)");
  assertEquals(quoteRequestSubject("Herinnering LOG-2611-0007", "LOG-2611-0007", "[TEST] "), "[TEST] Herinnering LOG-2611-0007");
  assertEquals(quoteRequestSubject("Zonder referentie", null), "Zonder referentie");
});
