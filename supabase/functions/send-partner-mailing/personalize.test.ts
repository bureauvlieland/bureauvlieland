import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { personalize } from "../_shared/mailing-personalize.ts";

Deno.test("personalize vult naam en per-partner variabelen in", () => {
  const html = "<p>Beste {{partner_name}},</p>{{missing_list}}<p>{{onbekend}}</p>";
  const out = personalize(html, "Hotel <Zeezicht>", { missing_list: "<ul><li>Foto's</li></ul>" });
  assertEquals(out, "<p>Beste Hotel &lt;Zeezicht&gt;,</p><ul><li>Foto's</li></ul><p></p>");
});

Deno.test("personalize laat geen scripts door via variabelen", () => {
  const out = personalize("{{x}}", "A", { x: "<script>alert(1)</script>" });
  assertEquals(out.includes("<script"), false);
});
