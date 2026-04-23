/**
 * Canonical lifecycle model for projects and items.
 *
 * Single source of truth that maps the (still existing) raw DB statuses
 * (program_requests.quote_status, program_request_items.status, etc.)
 * to one semantic phase per item and per project. Every status badge in
 * admin / klant / partner portaal should derive its label, color and icon
 * from `lifecycleConfig` so users see the same wording for the same state.
 *
 * Pure helper module — does not import any DB or React code.
 */

import {
  FileEdit,
  Send,
  Mail,
  Users,
  Clock,
  CheckCircle,
  CheckCircle2,
  Receipt,
  XCircle,
  ArrowLeftRight,
  AlertTriangle,
  type LucideIcon,
} from "lucide-react";

// ── Project lifecycle ────────────────────────────────────────────────

export type ProjectPhase =
  | "concept"
  | "klant_actie_offerte"     // offerte verstuurd, wacht op klant-akkoord
  | "klant_actie_voorwaarden"  // klant gaf akkoord, mist voorwaarden/facturatie/logies
  | "partners_benaderen"       // klaar om naar partners te sturen
  | "partners_wachten"         // partners benaderd, in afwachting
  | "uitvoering"               // alles bevestigd, wacht op uitvoeringsdatum
  | "facturatie"               // klaar voor / bezig met facturatie
  | "afgerond"
  | "geannuleerd";

// ── Item lifecycle ───────────────────────────────────────────────────

export type ItemPhase =
  | "concept"             // nog niets verstuurd, draft
  | "wacht_klant"         // offerte verstuurd, klant moet akkoord geven
  | "wacht_partner"       // klant akkoord, partner moet reageren
  | "tegenvoorstel_klant" // klant heeft tegenvoorstel gedaan
  | "tegenvoorstel_partner" // partner stelt alternatief voor
  | "bevestigd"
  | "uitgevoerd"
  | "gefactureerd"
  | "niet_beschikbaar"
  | "geannuleerd";

// ── Config shape ─────────────────────────────────────────────────────

export interface LifecyclePhaseConfig {
  adminLabel: string;
  customerLabel: string;
  partnerLabel: string;
  /** Tailwind text color class (semantic, e.g. text-amber-700) */
  color: string;
  /** Tailwind background class (semantic, e.g. bg-amber-100) */
  bgColor: string;
  icon: LucideIcon;
  description: string;
  /** Short admin-facing instruction for the "Volgende stap" banner */
  nextAction?: string;
}

// ── Project phase config ─────────────────────────────────────────────

