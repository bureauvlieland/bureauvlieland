import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { daysUntilFirstDate, guardTermsRequest } from "./logic.ts";

const TODAY = "2026-10-26";
const ok = {
  status: "active",
  customer_email: "klant@voorbeeld.nl",
  customer_token: "tok",
  quote_status: "akkoord_ontvangen",
  selected_dates: ["2026-11-05"],
};

Deno.test("guardTermsRequest: akkoord zonder handtekening mag, met dagen tot de eerste dag", () => {
  assertEquals(guardTermsRequest(ok, TODAY), { ok: true, stage: "akkoord", daysUntil: 10, firstDate: "2026-11-05" });
});

Deno.test("guardTermsRequest: een verstuurd voorstel zonder akkoord vraagt om akkoord én handtekening", () => {
  const r = guardTermsRequest({ ...ok, quote_status: "offerte_verstuurd" }, TODAY);
  assertEquals(r.ok && r.stage, "offerte");
});

Deno.test("guardTermsRequest: een telefonisch gesloten project (concept) mag ook, zonder datum", () => {
  const r = guardTermsRequest({ ...ok, quote_status: "concept", selected_dates: null }, TODAY);
  assertEquals(r, { ok: true, stage: "akkoord", daysUntil: null, firstDate: null });
});

Deno.test("guardTermsRequest: geannuleerd, verwijderd, al getekend, geen mail of geen token vallen af", () => {
  assertEquals(guardTermsRequest({ ...ok, status: "cancelled" }, TODAY).ok, false);
  assertEquals(guardTermsRequest({ ...ok, cancelled_at: "2026-10-01" }, TODAY).ok, false);
  assertEquals(guardTermsRequest({ ...ok, status: "deleted" }, TODAY).ok, false);
  assertEquals(guardTermsRequest({ ...ok, terms_accepted_at: "2026-10-01" }, TODAY).ok, false);
  assertEquals(guardTermsRequest({ ...ok, signature_id: "sig" }, TODAY).ok, false);
  assertEquals(guardTermsRequest({ ...ok, customer_email: null }, TODAY).ok, false);
  assertEquals(guardTermsRequest({ ...ok, customer_token: "" }, TODAY).ok, false);
});

Deno.test("daysUntilFirstDate: sorteert, negeert rommel en telt in hele dagen", () => {
  assertEquals(daysUntilFirstDate(["2026-11-07", "2026-11-05T00:00:00Z", "x"], TODAY), { firstDate: "2026-11-05", daysUntil: 10 });
  assertEquals(daysUntilFirstDate("geen lijst", TODAY), { firstDate: null, daysUntil: null });
  assertEquals(daysUntilFirstDate(["2026-10-20"], TODAY).daysUntil, -6);
});
