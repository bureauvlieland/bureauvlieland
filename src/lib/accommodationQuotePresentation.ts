import { FACILITIES, type AccommodationQuote, type RoomConfiguration } from "@/types/accommodation";
import { getFacilityLabel as getRoomFacilityLabel, getBedConfigLabel } from "@/types/partnerRoomTypes";

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
  /** Faciliteiten van de accommodatie (waarden uit FACILITIES); leeg = niet ingevuld. */
  facilities: string[];
  checkInTime: string | null;
  checkOutTime: string | null;
}

type ImageItem = { url: string; alt?: string };

function cleanImages(value: unknown): ImageItem[] {
  return Array.isArray(value)
    ? (value as ImageItem[]).filter((img) => img && typeof img.url === "string" && img.url.length > 0)
    : [];
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
  // Eigen foto's bij de aanbieding gaan voor; anders de galerij van het bedrijf.
  const quoteImages = cleanImages(quote.images);
  const images = quoteImages.length > 0 ? quoteImages : cleanImages(p?.gallery_images);
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
    facilities: Array.isArray(p?.facilities) ? p!.facilities.map(String) : [],
    checkInTime: p?.check_in_time || null,
    checkOutTime: p?.check_out_time || null,
  };
}

/* ---------- Ligging: afstand tot de boot en het dorp ---------- */

/** Veerhaven Vlieland (aankomst Doeksen) en het centrum van Oost-Vlieland (Dorpsstraat). */
export const VLIELAND_FERRY = { lat: 53.2975, lng: 5.0925 };
export const VLIELAND_VILLAGE = { lat: 53.2957, lng: 5.0685 };

/** Afstand in meters (haversine). */
export function distanceMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** "2 min lopen" / "12 min lopen" / "25 min fietsen" op basis van hemelsbreed × 1,3. */
export function describeTravel(meters: number): string {
  const route = meters * 1.3;
  const walkMin = Math.max(1, Math.round(route / 80)); // 4,8 km/u
  if (walkMin <= 20) return `${walkMin} min lopen`;
  const bikeMin = Math.max(1, Math.round(route / 250)); // 15 km/u
  return `${bikeMin} min fietsen`;
}

export interface LocationDistances {
  ferryMeters: number;
  villageMeters: number;
  /** Bijv. "3 min lopen van de boot · in het dorp". */
  summary: string;
}

/** Ligging uit de coördinaten; null buiten Vlieland (partners op de wal). */
export function describeDistances(coords: { lat: number; lng: number } | null): LocationDistances | null {
  if (!coords) return null;
  const ferryMeters = distanceMeters(coords, VLIELAND_FERRY);
  const villageMeters = distanceMeters(coords, VLIELAND_VILLAGE);
  if (ferryMeters > 25000) return null;
  const village = villageMeters <= 450 ? "in het dorp" : `${describeTravel(villageMeters)} van het dorp`;
  return {
    ferryMeters,
    villageMeters,
    summary: `${describeTravel(ferryMeters)} van de boot · ${village}`,
  };
}

/* ---------- Faciliteiten: past het aanbod op de wensen? ---------- */

export interface FacilityMatch {
  /** Partner heeft geen faciliteiten ingevuld; er valt niets te vergelijken. */
  unknown: boolean;
  matched: string[];
  missing: string[];
  /** Overige faciliteiten van de accommodatie, niet gevraagd. */
  extra: string[];
}

export function facilityLabel(value: string): string {
  return FACILITIES.find((f) => f.value === value)?.label ?? value;
}

export function matchFacilities(required: unknown, offered: string[]): FacilityMatch {
  const wanted = Array.isArray(required) ? required.map(String) : [];
  const have = new Set(offered);
  if (offered.length === 0) {
    return { unknown: true, matched: [], missing: [], extra: [] };
  }
  return {
    unknown: false,
    matched: wanted.filter((v) => have.has(v)).map(facilityLabel),
    missing: wanted.filter((v) => !have.has(v)).map(facilityLabel),
    extra: offered.filter((v) => !wanted.includes(v)).map(facilityLabel),
  };
}

/* ---------- Kamers: momentopname van het kamertype ---------- */

export interface RoomPresentation {
  name: string;
  count: number;
  occupancy: number | null;
  pricePerNight: number | null;
  description: string | null;
  bedLabel: string | null;
  sizeSqm: number | null;
  facilityLabels: string[];
  images: ImageItem[];
  /** Er is meer te tonen dan naam en aantal. */
  hasDetails: boolean;
}

export function presentRoom(room: RoomConfiguration): RoomPresentation {
  const images = cleanImages(room.images);
  const facilityLabels = Array.isArray(room.facilities) ? room.facilities.map((f) => getRoomFacilityLabel(String(f))) : [];
  const description = room.description?.trim() || null;
  const bedLabel = room.bed_configuration ? getBedConfigLabel(room.bed_configuration) : null;
  const sizeSqm = typeof room.size_sqm === "number" && room.size_sqm > 0 ? room.size_sqm : null;
  return {
    name: room.type?.trim() || "Kamer",
    count: Number(room.count) || 0,
    occupancy: room.occupancy ? Number(room.occupancy) : null,
    pricePerNight: room.price_per_night ? Number(room.price_per_night) : null,
    description,
    bedLabel,
    sizeSqm,
    facilityLabels,
    images,
    hasDetails: images.length > 0 || facilityLabels.length > 0 || !!description || !!bedLabel || !!sizeSqm,
  };
}

/** Momentopname van een kamertype voor in room_configuration. */
export function roomSnapshotFromType(roomType: {
  id: string;
  name: string;
  description?: string | null;
  price_per_night?: number | null;
  max_occupancy?: number | null;
  bed_configuration?: string | null;
  size_sqm?: number | null;
  facilities?: string[] | null;
  images?: unknown;
}): RoomConfiguration {
  return {
    type: roomType.name,
    count: 1,
    price_per_night: roomType.price_per_night || 0,
    occupancy: roomType.max_occupancy || 2,
    room_type_id: roomType.id,
    description: roomType.description || null,
    bed_configuration: roomType.bed_configuration || null,
    size_sqm: roomType.size_sqm ?? null,
    facilities: Array.isArray(roomType.facilities) ? [...roomType.facilities] : [],
    images: cleanImages(roomType.images),
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
