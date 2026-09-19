/**
 * Paden van alle landingspagina's, los van de inhoud zodat `App.tsx` de
 * routes kan registreren zonder de teksten in de hoofdbundel te trekken.
 * Moet gelijk zijn aan `LANDINGS.map((c) => c.path)`; een test bewaakt dat.
 */
export const LANDING_PATHS = [
  "/bedrijfsuitje-vlieland",
  "/teamuitje-vlieland",
  "/meerdaags-bedrijfsuitje-vlieland",
  "/heisessie-vlieland",
  "/bedrijfsuitje-ideeen-vlieland",
  "/incentive-reis-vlieland",
  "/zakelijk-evenement-vlieland",
  "/groepsweekend-vlieland",
  "/jubileum-vlieland",
  "/familieweekend-vlieland",
] as const;
