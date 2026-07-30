/**
 * Filterfacetten per activiteit voor /activiteiten-vlieland.
 *
 * Redactioneel vastgelegd (niet uit de database) zodat de filters
 * consistent en uitlegbaar blijven. Sluit aan op de tien verdiepte
 * activiteitenpagina's uit `activityLinks.ts`.
 */

export type Season = "voorjaar" | "zomer" | "najaar" | "winter";
export type DurationBucket = "kort" | "halve-dag" | "dagdeel-plus";
export type Suitability = "kinderen" | "groepen" | "minder-mobiel" | "slecht-weer";

export type ActivityFacets = {
  /** Seizoenen waarin de activiteit realistisch te boeken is. */
  seasons: Season[];
  /** Indicatieve tijdsbesteding inclusief in- en uitloop. */
  duration: DurationBucket;
  /** Waar de activiteit zich goed voor leent. */
  suitability: Suitability[];
};

export const SEASON_LABELS: Record<Season, string> = {
  voorjaar: "Voorjaar",
  zomer: "Zomer",
  najaar: "Najaar",
  winter: "Winter",
};

export const DURATION_LABELS: Record<DurationBucket, string> = {
  kort: "Tot 1,5 uur",
  "halve-dag": "1,5 – 3 uur",
  "dagdeel-plus": "Halve dag of meer",
};

export const SUITABILITY_LABELS: Record<Suitability, string> = {
  kinderen: "Met kinderen",
  groepen: "Voor groepen",
  "minder-mobiel": "Minder mobiel",
  "slecht-weer": "Ook bij slecht weer",
};

export const activityFacets: Record<string, ActivityFacets> = {
  zeehondentocht: {
    seasons: ["voorjaar", "zomer", "najaar"],
    duration: "kort",
    suitability: ["kinderen", "groepen", "minder-mobiel"],
  },
  wadloopexcursie: {
    seasons: ["voorjaar", "zomer", "najaar"],
    duration: "halve-dag",
    suitability: ["kinderen", "groepen", "slecht-weer"],
  },
  "vliehors-expres": {
    seasons: ["voorjaar", "zomer", "najaar", "winter"],
    duration: "halve-dag",
    suitability: ["kinderen", "groepen", "minder-mobiel", "slecht-weer"],
  },
  "powerkiten-vliegeren": {
    seasons: ["voorjaar", "zomer", "najaar"],
    duration: "halve-dag",
    suitability: ["kinderen", "groepen"],
  },
  surfles: {
    seasons: ["zomer", "najaar"],
    duration: "halve-dag",
    suitability: ["groepen"],
  },
  blokarten: {
    seasons: ["voorjaar", "zomer", "najaar"],
    duration: "halve-dag",
    suitability: ["kinderen", "groepen"],
  },
  vuurtorenbezoek: {
    seasons: ["voorjaar", "zomer", "najaar", "winter"],
    duration: "kort",
    suitability: ["kinderen", "groepen", "slecht-weer"],
  },
  "fietstocht-met-begeleiding": {
    seasons: ["voorjaar", "zomer", "najaar"],
    duration: "dagdeel-plus",
    suitability: ["kinderen", "groepen"],
  },
  "bezoek-het-bunkermuseum": {
    seasons: ["voorjaar", "zomer", "najaar", "winter"],
    duration: "kort",
    suitability: ["kinderen", "groepen", "slecht-weer"],
  },
  strandspektakel: {
    seasons: ["voorjaar", "zomer", "najaar"],
    duration: "dagdeel-plus",
    suitability: ["kinderen", "groepen"],
  },
};

export const getActivityFacets = (slug: string): ActivityFacets | null =>
  activityFacets[slug] ?? null;
