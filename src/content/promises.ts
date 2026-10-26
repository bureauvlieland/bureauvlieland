/**
 * Eén bron voor de beloftes die op de site staan (besluit Erwin, 18 september
 * 2026, zie docs/plan-design-systeem.md). Gebruik deze constanten in plaats
 * van losse teksten, zodat de site nergens iets anders belooft dan hier staat.
 */
export const RESPONSE_TIME = {
  /** In een lopende zin: "wij sturen u {within} een voorstel". */
  within: "binnen 5 werkdagen",
  /** Korte regel onder een knop of in een USP-rij. */
  short: "Binnen 5 werkdagen een voorstel",
  /** Volledige zin. */
  sentence: "Binnen 5 werkdagen ontvangt u een voorstel op maat.",
} as const;

/**
 * Wat het bureau doet met een aanvraag: de reden om via Bureau Vlieland te
 * gaan in plaats van rechtstreeks bij de aanbieder. Staat op de catalogus
 * naast "Prijs in ons voorstel" (besluit 26 oktober 2026).
 */
export const BUREAU_PROMISE = {
  /** Kort, naast een prijs of onder een knop. */
  short: "Eén aanspreekpunt, één factuur",
  /** Volledige zin, in een intro of boekblok. */
  sentence: "Wij checken de beschikbaarheid bij de aanbieders, maken uw programma kloppend en u ontvangt één voorstel en één factuur.",
} as const;
