import { describe, it, expect } from "vitest";
import {
  buildWhatsAppHref,
  detectMobileUserAgent,
  normalizeWhatsAppPhone,
} from "@/lib/whatsappLink";

describe("normalizeWhatsAppPhone", () => {
  it("strips +, spaces and dashes", () => {
    expect(normalizeWhatsAppPhone("+31 562 700-208")).toBe("31562700208");
  });
  it("handles empty input", () => {
    expect(normalizeWhatsAppPhone(null)).toBe("");
  });
});

describe("detectMobileUserAgent", () => {
  it("detects iPhone", () => {
    expect(detectMobileUserAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)")).toBe(true);
  });
  it("detects Android", () => {
    expect(detectMobileUserAgent("Mozilla/5.0 (Linux; Android 14)")).toBe(true);
  });
  it("treats desktop Chrome as non-mobile", () => {
    expect(
      detectMobileUserAgent(
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/126 Safari/537.36",
      ),
    ).toBe(false);
  });
});

describe("buildWhatsAppHref", () => {
  it("uses web.whatsapp.com on desktop (never api.whatsapp.com)", () => {
    const href = buildWhatsAppHref({ phone: "+31 562 700208", text: "Hallo", isMobile: false });
    expect(href).toContain("https://web.whatsapp.com/send?");
    expect(href).toContain("phone=31562700208");
    expect(href).toContain("text=Hallo");
    expect(href).not.toContain("api.whatsapp.com");
  });

  it("uses wa.me on mobile", () => {
    const href = buildWhatsAppHref({ phone: "31562700208", text: "Hoi daar", isMobile: true });
    expect(href).toBe("https://wa.me/31562700208?text=Hoi%20daar");
  });

  it("encodes urls in the message text", () => {
    const href = buildWhatsAppHref({
      text: "Bekijk: https://bureauvlieland.nl/p/abc?x=1",
      isMobile: true,
    });
    expect(href).toBe(
      "https://wa.me/?text=Bekijk%3A%20https%3A%2F%2Fbureauvlieland.nl%2Fp%2Fabc%3Fx%3D1",
    );
  });

  it("supports share-only links without a phone number on desktop", () => {
    const href = buildWhatsAppHref({ text: "Deel dit", isMobile: false });
    expect(href).toContain("https://web.whatsapp.com/send?");
    expect(href).not.toContain("phone=");
    expect(href).toContain("text=Deel+dit");
  });

  it("falls back to a bare link with no phone and no text", () => {
    expect(buildWhatsAppHref({ isMobile: true })).toBe("https://wa.me/");
    expect(buildWhatsAppHref({ isMobile: false })).toBe("https://web.whatsapp.com/");
  });
});
