import type { AccommodationQuote } from "@/types/accommodation";

/**
 * Hulpfuncties voor de klantweergave van een logiesofferte: wat er van de
 * accommodatie (partner) getoond kan worden, los van de offerte zelf.
 */

export interface QuotePartnerPresentation {
  images: { url: string; alt?: string }[];
  addressLine: string | null;
  locationDescription: string | null;
  highlights: string[];
  aboutText: string | null;
  websiteUrl: string | null;
  coordinates: { lat: number; lng: number } | null;
}

/** Geldige aardse coördinaten; beschermt tegen foutieve invoer zoals "532964885". */
export function validCoordinates(lat: unknown, lng: unknown): { lat: number; lng: number } | null {
  const la = Number(lat);
  const ln = Number(lng);
  if (!Number.isFinite(la) || !Number.isFinite(ln)) return null;
  if (la < -90 || la > 90 || ln < -180 || ln > 180) return null;
  if (la === 0 && ln === 0) return null;
  return { lat: la, lng: ln };
}

export function presentQuotePartner(quote: AccommodationQuote): QuotePartnerPresentation {
  const p = quote.partner;
  const images = Array.isArray(p?.gallery_images)
    ? p!.gallery_images.filter((img) => img && typeof img.url === "string" && img.url.length > 0)
    : [];
  const addressParts = [
    p?.address_street,
    [p?.address_postal, p?.address_city].filter(Boolean).join(" "),
  ].filter((s) => s && String(s).trim().length > 0) as string[];
  const highlights = Array.isArray(p?.highlight_features)
    ? p!.highlight_features.map((h) => String(h).trim()).filter((h) => h.length > 0)
    : [];
  return {
    images,
    addressLine: addressParts.length > 0 ? addressParts.join(", ") : null,
    locationDescription: p?.location_description?.trim() || null,
    highlights,
    aboutText: p?.about_text?.trim() || null,
    websiteUrl: p?.website_url || null,
    coordinates: validCoordinates(p?.location_lat, p?.location_lng),
  };
}

/** Eerste zin(nen) van een tekst, voor een samenvatting op de kaart. */
export function shortText(text: string | null, maxChars = 220): string | null {
  if (!text) return null;
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= maxChars) return clean;
  const cut = clean.slice(0, maxChars);
  const lastStop = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("! "), cut.lastIndexOf("? "));
  return (lastStop > maxChars * 0.5 ? cut.slice(0, lastStop + 1) : cut.trimEnd() + "…");
}

/** "vr 9 okt, 19.00" uit service_date/service_time van een extra. */
export function formatExtraMoment(serviceDate: string | null, serviceTime: string | null): string | null {
  if (!serviceDate) return serviceTime ? serviceTime.slice(0, 5).replace(":", ".") : null;
  const d = new Date(serviceDate);
  if (Number.isNaN(d.getTime())) return null;
  const day = d.toLocaleDateString("nl-NL", { weekday: "short", day: "numeric", month: "short" });
  const time = serviceTime ? serviceTime.slice(0, 5).replace(":", ".") : null;
  return time ? `${day}, ${time}` : day;
}
