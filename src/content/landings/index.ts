import type { ActivityLandingContent, LandingContent } from "./types";
import { bedrijfsuitjeVlieland } from "./bedrijfsuitje-vlieland";
import { personeelsuitjeVlieland } from "./personeelsuitje-vlieland";
import { teamuitjeVlieland } from "./teamuitje-vlieland";
import { meerdaagsBedrijfsuitjeVlieland } from "./meerdaags-bedrijfsuitje-vlieland";
import { heisessieVlieland } from "./heisessie-vlieland";
import { bedrijfsuitjeIdeeenVlieland } from "./bedrijfsuitje-ideeen-vlieland";
import { incentiveReisVlieland } from "./incentive-reis-vlieland";
import { zakelijkEvenementVlieland } from "./zakelijk-evenement-vlieland";
import { groepsweekendVlieland } from "./groepsweekend-vlieland";
import { jubileumVlieland } from "./jubileum-vlieland";
import { familieweekendVlieland } from "./familieweekend-vlieland";
import { wadlopenVlieland } from "./wadlopen-vlieland";
import { zeehondentochtenVlieland } from "./zeehondentochten-vlieland";

export type { ActivityLandingContent, LandingContent } from "./types";

/**
 * Alle landingspagina's die het sjabloon `LandingPage` tekent. Nieuwe pagina:
 * inhoudsbestand toevoegen, hier registreren, pad in `paths.ts`.
 */
export const LANDINGS: LandingContent[] = [
  bedrijfsuitjeVlieland,
  personeelsuitjeVlieland,
  teamuitjeVlieland,
  meerdaagsBedrijfsuitjeVlieland,
  heisessieVlieland,
  bedrijfsuitjeIdeeenVlieland,
  incentiveReisVlieland,
  zakelijkEvenementVlieland,
  groepsweekendVlieland,
  jubileumVlieland,
  familieweekendVlieland,
];

/** Activiteitpagina's (tweede sjabloonvariant, `ActivityPage`). */
export const ACTIVITY_LANDINGS: ActivityLandingContent[] = [wadlopenVlieland, zeehondentochtenVlieland];
