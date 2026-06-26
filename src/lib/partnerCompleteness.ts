/**
 * Bereken hoe "compleet" een partnerprofiel of bouwsteen is.
 * Score 0-100 + lijst van ontbrekende velden (Nederlandse labels).
 * Wordt gebruikt voor nudges in de partnerportal — pure functies, geen DB.
 */

import type { PartnerBuildingBlock } from "@/types/partner";

export interface PartnerCompletenessInput {
  about_text: string | null;
  image_url: string | null;
  gallery_images: { url: string; alt?: string }[] | null;
  location_lat: number | null;
  location_lng: number | null;
  location_description: string | null;
  website_url: string | null;
  highlight_features: string[] | null;
}

export interface CompletenessResult {
  score: number; // 0..100, afgerond
  total: number;
  passed: number;
  missing: string[]; // Nederlandse labels van wat ontbreekt
}

type Check = { label: string; pass: boolean; weight?: number };

const compute = (checks: Check[]): CompletenessResult => {
  const totalWeight = checks.reduce((s, c) => s + (c.weight ?? 1), 0);
  const passedWeight = checks
    .filter((c) => c.pass)
    .reduce((s, c) => s + (c.weight ?? 1), 0);
  return {
    score: totalWeight === 0 ? 100 : Math.round((passedWeight / totalWeight) * 100),
    total: checks.length,
    passed: checks.filter((c) => c.pass).length,
    missing: checks.filter((c) => !c.pass).map((c) => c.label),
  };
};

const hasText = (v: string | null | undefined, min = 1) =>
  typeof v === "string" && v.trim().length >= min;

export const calculatePartnerCompleteness = (
  partner: Pick<
    Partner,
    | "about_text"
    | "image_url"
    | "gallery_images"
    | "location_lat"
    | "location_lng"
    | "location_description"
    | "website_url"
    | "highlight_features"
  > & { image_url?: string | null },
): CompletenessResult => {
  const gallery = Array.isArray(partner.gallery_images) ? partner.gallery_images : [];
  const highlights = Array.isArray(partner.highlight_features)
    ? partner.highlight_features
    : [];
  return compute([
    { label: "Uitgebreide omschrijving (≥ 200 tekens)", pass: hasText(partner.about_text, 200), weight: 2 },
    { label: "Hoofdafbeelding", pass: hasText(partner.image_url), weight: 2 },
    { label: "Galerij met ≥ 3 foto's", pass: gallery.length >= 3, weight: 2 },
    {
      label: "Locatie op de kaart",
      pass:
        typeof partner.location_lat === "number" &&
        typeof partner.location_lng === "number" &&
        hasText(partner.location_description),
    },
    { label: "Website-link", pass: hasText(partner.website_url) },
    { label: "≥ 3 highlights / kenmerken", pass: highlights.length >= 3 },
  ]);
};

export const calculateBlockCompleteness = (
  block: Pick<
    PartnerBuildingBlock,
    | "short_description"
    | "description"
    | "image_url"
    | "image_asset"
    | "price_adult"
    | "price_display_override"
    | "duration"
    | "min_people"
    | "max_people"
    | "tags"
    | "location_address"
  >,
): CompletenessResult => {
  const tags = Array.isArray(block.tags) ? block.tags : [];
  return compute([
    { label: "Korte omschrijving", pass: hasText(block.short_description, 30) },
    { label: "Uitgebreide omschrijving (≥ 150 tekens)", pass: hasText(block.description, 150), weight: 2 },
    {
      label: "Afbeelding",
      pass: hasText(block.image_url) || hasText(block.image_asset),
      weight: 2,
    },
    {
      label: "Prijs ingevuld",
      pass:
        (typeof block.price_adult === "number" && block.price_adult > 0) ||
        hasText(block.price_display_override),
      weight: 2,
    },
    { label: "Duur", pass: hasText(block.duration) },
    {
      label: "Min./max. aantal personen",
      pass: typeof block.min_people === "number" || typeof block.max_people === "number",
    },
    { label: "≥ 2 tags", pass: tags.length >= 2 },
    { label: "Locatie-adres", pass: hasText(block.location_address) },
  ]);
};

/** Combineert profiel + gemiddelde van bouwstenen tot één getal voor de banner. */
export const calculateOverallCompleteness = (
  partner: Parameters<typeof calculatePartnerCompleteness>[0],
  blocks: Parameters<typeof calculateBlockCompleteness>[0][],
): CompletenessResult => {
  const profile = calculatePartnerCompleteness(partner);
  if (blocks.length === 0) return profile;
  const blockScores = blocks.map((b) => calculateBlockCompleteness(b).score);
  const avgBlocks = blockScores.reduce((a, b) => a + b, 0) / blockScores.length;
  // Profiel telt 60%, bouwstenen 40%
  const score = Math.round(profile.score * 0.6 + avgBlocks * 0.4);
  const weakBlockCount = blockScores.filter((s) => s < 70).length;
  const missing = [...profile.missing];
  if (weakBlockCount > 0) {
    missing.push(
      `${weakBlockCount} ${weakBlockCount === 1 ? "bouwsteen kan" : "bouwstenen kunnen"} rijker (foto, omschrijving of prijs)`,
    );
  }
  return { score, total: profile.total + blocks.length, passed: 0, missing };
};
