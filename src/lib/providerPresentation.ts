import type { ProgramRequestItem, ProviderProfile } from "@/types/programRequest";
import { describeDistances, validCoordinates } from "@/lib/accommodationQuotePresentation";

/**
 * Wat de klant over een activiteit en zijn aanbieder te zien krijgt op de
 * programmakaart (docs/plan-activiteitenaanbieders.md, fase 1).
 */

export interface ProviderPresentation {
  name: string;
  images: { url: string; alt?: string }[];
  aboutText: string | null;
  highlights: string[];
  websiteUrl: string | null;
  addressLine: string | null;
  locationDescription: string | null;
  coordinates: { lat: number; lng: number } | null;
  /** Er is iets te tonen naast de naam. */
  hasContent: boolean;
}

export function presentProvider(profile: ProviderProfile | null | undefined): ProviderPresentation | null {
  if (!profile) return null;
  const images = Array.isArray(profile.gallery_images)
    ? profile.gallery_images.filter((img) => img && typeof img.url === "string" && img.url.length > 0)
    : [];
  const highlights = Array.isArray(profile.highlight_features)
    ? profile.highlight_features.map((h) => String(h).trim()).filter((h) => h.length > 0)
    : [];
  const addressParts = [
    profile.address_street,
    [profile.address_postal, profile.address_city].filter(Boolean).join(" "),
  ].filter((s) => s && String(s).trim().length > 0) as string[];
  const aboutText = profile.about_text?.trim() || null;
  const websiteUrl = profile.website_url?.trim() || null;
  return {
    name: profile.name,
    images,
    aboutText,
    highlights,
    websiteUrl,
    addressLine: addressParts.length > 0 ? addressParts.join(", ") : null,
    locationDescription: profile.location_description?.trim() || null,
    coordinates: validCoordinates(profile.location_lat, profile.location_lng),
    hasContent: images.length > 0 || !!aboutText || highlights.length > 0 || !!websiteUrl,
  };
}

/**
 * Regel over de plek van een onderdeel: adres of ligging plus de afstand tot
 * boot en dorp. De locatie van het onderdeel (bouwsteen) gaat voor op die van
 * de aanbieder, want een excursie start niet altijd bij het bedrijf.
 */
export function itemLocationLine(
  item: Pick<ProgramRequestItem, "location_lat" | "location_lng" | "location_address">,
  provider: ProviderPresentation | null,
): string | null {
  const coords = validCoordinates(item.location_lat, item.location_lng) ?? provider?.coordinates ?? null;
  const place = item.location_address?.trim() || provider?.locationDescription || provider?.addressLine || null;
  const distances = describeDistances(coords);
  return [place, distances?.summary].filter(Boolean).join(" · ") || null;
}

/** "8 tot 25 personen" / "vanaf 8 personen" / "tot 25 personen". */
export function groupSizeLabel(min: number | null | undefined, max: number | null | undefined): string | null {
  const lo = typeof min === "number" && min > 0 ? min : null;
  const hi = typeof max === "number" && max > 0 ? max : null;
  if (lo && hi) return lo === hi ? `${lo} personen` : `${lo} tot ${hi} personen`;
  if (lo) return `vanaf ${lo} personen`;
  if (hi) return `tot ${hi} personen`;
  return null;
}
