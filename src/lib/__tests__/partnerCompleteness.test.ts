import { describe, it, expect } from "vitest";
import {
  calculatePartnerCompleteness,
  calculateBlockCompleteness,
  calculateOverallCompleteness,
} from "@/lib/partnerCompleteness";

const longText = (n: number) => "x".repeat(n);

describe("calculatePartnerCompleteness", () => {
  it("returns 0 for empty partner", () => {
    const r = calculatePartnerCompleteness({
      about_text: null,
      image_url: null,
      gallery_images: [],
      location_lat: null,
      location_lng: null,
      location_description: null,
      website_url: null,
      highlight_features: [],
    });
    expect(r.score).toBe(0);
    expect(r.missing.length).toBeGreaterThan(0);
  });

  it("returns 100 for fully filled partner", () => {
    const r = calculatePartnerCompleteness({
      about_text: longText(250),
      image_url: "https://x/y.jpg",
      gallery_images: [{ url: "a" }, { url: "b" }, { url: "c" }],
      location_lat: 53.3,
      location_lng: 5.0,
      location_description: "Oost-Vlieland",
      website_url: "https://example.com",
      highlight_features: ["a", "b", "c"],
    });
    expect(r.score).toBe(100);
    expect(r.missing).toHaveLength(0);
  });
});

describe("calculateBlockCompleteness", () => {
  it("flags missing fields", () => {
    const r = calculateBlockCompleteness({
      short_description: null,
      description: null,
      image_url: null,
      image_asset: null,
      price_adult: null,
      price_display_override: null,
      duration: null,
      min_people: null,
      max_people: null,
      tags: [],
      location_address: null,
    });
    expect(r.score).toBe(0);
    expect(r.missing).toContain("Afbeelding");
    expect(r.missing).toContain("Prijs ingevuld");
  });

  it("accepts price_display_override as price", () => {
    const r = calculateBlockCompleteness({
      short_description: longText(40),
      description: longText(200),
      image_url: "x.jpg",
      image_asset: null,
      price_adult: null,
      price_display_override: "Op aanvraag",
      duration: "2 uur",
      min_people: 4,
      max_people: 20,
      tags: ["a", "b"],
      location_address: "Dorpsstraat 1",
    });
    expect(r.score).toBe(100);
  });
});

describe("calculateOverallCompleteness", () => {
  it("weighs profile 60% and blocks 40%", () => {
    const full = {
      about_text: longText(250),
      image_url: "x",
      gallery_images: [{ url: "a" }, { url: "b" }, { url: "c" }],
      location_lat: 53,
      location_lng: 5,
      location_description: "x",
      website_url: "x",
      highlight_features: ["a", "b", "c"],
    };
    const r = calculateOverallCompleteness(full, []);
    expect(r.score).toBe(100);
  });
});
