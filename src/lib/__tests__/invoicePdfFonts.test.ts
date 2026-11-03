import { describe, it, expect } from "vitest";
import { bytesToBase64, sanitizeForStandardFont } from "@/lib/invoicePdfFonts";

describe("tekst voor Helvetica (fallback zonder Inter)", () => {
  it("maakt van de pijl in een overtocht een streepje", () => {
    expect(sanitizeForStandardFont("Overtocht Harlingen → Vlieland")).toBe("Overtocht Harlingen - Vlieland");
  });

  it("laat tekens die Helvetica wél kent met rust", () => {
    const text = "€ 1.234,56 – ‘citaat’ • 7 × € 2,58 … é ë ö ß";
    expect(sanitizeForStandardFont(text)).toBe(text);
  });

  it("laat andere tekens buiten WinAnsi vervallen", () => {
    expect(sanitizeForStandardFont("Diner ✓ geboekt ✗ 😀")).toBe("Diner v geboekt x ");
  });
});

describe("base64 zonder FileReader", () => {
  it("komt overeen met Buffer", () => {
    const bytes = new Uint8Array(70000).map((_, i) => (i * 31) % 256);
    expect(bytesToBase64(bytes)).toBe(Buffer.from(bytes).toString("base64"));
  });
});
