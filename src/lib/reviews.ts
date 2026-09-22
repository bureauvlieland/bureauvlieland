import type { GoogleReview } from "@/hooks/useGoogleReviewsCache";

/**
 * Welke beoordelingen een pagina toont (docs/plan-reviews-oogsten.md,
 * fase 2). Eigen gepubliceerde beoordelingen komen uit de view
 * `published_reviews`; een landingspagina zet de beoordelingen van klanten
 * die via die pagina binnenkwamen (of die de admin met een tag aan de
 * pagina koppelde) vooraan, een activiteitpagina toont alleen programma's
 * waar die bouwsteen in zat. Google-reviews vullen aan waar dat mag.
 */
export interface PublishedReview {
  id: string;
  rating: number | null;
  text: string;
  author_name: string;
  author_role: string;
  company: string;
  source: string;
  tags: string[];
  created_at: string;
  entry_path: string;
  block_ids: string[];
}

export interface ReviewScope {
  /** Pad van de landingspagina, bijvoorbeeld "/bedrijfsuitje-vlieland". */
  landingPath?: string;
  /** Id van de bouwsteen op een activiteitpagina. */
  blockId?: string;
}

export interface DisplayReview {
  key: string;
  text: string;
  author: string;
  /** Regel onder de naam: organisatie, functie of "Google-review · 2 maanden geleden". */
  meta: string;
  rating: number | null;
  photo: string | null;
  source: "own" | "google";
}

/** Pad zonder query, hash en slash aan het eind; "/" blijft "/". */
export const normalizePath = (path: string): string => {
  const kaal = path.split("?")[0].split("#")[0].replace(/\/+$/, "");
  return kaal || "/";
};

const slugOf = (path: string) => normalizePath(path).replace(/^\//, "");

/** Hoort deze beoordeling bij de pagina? Zonder scope hoort alles erbij. */
export const isRelevant = (review: PublishedReview, scope: ReviewScope): boolean => {
  const tags = review.tags.map((t) => t.trim().toLowerCase());
  if (scope.blockId) {
    return review.block_ids.includes(scope.blockId) || tags.includes(scope.blockId.toLowerCase());
  }
  if (scope.landingPath) {
    const pad = normalizePath(scope.landingPath);
    return (review.entry_path && normalizePath(review.entry_path) === pad) || tags.includes(slugOf(pad).toLowerCase());
  }
  return true;
};

const nieuwsteEerst = (a: PublishedReview, b: PublishedReview) => b.created_at.localeCompare(a.created_at);

/**
 * Eigen beoordelingen voor een pagina: passende eerst, dan de rest (nieuwste
 * eerst). Met `strict` alleen de passende, bijvoorbeeld op een
 * activiteitpagina.
 */
export function selectReviews(reviews: PublishedReview[], scope: ReviewScope, options: { limit?: number; strict?: boolean } = {}): PublishedReview[] {
  const { limit = 3, strict = false } = options;
  const passend = reviews.filter((r) => isRelevant(r, scope)).sort(nieuwsteEerst);
  if (strict) return passend.slice(0, limit);
  const overige = reviews.filter((r) => !isRelevant(r, scope)).sort(nieuwsteEerst);
  return [...passend, ...overige].slice(0, limit);
}

const normalizeName = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]/g, "")
    .trim();

export const toDisplay = (r: PublishedReview): DisplayReview => ({
  key: `own-${r.id}`,
  text: r.text,
  author: r.author_name,
  meta: [r.author_role, r.company].filter(Boolean).join(" · "),
  // Alleen een echte score tonen; bestaande citaten hebben er geen.
  rating: r.source === "portal" ? r.rating : null,
  photo: null,
  source: "own",
});

export const googleToDisplay = (g: GoogleReview, index: number): DisplayReview => ({
  key: `google-${index}`,
  text: g.text,
  author: g.author_name,
  meta: `Google-review${g.relative_time ? ` · ${g.relative_time}` : ""}`,
  rating: g.rating,
  photo: g.author_photo ?? null,
  source: "google",
});

/**
 * Eigen beoordelingen eerst, aangevuld met Google-reviews (vier sterren of
 * meer) tot `limit`. Een Google-review van iemand die ook zelf beoordeelde,
 * of met dezelfde tekst, valt weg.
 */
export function mergeWithGoogle(own: PublishedReview[], google: GoogleReview[], limit: number, minRating = 4): DisplayReview[] {
  const names = new Set(own.map((r) => normalizeName(r.author_name)));
  const teksten = new Set(own.map((r) => normalizeName(r.text).slice(0, 80)));
  const eigen = own.map(toDisplay);
  const aanvulling = google
    .filter((g) => (g.rating ?? 0) >= minRating && g.text)
    .filter((g) => !names.has(normalizeName(g.author_name)) && !teksten.has(normalizeName(g.text).slice(0, 80)))
    .map(googleToDisplay);
  return [...eigen, ...aanvulling].slice(0, limit);
}
