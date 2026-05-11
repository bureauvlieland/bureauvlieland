/**
 * Project-overlay: brengt programma-spoor + logies-spoor onder één
 * "Project"-begrip samen voor de Werkbank.
 *
 * Anker = `program_requests.id`. Elke logies-aanvraag heeft via de bestaande
 * `create_program_for_accommodation`-trigger al een gekoppeld
 * `program_request`, dus elk dossier heeft altijd een program-anker.
 */

import { supabase } from "@/integrations/supabase/client";
import {
  getProjectPipelineStage,
  type ProjectPipelineStage,
} from "./projectWorkflow";
import {
  combineCommunicationStates,
  getLodgingCommunicationState,
  getProgramCommunicationState,
  type ProjectCommunicationState,
} from "./projectCommunication";

export type ProjectKind = "combi" | "programma_only" | "logies_only";

export interface ProjectSummary {
  id: string;                       // = program_request.id
  reference: string;
  kind: ProjectKind;
  customer: {
    name: string;
    email: string;
    phone: string | null;
    company: string | null;
  };
  dates: string[];                   // ISO date strings
  numberOfPeople: number;

  pipeline: ProjectPipelineStage;
  programPipeline: ProjectPipelineStage;
  lodgingPipeline: ProjectPipelineStage | null;

  comm: ProjectCommunicationState;
  programComm: ProjectCommunicationState;
  lodgingComm: ProjectCommunicationState | null;

  hasProgram: boolean;
  hasLodging: boolean;

  updatedAt: string;
}

/**
 * Haal alle projecten op voor de Werkbank, samengevoegd over programma + logies.
 * Houdt het bewust eenvoudig: één query op program_requests, joint accommodation_requests via linked id.
 */
export async function listProjectsForWerkbank(opts: {
  includeFinished?: boolean;
  archiveOnly?: boolean;
} = {}): Promise<ProjectSummary[]> {
  const { includeFinished = false, archiveOnly = false } = opts;

  let query = supabase
    .from("program_requests")
    .select(`
      id, reference_number, customer_name, customer_email, customer_phone, customer_company,
      number_of_people, selected_dates, status, quote_status, terms_accepted_at,
      completion_status, cancelled_at, updated_at, linked_accommodation_id,
      program_request_items(id, status, skip_partner_notification, customer_approved_at, provider_id, block_type, day_index, item_quote_status, updated_at)
    `)
    .order("updated_at", { ascending: false })
    .limit(500);
  if (archiveOnly) {
    // Archief = expliciet geannuleerd of verwijderd
    query = query.or("status.in.(cancelled,deleted),cancelled_at.not.is.null");
  } else if (!includeFinished) {
    // Standaard werklijst: verberg geannuleerd én verwijderd
    query = query
      .not("status", "in", "(cancelled,deleted)")
      .is("cancelled_at", null);
  }
  const { data: programs, error: progErr } = await query;
  if (progErr) throw progErr;

  const lodgingIds = (programs ?? [])
    .map((p) => p.linked_accommodation_id)
    .filter((x): x is string => !!x);

  const { data: lodgings, error: lodgErr } = lodgingIds.length
    ? await supabase
        .from("accommodation_requests")
        .select(`
          id, reference_number, status, completion_status, updated_at,
          linked_program_id,
          accommodation_quotes(id, status, updated_at)
        `)
        .in("id", lodgingIds)
    : { data: [], error: null };
  if (lodgErr) throw lodgErr;

  const lodgingByProgramId = new Map<string, typeof lodgings[number]>();
  for (const l of lodgings ?? []) {
    if (l.linked_program_id) lodgingByProgramId.set(l.linked_program_id, l);
  }

  const summaries: ProjectSummary[] = (programs ?? []).map((p) => {
    const items = (p as any).program_request_items ?? [];
    const lodging = lodgingByProgramId.get(p.id) ?? null;
    const lodgingQuotes = (lodging as any)?.accommodation_quotes ?? [];

    const hasProgram = items.length > 0;
    const hasLodging = !!lodging;

    let kind: ProjectKind = "programma_only";
    if (hasProgram && hasLodging) kind = "combi";
    else if (!hasProgram && hasLodging) kind = "logies_only";

    // Pipeline
    const programPipeline = getProjectPipelineStage(p as any);
    const lodgingPipeline = lodging
      ? getProjectPipelineStage({
          status: (lodging as any).status,
          completion_status: (lodging as any).completion_status,
        })
      : null;

    // Communicatie-status (vereenvoudigd voor lijst-view)
    const itemsReadyForPartner = items.filter(
      (i: any) =>
        i.skip_partner_notification === true &&
        i.status !== "cancelled" &&
        (p.quote_status === "akkoord_ontvangen" || i.customer_approved_at),
    ).length;
    const itemsAwaitingPartnerResponse = items.filter(
      (i: any) =>
        i.skip_partner_notification === false &&
        i.status !== "cancelled" &&
        i.item_quote_status !== "bevestigd",
    ).length;

    const programComm = getProgramCommunicationState({
      pipeline: programPipeline,
      quote_status: p.quote_status,
      last_outbound_at: p.updated_at,
      itemsReadyForPartner,
      itemsAwaitingPartnerResponse,
    });

    const lodgingComm = lodging
      ? getLodgingCommunicationState({
          hasRequest: true,
          quotesPending: lodgingQuotes.filter((q: any) => q.status === "pending").length,
          quotesAwaitingCustomerChoice: lodgingQuotes.filter((q: any) => q.status === "submitted").length,
          quoteSelected: lodgingQuotes.some((q: any) => q.status === "selected"),
          last_outbound_at: (lodging as any).updated_at,
        })
      : null;

    const comm = combineCommunicationStates(
      [programComm, lodgingComm].filter((x): x is ProjectCommunicationState => !!x),
    );

    const overallPipeline: ProjectPipelineStage = (() => {
      if (programPipeline === "geannuleerd" && (!lodgingPipeline || lodgingPipeline === "geannuleerd"))
        return "geannuleerd";
      if (programPipeline === "afgerond" && (!lodgingPipeline || lodgingPipeline === "afgerond"))
        return "afgerond";
      // meest urgente (vroegste in de funnel) telt
      const order: ProjectPipelineStage[] = [
        "concept", "offerte_verstuurd", "akkoord_ontvangen",
        "av_getekend", "facturatie", "afgerond", "geannuleerd",
      ];
      const stages = [programPipeline, lodgingPipeline].filter(Boolean) as ProjectPipelineStage[];
      return stages.sort((a, b) => order.indexOf(a) - order.indexOf(b))[0] ?? "concept";
    })();

    const reference =
      kind === "logies_only" && (lodging as any)?.reference_number
        ? (lodging as any).reference_number
        : p.reference_number ?? p.id.slice(0, 8);

    return {
      id: p.id,
      reference,
      kind,
      customer: {
        name: p.customer_name,
        email: p.customer_email,
        phone: p.customer_phone,
        company: p.customer_company,
      },
      dates: Array.isArray(p.selected_dates)
        ? (p.selected_dates as any[]).map(String)
        : [],
      numberOfPeople: p.number_of_people ?? 0,
      pipeline: overallPipeline,
      programPipeline,
      lodgingPipeline,
      comm,
      programComm,
      lodgingComm,
      hasProgram,
      hasLodging,
      updatedAt: p.updated_at,
    };
  });

  if (includeFinished) return summaries;
  return summaries.filter((s) => s.pipeline !== "afgerond" && s.pipeline !== "geannuleerd");
}
