import { describe, it, expect } from "vitest";
import { presentProvider, itemLocationLine, groupSizeLabel } from "@/lib/providerPresentation";

describe("presentProvider", () => {
  it("geeft null zonder profiel en 'geen inhoud' bij een leeg profiel", () => {
    expect(presentProvider(null)).toBeNull();
    const p = presentProvider({ id: "x", name: "Leeg BV", gallery_images: [], highlight_features: [] });
    expect(p?.hasContent).toBe(false);
    expect(p?.name).toBe("Leeg BV");
  });

  it("filtert kapotte foto's en lege highlights, bouwt adresregel", () => {
    const p = presentProvider({
      id: "x", name: "Vliehors Expres",
      gallery_images: [{ url: "https://a/1.jpg" }, { url: "" }, null as unknown as { url: string }],
      highlight_features: [" Wadden ", ""],
      address_street: "Havenweg 1", address_postal: "8899 BB", address_city: "Vlieland",
      location_lat: "53.2966", location_lng: "5.0744",
    });
    expect(p?.images).toHaveLength(1);
    expect(p?.highlights).toEqual(["Wadden"]);
    expect(p?.addressLine).toBe("Havenweg 1, 8899 BB Vlieland");
    expect(p?.coordinates).toEqual({ lat: 53.2966, lng: 5.0744 });
    expect(p?.hasContent).toBe(true);
  });
});

describe("itemLocationLine", () => {
  const provider = presentProvider({ id: "p", name: "P", location_lat: 53.2966, location_lng: 5.0744, location_description: "Bij de haven" });

  it("gebruikt de locatie van het onderdeel als die er is", () => {
    const line = itemLocationLine({ location_lat: 53.2679969, location_lng: 4.9687033, location_address: "Posthuys, Vliehors" }, provider);
    expect(line).toMatch(/^Posthuys, Vliehors · \d+ min fietsen van de boot/);
  });

  it("valt terug op de aanbieder", () => {
    const line = itemLocationLine({ location_lat: null, location_lng: null, location_address: null }, provider);
    expect(line).toMatch(/^Bij de haven · \d+ min lopen van de boot · in het dorp$/);
  });

  it("is null zonder enige plaatsinformatie", () => {
    expect(itemLocationLine({ location_lat: null, location_lng: null, location_address: null }, null)).toBeNull();
  });
});

describe("groupSizeLabel", () => {
  it("formuleert min/max", () => {
    expect(groupSizeLabel(8, 25)).toBe("8 tot 25 personen");
    expect(groupSizeLabel(8, null)).toBe("vanaf 8 personen");
    expect(groupSizeLabel(null, 25)).toBe("tot 25 personen");
    expect(groupSizeLabel(10, 10)).toBe("10 personen");
    expect(groupSizeLabel(null, null)).toBeNull();
  });
});
