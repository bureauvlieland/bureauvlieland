import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { buildEpcPayload } from "./epcQr.ts";

Deno.test("buildEpcPayload: twaalf regels, IBAN zonder spaties, bedrag op centen", () => {
  const payload = buildEpcPayload({ beneficiaryName: "Bureau Vlieland B.V.", iban: "NL91 ABNA 0417 1643 00", amount: 1210, remittance: "260041" });
  assertEquals(payload, ["BCD", "002", "1", "SCT", "", "Bureau Vlieland B.V.", "NL91ABNA0417164300", "EUR1210.00", "", "", "260041", ""].join("\n"));
});

Deno.test("buildEpcPayload: null zonder IBAN of bij een creditbedrag", () => {
  assertEquals(buildEpcPayload({ beneficiaryName: "X", iban: "", amount: 10, remittance: "1" }), null);
  assertEquals(buildEpcPayload({ beneficiaryName: "X", iban: "NL91ABNA0417164300", amount: -10, remittance: "1" }), null);
});
