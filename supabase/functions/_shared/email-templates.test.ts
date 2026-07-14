/**
 * Guard tests voor test-mode rerouting. Als deze breekt, gaan test-mails
 * naar echte klanten (of blijven productie-mails naar het test-adres gaan).
 */
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  getRecipientEmail,
  isTestMode,
  getSubjectPrefix,
  getPortalBaseUrl,
} from "./email-templates.ts";


const CUSTOMER = "klant@example.com";
const TEST_EMAIL = "erwin@bureauvlieland.nl";

Deno.test("productie-origin: geen rerouting, geen [TEST] prefix", () => {
  for (const origin of [
    "https://bureauvlieland.nl",
    "https://www.bureauvlieland.nl",
    "https://bureauvlieland.lovable.app",
  ]) {
    assertEquals(isTestMode(origin), false, `origin=${origin}`);
    assertEquals(getRecipientEmail(CUSTOMER, origin), CUSTOMER);
    assertEquals(getSubjectPrefix(origin), "");
  }
});

Deno.test("preview/dev origin: reroute naar test-adres + [TEST] prefix", () => {
  for (const origin of [
    "https://id-preview--abc.lovable.app",
    "https://foo.lovable.app",
    "http://localhost:8080",
    "https://random-domain.example.com",
  ]) {
    assertEquals(isTestMode(origin), true, `origin=${origin}`);
    assertEquals(getRecipientEmail(CUSTOMER, origin), TEST_EMAIL);
    assertEquals(getSubjectPrefix(origin), "[TEST] ");
  }
});

Deno.test("cron (geen origin): behandeld als productie", () => {
  assertEquals(isTestMode(undefined), false);
  assertEquals(isTestMode(""), false);
  assertEquals(getRecipientEmail(CUSTOMER, undefined), CUSTOMER);
  assertEquals(getSubjectPrefix(undefined), "");
});
