import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { chatConversationUrl, sourceLabelFor } from "./labels.ts";

Deno.test("bronlabel per kanaal: klantportaal, partnerportaal, WhatsApp, website; logieschat wint", () => {
  assertEquals(sourceLabelFor({ source: "customer_portal" }), "Klantportaal");
  assertEquals(sourceLabelFor({ source: "partner_portal" }), "Partnerportaal");
  assertEquals(sourceLabelFor({ source: "whatsapp" }), "WhatsApp");
  assertEquals(sourceLabelFor({ source: "presales" }), "Website");
  assertEquals(sourceLabelFor({ source: "customer_portal", accommodation_id: "acc-1" }), "Logiespartner");
  assertEquals(sourceLabelFor({ source: "iets-nieuws" }), "Chat");
});

Deno.test("deeplink opent het gesprek in het Berichtencentrum (?gesprek=chat:<id>)", () => {
  assertEquals(
    chatConversationUrl("https://bureauvlieland.nl", "4f2a"),
    "https://bureauvlieland.nl/admin/berichten?gesprek=chat:4f2a",
  );
});
