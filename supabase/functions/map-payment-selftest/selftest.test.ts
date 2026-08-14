import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { classifySelftest } from "./index.ts";

const WHITELIST_BODY =
  '{"Message":"returnUrl is missing, invalid, or its host is not whitelisted for this API key."}';

Deno.test("checkout-url met 200 is een geslaagde test", () => {
  assertEquals(classifySelftest(200, "{}", "https://pay.example/abc"), "ok");
});

Deno.test("whitelist-afwijzing wordt herkend", () => {
  assertEquals(classifySelftest(400, WHITELIST_BODY, null), "return_url_not_whitelisted");
});

Deno.test("andere fouten vallen terug op payment_unavailable", () => {
  assertEquals(classifySelftest(500, "boom", null), "payment_unavailable");
  assertEquals(classifySelftest(400, '{"Message":"Booking not found"}', null), "payment_unavailable");
});
