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
