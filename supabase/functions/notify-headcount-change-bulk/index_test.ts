import { assertEquals, assertStringIncludes, assertMatch } from "https://deno.land/std@0.224.0/assert/mod.ts";

Deno.env.set("SUPABASE_URL", "http://test-supabase.local");
Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "srv");
Deno.env.set("MAILJET_API_KEY", "mj");
Deno.env.set("MAILJET_SECRET_KEY", "mj");

const { handler } = await import("./index.ts");
const { buildLodgingHeadcountMail } = await import("./lodging-mail.ts");
const url = "http://test-supabase.local/functions/v1/notify-headcount-change-bulk";
const opts = { sanitizeOps: false, sanitizeResources: false };

Deno.test({ name: "notify-headcount-change-bulk: OPTIONS geeft CORS", ...opts }, async () => {
  const res = await handler(new Request(url, { method: "OPTIONS" }));
  assertEquals(res.status, 200);
});

Deno.test({ name: "notify-headcount-change-bulk: 400 zonder aantallen", ...opts }, async () => {
  const res = await handler(
    new Request(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ request_id: "x" }) }),
  );
  assertEquals(res.status, 400);
});

Deno.test({ name: "notify-headcount-change-bulk: 400 zonder project of logiesofferte", ...opts }, async () => {
  const res = await handler(
    new Request(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ old_people: 10, new_people: 8 }) }),
  );
  assertEquals(res.status, 400);
});

Deno.test("logiespartner-mail vraagt om bevestiging van het nieuwe aantal, in de u-vorm", () => {
  const { subject, html } = buildLodgingHeadcountMail({
    partnerName: "Badhotel Bruin",
    accommodationName: "Badhotel Bruin",
    customerLabel: "RMD Trainingen",
    arrival: "5 november 2026",
    departure: "6 november 2026",
    oldGuests: 10,
    newGuests: 8,
    currentPriceTotal: 1336,
    reference: "LOG-2608-0001",
    actionUrl: "https://bureauvlieland.nl/partner/logies/abc?actie=aantal",
    note: "Twee deelnemers hebben afgezegd.",
  });
  assertEquals(subject, "Nieuw aantal gasten bevestigen: 8 in plaats van 10 (LOG-2608-0001)");
  assertStringIncludes(html, "Nieuw aantal bevestigen");
  assertStringIncludes(html, "https://bureauvlieland.nl/partner/logies/abc?actie=aantal");
  assertStringIncludes(html, "van\n        <strong>10</strong> naar <strong>8</strong>");
  assertStringIncludes(html, "voor 10 gasten");
  assertStringIncludes(html, "Twee deelnemers hebben afgezegd.");
  assertStringIncludes(html, "Beste Badhotel Bruin");
  // u-vorm en geen gedachtestreepjes of pijlen
  assertMatch(html, /\bu het nieuwe aantal\b/);
  assertEquals(/\bHoi\b|\bje\b|\bjouw\b/.test(html), false);
  assertEquals(html.includes("—") || html.includes("→") || subject.includes("—"), false);
});
