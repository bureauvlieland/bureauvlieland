/**
 * Snapshot van de opgeslagen activiteitdata (tabel `building_blocks`).
 *
 * Dit bestand is de brug tussen de database en de redactionele content in
 * `activityContent.ts`. De prebuild-validatie controleert dat elke duur,
 * prijs en groepsgrootte die in de content of op een landingspagina wordt
 * geclaimd, hier terug te vinden is. Zo kan er geen "gefantaseerd" feit in
 * de SEO-teksten sluipen.
 *
 * Bijwerken zodra een bouwsteen in de admin wijzigt (prijs, duur, min/max
 * personen). Waarden komen letterlijk uit de database.
 */

export type ActivityFactsSource = {
  /** Duur in minuten zoals in `building_blocks.duration`; null = niet vastgelegd. */
  durationMinutes: number | null;
  /** Alle bedragen in euro's die bij deze activiteit horen (incl. varianten). */
  prices: number[];
  /** `min_people` / `max_people`; null = niet vastgelegd. */
  minPeople: number | null;
  maxPeople: number | null;
  /** `location_address`. */
  location: string | null;
  /**
   * Aanvullende getallen die redactioneel zijn toegestaan, met motivatie.
   * Gebruik spaarzaam: alleen planningsmarges, geen productclaims.
   */
  allowExtra?: {
    durations?: number[];
    prices?: number[];
    groupSizes?: number[];
  };
};

export const activityFactsSource: Record<string, ActivityFactsSource> = {
  zeehondentocht: {
    durationMinutes: 45,
    // €32,50 p.p. + €425 voor de hele boot (bouwsteen "zeehondentocht-exclusief").
    prices: [32.5, 425],
    minPeople: 10,
    maxPeople: 40,
    location: "Reddingbootsteiger, Jachthaven",
    // 60 min = 45 min varen plus in-/uitstappen; planningsmarge in het programma.
    allowExtra: { durations: [60] },
  },
  wadloopexcursie: {
    durationMinutes: null,
    prices: [17.5, 12.5],
    minPeople: null,
    maxPeople: null,
    location: null,
  },
  "vliehors-expres": {
    durationMinutes: 120,
    prices: [30],
    minPeople: 15,
    maxPeople: 50,
    location: "Badweg 6, 8899 BV Vlieland",
  },
  "powerkiten-vliegeren": {
    durationMinutes: 90,
    prices: [35],
    minPeople: 10,
    maxPeople: 40,
    location: "Strand t.h.v. bushalte Ankerplaats, Oost-Vlieland",
  },
  surfles: {
    durationMinutes: 150,
    prices: [55],
    minPeople: 6,
    maxPeople: 20,
    location: "Strand t.h.v. bushalte Ankerplaats, Oost-Vlieland",
  },
  blokarten: {
    durationMinutes: 60,
    prices: [32.5],
    minPeople: 8,
    maxPeople: 16,
    location: "Strand t.h.v. bushalte Ankerplaats, Oost-Vlieland",
    // Windkracht 3 / 8 tot 10 knopen staat letterlijk in de omschrijving.
    allowExtra: { durations: [], prices: [] },
  },
  vuurtorenbezoek: {
    durationMinutes: 60,
    prices: [8],
    minPeople: 10,
    maxPeople: 25,
    location: "Liesbeth Listpad, Oost-Vlieland",
  },
  "fietstocht-met-begeleiding": {
    durationMinutes: 120,
    prices: [19],
    minPeople: 10,
    maxPeople: 30,
    location: "Waddendijk, Bij Willem De Vlamingh, Oost-Vlieland",
  },
  "bezoek-het-bunkermuseum": {
    durationMinutes: 90,
    prices: [8, 5.5],
    minPeople: null,
    maxPeople: null,
    location: "Kantonnierspad 1, Oost-Vlieland",
  },
  strandspektakel: {
    durationMinutes: null,
    prices: [32.5],
    minPeople: null,
    maxPeople: null,
    location: "Strand t.h.v. bushalte Ankerplaats, Oost-Vlieland",
  },
};

export const getActivityFactsSource = (slug: string): ActivityFactsSource | null =>
  activityFactsSource[slug] ?? null;