export const projectPhaseConfig: Record<ProjectPhase, LifecyclePhaseConfig> = {
  concept: {
    adminLabel: "Concept",
    customerLabel: "Concept",
    partnerLabel: "Concept",
    color: "text-slate-700 dark:text-slate-300",
    bgColor: "bg-slate-100 dark:bg-slate-800",
    icon: FileEdit,
    description: "Programma wordt samengesteld",
    nextAction: "Stel het programma samen en publiceer het naar de klant.",
  },
  klant_actie_offerte: {
    adminLabel: "Wacht op klant-akkoord",
    customerLabel: "Offerte ontvangen",
    partnerLabel: "Offerte bij klant",
    color: "text-blue-700 dark:text-blue-400",
    bgColor: "bg-blue-100 dark:bg-blue-950/50",
    icon: Send,
    description: "Klant heeft de offerte ontvangen en moet akkoord geven",
    nextAction: "Wacht op klant. Stuur eventueel een status-mail om te herinneren.",
  },
  klant_actie_voorwaarden: {
    adminLabel: "Klant moet gegevens aanleveren",
    customerLabel: "Aanvullende gegevens nodig",
    partnerLabel: "Klant levert gegevens aan",
    color: "text-amber-700 dark:text-amber-400",
    bgColor: "bg-amber-100 dark:bg-amber-950/50",
    icon: AlertTriangle,
    description: "Voorwaarden, facturatie of logieskeuze ontbreken nog",
    nextAction: "Stuur de klant een status-mail met wat nog ontbreekt.",
  },
  partners_benaderen: {
    adminLabel: "Klaar om naar partners te sturen",
    customerLabel: "In voorbereiding",
    partnerLabel: "In voorbereiding",
    color: "text-amber-700 dark:text-amber-400",
    bgColor: "bg-amber-100 dark:bg-amber-950/50",
    icon: Mail,
    description: "Onderdelen kunnen naar partners verstuurd worden",
    nextAction: "Verstuur de bevestigde onderdelen naar de betrokken partners.",
  },
  partners_wachten: {
    adminLabel: "Wacht op partners",
    customerLabel: "Aanbieders bevestigen",
    partnerLabel: "Reactie gevraagd",
    color: "text-blue-700 dark:text-blue-400",
    bgColor: "bg-blue-100 dark:bg-blue-950/50",
    icon: Users,
    description: "Partners zijn benaderd en moeten bevestigen",
    nextAction: "Wacht op partner-bevestigingen. Volg na waar nodig.",
  },
  uitvoering: {
    adminLabel: "Klaar voor uitvoering",
    customerLabel: "Bevestigd",
    partnerLabel: "Bevestigd",
    color: "text-green-700 dark:text-green-400",
    bgColor: "bg-green-100 dark:bg-green-950/50",
    icon: CheckCircle,
    description: "Alle onderdelen bevestigd, wacht op uitvoeringsdatum",
    nextAction: "Houd de uitvoering in de gaten en verwerk daarna de facturatie.",
  },
  facturatie: {
    adminLabel: "Facturatie",
    customerLabel: "Facturatie loopt",
    partnerLabel: "Uitgevoerd",
    color: "text-purple-700 dark:text-purple-400",
    bgColor: "bg-purple-100 dark:bg-purple-950/50",
    icon: Receipt,
    description: "Bezig met facturatie",
    nextAction: "Verwerk de inkomende inkoopfacturen en verstuur de eindfactuur.",
  },
  afgerond: {
    adminLabel: "Afgerond",
    customerLabel: "Afgerond",
    partnerLabel: "Afgerond",
    color: "text-emerald-700 dark:text-emerald-400",
    bgColor: "bg-emerald-100 dark:bg-emerald-950/50",
    icon: CheckCircle2,
    description: "Alles afgehandeld",
  },
  geannuleerd: {
    adminLabel: "Geannuleerd",
    customerLabel: "Geannuleerd",
    partnerLabel: "Geannuleerd",
    color: "text-muted-foreground",
    bgColor: "bg-muted",
    icon: XCircle,
    description: "Project is geannuleerd",
  },
};

// ── Item phase config ────────────────────────────────────────────────

