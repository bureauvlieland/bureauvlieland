import { describe, it, expect } from "vitest";
import { transformImageUrl, buildSrcSet } from "@/lib/supabaseImage";

const storage = "https://utshmnyrjzwtrpttxdlw.supabase.co/storage/v1/object/public/building-block-images/foto.jpg";

describe("transformImageUrl", () => {
  it("zet een storage-URL om naar de render-endpoint met breedte en kwaliteit", () => {
    expect(transformImageUrl(storage, { width: 1200, quality: 78 })).toBe(
      "https://utshmnyrjzwtrpttxdlw.supabase.co/storage/v1/render/image/public/building-block-images/foto.jpg?width=1200&quality=78&resize=cover",
    );
  });
  it("laat externe URL's, lokale assets en lege waarden met rust", () => {
    expect(transformImageUrl("https://example.com/a.jpg", { width: 800 })).toBe("https://example.com/a.jpg");
    expect(transformImageUrl("/placeholder.svg", { width: 800 })).toBe("/placeholder.svg");
    expect(transformImageUrl("", { width: 800 })).toBe("");
  });
  it("bouwt een srcSet alleen voor storage-URL's", () => {
    expect(buildSrcSet(storage, [400, 800])).toContain("width=400&quality=75&resize=cover 400w");
    expect(buildSrcSet("https://example.com/a.jpg", [400])).toBeUndefined();
  });
});
