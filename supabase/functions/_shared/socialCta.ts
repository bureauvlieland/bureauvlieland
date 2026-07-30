/**
 * Centrale contentpijler → landingspagina mapping met vaste UTM-CTA's.
 * Gebruikt door social-generate-drafts (en te bewerken via /admin/social/instellingen).
 */

export const SITE_ORIGIN = "https://bureauvlieland.nl";

export type SocialPillar =
  | "activiteit"
  | "voorbeeldprogramma"
  | "partner"
  | "behind_scenes"
  | "eiland";

/** Standaard bestemming per pijler (overschrijfbaar via social_settings.default_ctas). */
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

/** Bron-type (kandidaat in de generator) → contentpijler. */
export function pillarForSourceType(sourceType: string): SocialPillar {
  switch (sourceType) {
    case "building_block":
      return "activiteit";
    case "program_template":
      return "voorbeeldprogramma";
    case "partner":
    case "partner_spotlight":
      return "partner";
    case "asset":
      return "behind_scenes";
    default:
      return "eiland";
  }
}

/** Diepe link per pijler; valt terug op de overzichtspagina als er geen slug is. */
export function landingPathFor(
  pillar: SocialPillar,
  slug: string | null | undefined,
  overrides: Record<string, string> = {},
): string {
  const base = overrides[pillar] ?? DEFAULT_PILLAR_ROUTES[pillar];
  if (!slug) return base;
  if (pillar === "activiteit") return `/activiteit/${slug}`;
  if (pillar === "voorbeeldprogramma") return `/voorbeeldprogrammas/${slug}`;
  return base;
}

export type CtaChannel = "facebook" | "instagram";

/**
 * Bouwt de volledige CTA-URL met vaste UTM-tagging.
 * Facebook krijgt de diepe link, Instagram de link-in-bio pagina (/links)
 * met dezelfde UTM's plus `to=` zodat de bestemming meetbaar blijft.
 */
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

/** Caption-stramien per pijler, meegegeven aan de AI-prompt. */
export const PILLAR_CAPTION_FORMAT: Record<SocialPillar, string> = {
  activiteit:
    "Haakje (beeldend zintuiglijk zinnetje) → wat het is → één praktisch feit (duur, groepsgrootte of seizoen) → zachte uitnodiging.",
  voorbeeldprogramma:
    "Haakje → korte schets van de dagindeling in 2-3 stappen → voor wie het past → zachte uitnodiging om het programma te bekijken.",
  partner:
    "Haakje met een persoonlijk detail → wie de partner is en wat ze doen → waarom wij met ze werken → zachte uitnodiging.",
  behind_scenes:
    "Haakje bij de foto → het verhaal erachter, zonder klantnamen → wat wij daarin deden → zachte uitnodiging.",
  eiland:
    "Haakje over het eiland/seizoen → één concreet feit of tip → geen harde verkoop → zachte uitnodiging.",
};