export const itemPhaseConfig: Record<ItemPhase, LifecyclePhaseConfig> = {
  concept: {
    adminLabel: "Concept",
    customerLabel: "Onder voorbehoud",
    partnerLabel: "Concept",
    color: "text-slate-700 dark:text-slate-300",
    bgColor: "bg-slate-100 dark:bg-slate-800",
    icon: FileEdit,
    description: "Nog niet verstuurd",
  },
  wacht_klant: {
    adminLabel: "Wacht op klant",
    customerLabel: "Akkoord nodig",
    partnerLabel: "Bij klant ter goedkeuring",
    color: "text-blue-700 dark:text-blue-400",
    bgColor: "bg-blue-100 dark:bg-blue-950/50",
    icon: Send,
    description: "Wacht op klant-akkoord voordat partner benaderd wordt",
  },
  wacht_partner: {
    adminLabel: "Wacht op partner",
    customerLabel: "Aanbieder bevestigt",
    partnerLabel: "Aangevraagd",
    color: "text-amber-700 dark:text-amber-400",
    bgColor: "bg-amber-100 dark:bg-amber-950/50",
    icon: Clock,
    description: "Partner moet beschikbaarheid bevestigen",
  },
  tegenvoorstel_klant: {
    adminLabel: "Tegenvoorstel klant",
    customerLabel: "Tegenvoorstel ingediend",
    partnerLabel: "Tegenvoorstel klant",
    color: "text-purple-700 dark:text-purple-400",
    bgColor: "bg-purple-100 dark:bg-purple-950/50",
    icon: ArrowLeftRight,
    description: "Klant heeft een aangepast voorstel ingediend",
  },
  tegenvoorstel_partner: {
    adminLabel: "Alternatief partner",
    customerLabel: "Aanbieder stelt alternatief voor",
    partnerLabel: "Alternatief voorgesteld",
    color: "text-blue-700 dark:text-blue-400",
    bgColor: "bg-blue-100 dark:bg-blue-950/50",
    icon: ArrowLeftRight,
    description: "Partner heeft een alternatief voorgesteld",
  },
  bevestigd: {
    adminLabel: "Bevestigd",
    customerLabel: "Bevestigd",
    partnerLabel: "Bevestigd",
    color: "text-green-700 dark:text-green-400",
    bgColor: "bg-green-100 dark:bg-green-950/50",
    icon: CheckCircle,
    description: "Onderdeel is bevestigd",
  },
  uitgevoerd: {
    adminLabel: "Uitgevoerd",
    customerLabel: "Uitgevoerd",
    partnerLabel: "Uitgevoerd",
    color: "text-emerald-700 dark:text-emerald-400",
    bgColor: "bg-emerald-100 dark:bg-emerald-950/50",
    icon: CheckCircle2,
    description: "Activiteit is uitgevoerd",
  },
  gefactureerd: {
    adminLabel: "Gefactureerd",
    customerLabel: "Gefactureerd",
    partnerLabel: "Gefactureerd",
    color: "text-slate-700 dark:text-slate-400",
    bgColor: "bg-slate-100 dark:bg-slate-950/50",
    icon: Receipt,
    description: "Onderdeel is gefactureerd",
  },
  niet_beschikbaar: {
    adminLabel: "Niet beschikbaar",
    customerLabel: "Niet beschikbaar",
    partnerLabel: "Niet beschikbaar",
    color: "text-red-700 dark:text-red-400",
    bgColor: "bg-red-100 dark:bg-red-950/50",
    icon: XCircle,
    description: "Aanbieder is niet beschikbaar",
  },
  geannuleerd: {
    adminLabel: "Geannuleerd",
    customerLabel: "Geannuleerd",
    partnerLabel: "Geannuleerd",
    color: "text-muted-foreground",
    bgColor: "bg-muted",
    icon: XCircle,
    description: "Onderdeel is geannuleerd",
  },
};

// ── Resolution helpers ───────────────────────────────────────────────

export interface ProjectForLifecycle {
  status?: string | null;
  quote_status?: string | null;
  terms_accepted_at?: string | null;
  billing_company_name?: string | null;
  completion_status?: string | null;
  cancelled_at?: string | null;
  linked_accommodation_id?: string | null;
  /** Pass true when a linked accommodation request has a selected quote */
  hasSelectedAccommodation?: boolean;
}

export interface ItemForLifecycle {
  status?: string | null;
  item_quote_status?: string | null;
  skip_partner_notification?: boolean | null;
  customer_approved_at?: string | null;
  customer_accepted_at?: string | null;
  customer_counter_at?: string | null;
  executed_at?: string | null;
  invoiced_date?: string | null;
}

/**
 * Map a single program_request_item + its parent project to one canonical
 * item phase. Order-of-checks reflects business priority.
 */
