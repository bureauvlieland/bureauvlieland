import type { LandingContent } from "./types";
import { bedrijfsuitjeVlieland } from "./bedrijfsuitje-vlieland";
import { teamuitjeVlieland } from "./teamuitje-vlieland";
import { meerdaagsBedrijfsuitjeVlieland } from "./meerdaags-bedrijfsuitje-vlieland";
import { heisessieVlieland } from "./heisessie-vlieland";
import { bedrijfsuitjeIdeeenVlieland } from "./bedrijfsuitje-ideeen-vlieland";
import { incentiveReisVlieland } from "./incentive-reis-vlieland";
import { zakelijkEvenementVlieland } from "./zakelijk-evenement-vlieland";
import { groepsweekendVlieland } from "./groepsweekend-vlieland";
import { jubileumVlieland } from "./jubileum-vlieland";
import { familieweekendVlieland } from "./familieweekend-vlieland";

export type { LandingContent } from "./types";

/**
 * Alle landingspagina's die het sjabloon `LandingPage` tekent. Nieuwe pagina:
 * inhoudsbestand toevoegen, hier registreren, route in `App.tsx`.
 */
export const LANDINGS: LandingContent[] = [
  bedrijfsuitjeVlieland,
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
