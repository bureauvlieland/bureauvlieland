import { describe, expect, it } from "vitest";
import { buildEpcPayload } from "../epcQr";

const base = { beneficiaryName: "Bureau Vlieland B.V.", iban: "NL91 ABNA 0417 1643 00", amount: 1210, remittance: "260041" };

describe("buildEpcPayload", () => {
  it("bouwt de twaalf regels van een EPC-QR versie 002", () => {
    const payload = buildEpcPayload(base);
    expect(payload).toBe(
      ["BCD", "002", "1", "SCT", "", "Bureau Vlieland B.V.", "NL91ABNA0417164300", "EUR1210.00", "", "", "260041", ""].join("\n"),
    );
  });

  it("rondt het bedrag af op centen en knipt lange teksten", () => {
    const payload = buildEpcPayload({ ...base, amount: 99.999, beneficiaryName: "x".repeat(80), remittance: "y".repeat(150) })!;
    const lines = payload.split("\n");
    expect(lines[7]).toBe("EUR100.00");
    expect(lines[5]).toHaveLength(70);
    expect(lines[10]).toHaveLength(140);
  });

  it("geeft null zonder geldige IBAN, naam of positief bedrag", () => {
    expect(buildEpcPayload({ ...base, iban: "" })).toBeNull();
    expect(buildEpcPayload({ ...base, iban: "NL91" })).toBeNull();
    expect(buildEpcPayload({ ...base, beneficiaryName: "  " })).toBeNull();
    expect(buildEpcPayload({ ...base, amount: 0 })).toBeNull();
    expect(buildEpcPayload({ ...base, amount: -50 })).toBeNull();
  });

  it("neemt een BIC mee als die er is", () => {
    expect(buildEpcPayload({ ...base, bic: "abnanl2a" })!.split("\n")[4]).toBe("ABNANL2A");
  });
});
