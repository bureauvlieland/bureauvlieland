/**
 * Project communication state — wie is nu aan zet voor een dossier.
 * Dit is een tweede, naast `getProjectPipelineStage` lopende statusas.
 *
 * Pipeline-stage zegt WAAR het project staat in het verkoopproces
 * (concept → offerte → akkoord → AV → facturatie → afgerond).
 *
 * Communicatie-status zegt WIE er nu actie moet ondernemen.
 */

import type { ProjectPipelineStage } from "./projectWorkflow";

export type ProjectCommunicationState =
  | "bij_bureau"        // 🟢 Wij moeten iets doen
  | "wacht_op_klant"    // 🟠 Klant moet iets doen
  | "wacht_op_partner"  // 🔵 Partner moet iets doen
  | "wacht_op_logies"   // 🟣 Logies-partner moet iets doen
  | "stilte"            // 🔴 Te lang geen reactie, opvolgen
  | "klaar";            // ⚪ Niets meer te doen

export const COMMUNICATION_STATE_META: Record<
  ProjectCommunicationState,
  { label: string; emoji: string; color: string; tone: string }
> = {
  bij_bureau:      { label: "Bij bureau",        emoji: "🟢", color: "bg-emerald-500",  tone: "text-emerald-700"  },
  wacht_op_klant:  { label: "Wacht op klant",    emoji: "🟠", color: "bg-orange-500",   tone: "text-orange-700"   },
  wacht_op_partner:{ label: "Wacht op partner",  emoji: "🔵", color: "bg-sky-500",      tone: "text-sky-700"      },
  wacht_op_logies: { label: "Wacht op logies",   emoji: "🟣", color: "bg-violet-500",   tone: "text-violet-700"   },
  stilte:          { label: "Stilte — opvolgen", emoji: "🔴", color: "bg-rose-500",     tone: "text-rose-700"     },
  klaar:           { label: "Klaar",             emoji: "⚪", color: "bg-muted",        tone: "text-muted-foreground" },
};

const STILTE_DRIEMPEL_DAGEN = 5;

function daysSince(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return null;
  return (Date.now() - t) / (1000 * 60 * 60 * 24);
}

/** Input voor het programma-spoor (meest urgente item / dossier-state). */
export interface ProgramTrackInput {
  pipeline: ProjectPipelineStage;
  quote_status?: string | null;
  /** Datum waarop het laatst iets richting klant of partner gebeurde */
  last_outbound_at?: string | null;
  /** Aantal items dat nog naar partner gestuurd moet worden */
  itemsReadyForPartner?: number;
  /** Aantal items waar partner nog iets moet bevestigen / prijzen */
  itemsAwaitingPartnerResponse?: number;
}

/** Input voor het logies-spoor. */
export interface LodgingTrackInput {
  hasRequest: boolean;
  /** Aantal partners aangeschreven, nog wachtend op offerte */
  quotesPending?: number;
  /** Aantal binnen, klant moet kiezen */
  quotesAwaitingCustomerChoice?: number;
  /** Geselecteerde quote, alles geregeld */
  quoteSelected?: boolean;
  last_outbound_at?: string | null;
}

/** Bepaal communicatie-status voor het programma-spoor. */
export function getProgramCommunicationState(
  input: ProgramTrackInput,
): ProjectCommunicationState {
  if (input.pipeline === "geannuleerd" || input.pipeline === "afgerond") return "klaar";

  // Offerte verstuurd → wacht op klant
  if (input.quote_status === "offerte_verstuurd") {
    const stale = daysSince(input.last_outbound_at);
    if (stale !== null && stale > STILTE_DRIEMPEL_DAGEN) return "stilte";
    return "wacht_op_klant";
  }

  // Items wachten op partner-bevestiging
  if ((input.itemsAwaitingPartnerResponse ?? 0) > 0) {
    const stale = daysSince(input.last_outbound_at);
    if (stale !== null && stale > STILTE_DRIEMPEL_DAGEN) return "stilte";
    return "wacht_op_partner";
  }

  // Items klaar voor partner-uitzetting → bureau-actie
  if ((input.itemsReadyForPartner ?? 0) > 0) return "bij_bureau";

  // Concept zonder verdere acties → bureau
  return "bij_bureau";
}

/** Bepaal communicatie-status voor het logies-spoor. */
export function getLodgingCommunicationState(
  input: LodgingTrackInput,
): ProjectCommunicationState {
  if (!input.hasRequest) return "klaar";
  if (input.quoteSelected) return "klaar";

  if ((input.quotesAwaitingCustomerChoice ?? 0) > 0) {
    const stale = daysSince(input.last_outbound_at);
    if (stale !== null && stale > STILTE_DRIEMPEL_DAGEN) return "stilte";
    return "wacht_op_klant";
  }

  if ((input.quotesPending ?? 0) > 0) {
    const stale = daysSince(input.last_outbound_at);
    if (stale !== null && stale > STILTE_DRIEMPEL_DAGEN) return "stilte";
    return "wacht_op_logies";
  }

  // Geen quotes uitgezet, request bestaat → bureau moet uitzetten
  return "bij_bureau";
}

/** Combineer beide sporen tot één overall-communicatie-status (meest urgente). */
export function combineCommunicationStates(
  states: ProjectCommunicationState[],
): ProjectCommunicationState {
  // Volgorde van urgentie (eerst = meest urgent / blokkerend voor bureau)
  const order: ProjectCommunicationState[] = [
    "stilte",
    "bij_bureau",
    "wacht_op_partner",
    "wacht_op_logies",
    "wacht_op_klant",
    "klaar",
  ];
  for (const s of order) {
    if (states.includes(s)) return s;
  }
  return "klaar";
}