export function getItemPhase(
  item: ItemForLifecycle,
  project: Pick<ProjectForLifecycle, "quote_status" | "cancelled_at">,
): ItemPhase {
  if (item.status === "cancelled" || project.cancelled_at) return "geannuleerd";
  if (item.invoiced_date || item.status === "invoiced") return "gefactureerd";
  if (item.executed_at || item.status === "executed") return "uitgevoerd";
  if (item.status === "unavailable") return "niet_beschikbaar";
  if (item.status === "counter_proposed") return "tegenvoorstel_klant";
  if (item.status === "alternative") return "tegenvoorstel_partner";
  if (
    item.status === "confirmed" ||
    item.status === "accepted" ||
    item.item_quote_status === "bevestigd"
  ) {
    return "bevestigd";
  }
  if (item.status === "pending") {
    // Pending = naar partner verstuurd of klaar daarvoor
    if (item.skip_partner_notification && !item.customer_approved_at && !item.customer_accepted_at) {
      // Nog niet vrijgegeven door klant
      if (project.quote_status === "offerte_verstuurd") return "wacht_klant";
      return "concept";
    }
    return "wacht_partner";
  }
  return "concept";
}

/**
 * Map a project + its items to one canonical project phase.
 */
export function getProjectPhase(
  project: ProjectForLifecycle,
  items: ItemForLifecycle[],
): ProjectPhase {
  if (project.status === "cancelled" || project.cancelled_at) return "geannuleerd";
  if (project.completion_status === "fully_invoiced" || project.completion_status === "completed") return "afgerond";
  if (
    project.completion_status === "ready_for_invoice" ||
    project.completion_status === "partially_invoiced"
  ) {
    return "facturatie";
  }

  // Item-derived state
  const itemPhases = items.map((i) => getItemPhase(i, project));
  const activePhases = itemPhases.filter((p) => p !== "geannuleerd");
  const allConfirmed =
    activePhases.length > 0 &&
    activePhases.every(
      (p) => p === "bevestigd" || p === "uitgevoerd" || p === "gefactureerd",
    );

  // If all confirmed and we are past customer-approval → uitvoering
  if (
    allConfirmed &&
    (project.quote_status === "akkoord_ontvangen" ||
      project.quote_status === "definitief_bevestigd" ||
      project.terms_accepted_at)
  ) {
    return "uitvoering";
  }

  // Customer approved-stage but missing voorwaarden / facturatie / logies?
  const customerApproved =
    project.quote_status === "akkoord_ontvangen" ||
    project.quote_status === "definitief_bevestigd";
  if (customerApproved) {
    const lodgingMissing =
      !!project.linked_accommodation_id && project.hasSelectedAccommodation === false;
    if (!project.terms_accepted_at || !project.billing_company_name || lodgingMissing) {
      return "klant_actie_voorwaarden";
    }
    // Anything still pending with a partner?
    const anyWaitingPartner = itemPhases.some((p) => p === "wacht_partner");
    if (anyWaitingPartner) return "partners_wachten";
    // Anything still ready to send out?
    const anyReady = itemPhases.some(
      (p) => p === "concept" || p === "tegenvoorstel_klant",
    );
    if (anyReady) return "partners_benaderen";
    return "uitvoering";
  }

  if (project.quote_status === "offerte_verstuurd") return "klant_actie_offerte";

  return "concept";
}

/**
 * Get the merged config (label + color + nextAction) for a project phase.
 */
export function getProjectPhaseInfo(
  project: ProjectForLifecycle,
  items: ItemForLifecycle[],
): { phase: ProjectPhase; config: LifecyclePhaseConfig } {
  const phase = getProjectPhase(project, items);
  return { phase, config: projectPhaseConfig[phase] };
}

/**
 * Get the merged config for a single item phase.
 */
export function getItemPhaseInfo(
  item: ItemForLifecycle,
  project: Pick<ProjectForLifecycle, "quote_status" | "cancelled_at">,
): { phase: ItemPhase; config: LifecyclePhaseConfig } {
  const phase = getItemPhase(item, project);
  return { phase, config: itemPhaseConfig[phase] };
}
