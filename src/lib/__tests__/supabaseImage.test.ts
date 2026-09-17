import { describe, it, expect } from "vitest";
import { transformImageUrl, buildSrcSet, originalImageUrl } from "@/lib/supabaseImage";

const storage = "https://utshmnyrjzwtrpttxdlw.supabase.co/storage/v1/object/public/building-block-images/foto.jpg";

describe("transformImageUrl", () => {
  it("verkleint met behoud van verhouding als alleen een breedte is opgegeven", () => {
    expect(transformImageUrl(storage, { width: 1200, quality: 78 })).toBe(
      "https://utshmnyrjzwtrpttxdlw.supabase.co/storage/v1/render/image/public/building-block-images/foto.jpg?width=1200&quality=78&resize=contain",
    );
  });
  it("snijdt alleen bij als breedte én hoogte zijn opgegeven, of als dat expliciet gevraagd is", () => {
    expect(transformImageUrl(storage, { width: 400, height: 300 })).toContain("resize=cover");
    expect(transformImageUrl(storage, { width: 400, resize: "cover" })).toContain("resize=cover");
  });
  it("laat externe URL's, lokale assets en lege waarden met rust", () => {
    expect(transformImageUrl("https://example.com/a.jpg", { width: 800 })).toBe("https://example.com/a.jpg");
    expect(transformImageUrl("/placeholder.svg", { width: 800 })).toBe("/placeholder.svg");
    expect(transformImageUrl("", { width: 800 })).toBe("");
  });
  it("bouwt een srcSet alleen voor storage-URL's", () => {
    expect(buildSrcSet(storage, [400, 800])).toContain("width=400&quality=75&resize=contain 400w");
    expect(buildSrcSet("https://example.com/a.jpg", [400])).toBeUndefined();
  });
});

describe("originalImageUrl", () => {
  it("geeft het origineel achter een render-URL terug", () => {
    expect(originalImageUrl(transformImageUrl(storage, { width: 900 }))).toBe(storage);
  });
  it("geeft null voor een gewone URL", () => {
    expect(originalImageUrl(storage)).toBeNull();
    expect(originalImageUrl("https://example.com/a.jpg")).toBeNull();
  });
});
