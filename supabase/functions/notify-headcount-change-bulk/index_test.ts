import { assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";

Deno.env.set("SUPABASE_URL", "http://test-supabase.local");
Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "srv");
Deno.env.set("MAILJET_API_KEY", "mj");
Deno.env.set("MAILJET_SECRET_KEY", "mj");

const { handler } = await import("./index.ts");
const src = await Deno.readTextFile(new URL("./index.ts", import.meta.url));
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

Deno.test("notify-headcount-change-bulk: beide partnermails via de gedeelde helper en de huisstijlwrapper", () => {
  // De tekst zelf wordt getest in _shared/partnerHeadcountMail.test.ts.
  assertStringIncludes(src, 'from "../_shared/partnerHeadcountMail.ts"');
  assertStringIncludes(src, "buildPartnerHeadcountMail({");
  assertStringIncludes(src, "buildLodgingHeadcountMail({");
  assertStringIncludes(src, "wrapEmailHtml(mail.html, supabase)");
  assertStringIncludes(src, "wrapEmailHtml(lodgingMail.html, supabase)");
  assertEquals(src.includes("Beste ${"), false, "geen u-vorm meer in de partnermail");
  assertEquals(src.includes("U hoeft"), false);
});
