/**
 * Interne linkstructuur tussen de activiteitenpagina's.
 *
 * Doel: elke /activiteit/<slug> is bereikbaar vanuit meerdere andere
 * activiteitenpagina's én vanaf /activiteiten-vlieland. Dat verkort de
 * klikafstand vanaf de hub-pagina en helpt crawlers de losse
 * detailpagina's te ontdekken (veel stonden op "gevonden, niet geïndexeerd").
 *
 * Redactioneel gekozen — geen automatische "zelfde categorie"-lijst, zodat
 * de combinaties ook inhoudelijk logisch zijn (wad ↔ zeehonden, strand ↔ wind).
 */

export type ActivityLink = {
  slug: string;
  label: string;
  teaser: string;
};

/** De tien verdiepte activiteitenpagina's, in redactionele volgorde. */
export const featuredActivities: ActivityLink[] = [
  {
    slug: "zeehondentocht",
    label: "Zeehondentocht",
    teaser: "Circa 45 minuten varen langs de zandbanken rond laagwater.",
  },
  {
    slug: "wadloopexcursie",
    label: "Wadloopexcursie",
    teaser: "Met een lokale gids het wad op — voor vrijwel alle leeftijden.",
  },
  {
    slug: "vliehors-expres",
    label: "Vliehors Expres",
    teaser: "Met de legendarische strandbus over de Vliehors naar de Vliehors.",
  },
  {
    slug: "powerkiten-vliegeren",
    label: "Powerkiten & vliegeren",
    teaser: "Trekkracht van de wind op het brede strand, onder begeleiding.",
  },
  {
    slug: "surfles",
    label: "Surfles",
    teaser: "Eerste golven pakken met instructeurs van de eilandsurfschool.",
  },
  {
    slug: "blokarten",
    label: "Blokarten",
    teaser: "Zeilen op wielen over het strand — snel te leren, direct leuk.",
  },
  {
    slug: "vuurtorenbezoek",
    label: "Vuurtorenbezoek",
    teaser: "Naar boven in de rode vuurtoren, met uitzicht over het hele eiland.",
  },
  {
    slug: "fietstocht-met-begeleiding",
    label: "Fietstocht met begeleiding",
    teaser: "Duinen, bos en strand met een gids die de verhalen kent.",
  },
  {
    slug: "bezoek-het-bunkermuseum",
    label: "Bunkermuseum",
    teaser: "Oorlogsgeschiedenis van het eiland, ondergronds verteld.",
  },
  {
    slug: "strandspektakel",
    label: "Strandspektakel",
    teaser: "Meerdere strandonderdelen achter elkaar — de groepsklassieker.",
  },
];

const bySlug = new Map(featuredActivities.map((a) => [a.slug, a]));

/** Redactionele "bekijk ook"-relaties per activiteit. */
const seeAlso: Record<string, string[]> = {
  zeehondentocht: ["wadloopexcursie", "vliehors-expres", "fietstocht-met-begeleiding"],
  wadloopexcursie: ["zeehondentocht", "vliehors-expres", "vuurtorenbezoek"],
  "vliehors-expres": ["zeehondentocht", "wadloopexcursie", "blokarten"],
  "powerkiten-vliegeren": ["blokarten", "surfles", "strandspektakel"],
  surfles: ["powerkiten-vliegeren", "blokarten", "strandspektakel"],
  blokarten: ["powerkiten-vliegeren", "surfles", "vliehors-expres"],
  vuurtorenbezoek: ["bezoek-het-bunkermuseum", "fietstocht-met-begeleiding", "wadloopexcursie"],
  "fietstocht-met-begeleiding": ["vuurtorenbezoek", "bezoek-het-bunkermuseum", "zeehondentocht"],
  "bezoek-het-bunkermuseum": ["vuurtorenbezoek", "fietstocht-met-begeleiding", "vliehors-expres"],
  strandspektakel: ["blokarten", "powerkiten-vliegeren", "surfles"],
};

/**
 * Geeft de "bekijk ook"-activiteiten voor een slug.
 * Valt terug op de eerste andere featured activiteiten als er geen
 * redactionele relatie is gedefinieerd.
 */
export const getSeeAlsoActivities = (
  slug?: string | null,
  limit = 3,
): ActivityLink[] => {
  if (!slug) return [];
  const explicit = (seeAlso[slug] ?? [])
    .map((s) => bySlug.get(s))
    .filter((a): a is ActivityLink => Boolean(a));

  if (explicit.length >= limit) return explicit.slice(0, limit);

  const fallback = featuredActivities.filter(
    (a) => a.slug !== slug && !explicit.some((e) => e.slug === a.slug),
  );
  return [...explicit, ...fallback].slice(0, limit);
};
