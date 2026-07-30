/**
 * Contentpijlers en vaste UTM-CTA's voor Facebook/Instagram.
 * Front-end spiegel van supabase/functions/_shared/socialCta.ts
 * (edge functions kunnen niet uit src/ importeren).
 */

export const SITE_ORIGIN = "https://bureauvlieland.nl";

export const SOCIAL_PILLARS = [
  "activiteit",
  "voorbeeldprogramma",
  "partner",
  "behind_scenes",
  "eiland",
] as const;

export type SocialPillar = (typeof SOCIAL_PILLARS)[number];

export const DEFAULT_PILLAR_ROUTES: Record<SocialPillar, string> = {
  activiteit: "/bouwstenen",
  voorbeeldprogramma: "/voorbeeldprogrammas",
  partner: "/partners",
  behind_scenes: "/onze-werkwijze",
  eiland: "/evenementen",
};

export const PILLAR_LABELS: Record<SocialPillar, string> = {
  activiteit: "Activiteit in de spotlight",
  voorbeeldprogramma: "Voorbeeldprogramma",
  partner: "Partner in de spotlight",
  behind_scenes: "Achter de schermen",
  eiland: "Eiland & seizoen",
};

export const PILLAR_DESCRIPTIONS: Record<SocialPillar, string> = {
  activiteit: "Eén bouwsteen uitgelicht — link gaat naar /activiteit/{slug} als die bestaat.",
  voorbeeldprogramma: "Dagindeling uit een voorbeeldprogramma — link naar /voorbeeldprogrammas/{slug}.",
  partner: "Lokale ondernemer in beeld.",
  behind_scenes: "Projectfoto uit de mediabank, zonder klantnamen.",
  eiland: "Zachte eiland- en seizoenscontent, geen verkoop.",
};

export function landingPathFor(
  pillar: SocialPillar,
  slug?: string | null,
  overrides: Record<string, string> = {},
): string {
  const base = overrides[pillar] ?? DEFAULT_PILLAR_ROUTES[pillar];
  if (!slug) return base;
  if (pillar === "activiteit") return `/activiteit/${slug}`;
  if (pillar === "voorbeeldprogramma") return `/voorbeeldprogrammas/${slug}`;
  return base;
}

export type CtaChannel = "facebook" | "instagram";

export function buildCtaUrl(opts: {
  pillar: SocialPillar;
  slug?: string | null;
  channel: CtaChannel;
  overrides?: Record<string, string>;
}): string {
  const { pillar, slug, channel, overrides = {} } = opts;
  const target = landingPathFor(pillar, slug, overrides);
  const path = channel === "instagram" ? "/links" : target;

  let url: URL;
  try {
    url = new URL(path, SITE_ORIGIN);
  } catch {
    url = new URL("/", SITE_ORIGIN);
  }
  if (channel === "instagram" && target !== "/links") {
    url.searchParams.set("to", target);
  }
  url.searchParams.set("utm_source", channel === "instagram" ? "instagram" : "facebook");
  url.searchParams.set("utm_medium", "organic_social");
  url.searchParams.set("utm_campaign", "bureau_vlieland_social");
  url.searchParams.set("utm_content", pillar);
  if (slug) url.searchParams.set("utm_term", slug);
  return url.toString();
}

/** Haalt de eerste http(s)-URL uit een caption, voor weergave in de admin. */
export function extractCtaFromCaption(caption?: string | null): string | null {
  if (!caption) return null;
  const match = caption.match(/https?:\/\/\S+/);
  return match ? match[0] : null;
}
