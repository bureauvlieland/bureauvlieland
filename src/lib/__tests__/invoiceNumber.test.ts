import { describe, expect, it } from "vitest";
import { isSalesInvoiceNumber, normalizeInvoiceReference, textMentionsInvoiceNumber } from "../invoiceNumber";

describe("invoiceNumber", () => {
  it("herkent het jaarreeksformaat", () => {
    expect(isSalesInvoiceNumber("260041")).toBe(true);
    expect(isSalesInvoiceNumber("2610000")).toBe(true);
    expect(isSalesInvoiceNumber("FV-BV-2611-0001-001")).toBe(false);
    expect(isSalesInvoiceNumber("BVC-2610-0001")).toBe(false);
    expect(isSalesInvoiceNumber("")).toBe(false);
    expect(isSalesInvoiceNumber(null)).toBe(false);
  });

  it("normaliseert wat een klant intikt", () => {
    expect(normalizeInvoiceReference("26-0041")).toBe("260041");
    expect(normalizeInvoiceReference(" 26 0041 ")).toBe("260041");
    expect(normalizeInvoiceReference("fv-bv-2611-0001-001")).toBe("FVBV26110001001");
  });

  it("vindt een cijfernummer alleen als los getal", () => {
    expect(textMentionsInvoiceNumber("Factuur 260041 Bureau Vlieland", "260041")).toBe(true);
    expect(textMentionsInvoiceNumber("factuur 26-0041", "260041")).toBe(true);
    expect(textMentionsInvoiceNumber("26 0041 diner", "260041")).toBe(true);
    // Cijfers binnen een IBAN of een langer getal tellen niet.
    expect(textMentionsInvoiceNumber("NL91ABNA0260041300", "260041")).toBe(false);
    expect(textMentionsInvoiceNumber("1260041", "260041")).toBe(false);
    expect(textMentionsInvoiceNumber("", "260041")).toBe(false);
    expect(textMentionsInvoiceNumber("Factuur 260041", "")).toBe(false);
  });

  it("blijft oude nummers herkennen, ook zonder streepjes", () => {
    expect(textMentionsInvoiceNumber("FV-BV-2611-0001-001", "FV-BV-2611-0001-001")).toBe(true);
    expect(textMentionsInvoiceNumber("fvbv26110001001", "FV-BV-2611-0001-001")).toBe(true);
    expect(textMentionsInvoiceNumber("BVC 2610 0001", "BVC-2610-0001")).toBe(true);
  });
});
