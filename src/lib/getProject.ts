/**
 * Project-overlay: brengt programma-spoor + logies-spoor onder één
 * "Project"-begrip samen voor de Werkbank.
 *
 * Anker = `program_requests.id`. Elke logies-aanvraag heeft via de bestaande
 * `create_program_for_accommodation`-trigger al een gekoppeld
 * `program_request`, dus elk dossier heeft altijd een program-anker.
 */

import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import {
  getProjectPipelineStage,
  type ProjectPipelineStage,
} from "./projectWorkflow";
import {
  combineCommunicationStates,
  getBureauActionHints,
  getLodgingCommunicationState,
  getProgramCommunicationState,
  type ProjectCommunicationState,
} from "./projectCommunication";

export type ProjectKind = "combi" | "programma_only" | "logies_only";

// Rij-vormen die we daadwerkelijk uit Supabase plukken (Pick op gegenereerde DB-types).
// Zo vangt tsc kolomnaam-fouten direct (zoals destijds met `room_summary`).
type ProgramItemRow = Pick<
  Tables<"program_request_items">,
  | "id"
  | "status"
  | "skip_partner_notification"
  | "customer_approved_at"
  | "provider_id"
  | "block_type"
  | "day_index"
  | "item_quote_status"
  | "updated_at"
>;

type ProgramRow = Pick<
  Tables<"program_requests">,
  | "id"
  | "reference_number"
  | "customer_name"
  | "customer_email"
  | "customer_phone"
  | "customer_company"
  | "number_of_people"
  | "selected_dates"
  | "status"
  | "quote_status"
  | "terms_accepted_at"
  | "completion_status"
  | "cancelled_at"
  | "updated_at"
  | "linked_accommodation_id"
> & {
  program_request_items: ProgramItemRow[] | null;
};

type LodgingQuoteRow = Pick<
  Tables<"accommodation_quotes">,
  "id" | "status" | "updated_at"
>;

type LodgingRow = Pick<
  Tables<"accommodation_requests">,
  "id" | "reference_number" | "status" | "completion_status" | "updated_at" | "linked_program_id"
> & {
  accommodation_quotes: LodgingQuoteRow[] | null;
};

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

  /** Concrete actie-hints wanneer comm = "bij_bureau". Leeg array anders. */
  bureauActionHints: string[];

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
    // Archief = geannuleerd, verwijderd, of volledig afgerond/gefactureerd
    query = query.or(
      "status.in.(cancelled,deleted),cancelled_at.not.is.null,completion_status.in.(fully_invoiced,completed)"
    );
  } else if (!includeFinished) {
    // Standaard werklijst: verberg geannuleerd, verwijderd én volledig afgerond
    query = query
      .not("status", "in", "(cancelled,deleted)")
      .is("cancelled_at", null)
      .not("completion_status", "in", "(fully_invoiced,completed)");
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

  const lodgingByProgramId = new Map<string, LodgingRow>();
  for (const l of (lodgings ?? []) as LodgingRow[]) {
    if (l.linked_program_id) lodgingByProgramId.set(l.linked_program_id, l);
  }

  // Echte "laatste uitgaande mail" per request — proxy voor last_outbound_at.
  // email_log bevat alleen verzonden transactionele mails (inbound loopt via een
  // ander spoor). We pakken het meest recente created_at per request_id /
  // accommodation_request_id en gebruiken dat als anker voor de stilte-detectie.
  const programIds = (programs ?? []).map((p) => p.id);
  const lastProgramMailAt = new Map<string, string>();
  const lastLodgingMailAt = new Map<string, string>();
  if (programIds.length || lodgingIds.length) {
    const filters = [
      programIds.length ? `related_request_id.in.(${programIds.join(",")})` : null,
      lodgingIds.length ? `related_accommodation_id.in.(${lodgingIds.join(",")})` : null,
    ].filter(Boolean) as string[];
    const { data: mails } = await supabase
      .from("email_log")
      .select("related_request_id, related_accommodation_id, created_at")
      .or(filters.join(","))
      .order("created_at", { ascending: false })
      .limit(2000);
    for (const m of mails ?? []) {
      if (m.related_request_id && !lastProgramMailAt.has(m.related_request_id)) {
        lastProgramMailAt.set(m.related_request_id, m.created_at);
      }
      if (m.related_accommodation_id && !lastLodgingMailAt.has(m.related_accommodation_id)) {
        lastLodgingMailAt.set(m.related_accommodation_id, m.created_at);
      }
    }
  }

  const summaries: ProjectSummary[] = ((programs ?? []) as ProgramRow[]).map((p) => {
    const items: ProgramItemRow[] = p.program_request_items ?? [];
    const lodging = lodgingByProgramId.get(p.id) ?? null;
    const lodgingQuotes: LodgingQuoteRow[] = lodging?.accommodation_quotes ?? [];

    const hasProgram = items.length > 0;
    const hasLodging = !!lodging;

    let kind: ProjectKind = "programma_only";
    if (hasProgram && hasLodging) kind = "combi";
    else if (!hasProgram && hasLodging) kind = "logies_only";

    // Pipeline
    const programPipeline = getProjectPipelineStage({
      status: p.status ?? undefined,
      quote_status: p.quote_status,
      terms_accepted_at: p.terms_accepted_at,
      completion_status: p.completion_status,
      cancelled_at: p.cancelled_at,
    });
    const lodgingPipeline = lodging
      ? getProjectPipelineStage({
          status: lodging.status ?? undefined,
          completion_status: lodging.completion_status,
        })
      : null;

    // Communicatie-status (vereenvoudigd voor lijst-view)
    const itemsReadyForPartner = items.filter(
      (i) =>
        i.skip_partner_notification === true &&
        i.status !== "cancelled" &&
        (p.quote_status === "akkoord_ontvangen" || !!i.customer_approved_at),
    ).length;
    const itemsAwaitingPartnerResponse = items.filter(
      (i) =>
        i.skip_partner_notification === false &&
        i.status !== "cancelled" &&
        i.item_quote_status !== "bevestigd",
    ).length;

    const programComm = getProgramCommunicationState({
      pipeline: programPipeline,
      quote_status: p.quote_status,
      last_outbound_at: lastProgramMailAt.get(p.id) ?? p.updated_at,
      itemsReadyForPartner,
      itemsAwaitingPartnerResponse,
    });

    const lodgingComm = lodging
      ? getLodgingCommunicationState({
          hasRequest: true,
          quotesPending: lodgingQuotes.filter((q) => q.status === "pending").length,
          quotesAwaitingCustomerChoice: lodgingQuotes.filter((q) => q.status === "submitted").length,
          quoteSelected: lodgingQuotes.some((q) => q.status === "selected"),
          last_outbound_at: lastLodgingMailAt.get(lodging.id) ?? lodging.updated_at,
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
      const order: ProjectPipelineStage[] = [
        "concept", "offerte_verstuurd", "akkoord_ontvangen",
        "av_getekend", "facturatie", "afgerond", "geannuleerd",
      ];
      const stages = [programPipeline, lodgingPipeline].filter(Boolean) as ProjectPipelineStage[];
      return stages.sort((a, b) => order.indexOf(a) - order.indexOf(b))[0] ?? "concept";
    })();

    const reference =
      kind === "logies_only" && lodging?.reference_number
        ? lodging.reference_number
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
        ? (p.selected_dates as unknown[]).map(String)
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
      bureauActionHints:
        comm === "bij_bureau"
          ? getBureauActionHints({
              program: {
                pipeline: programPipeline,
                quote_status: p.quote_status,
                last_outbound_at: lastProgramMailAt.get(p.id) ?? p.updated_at,
                itemsReadyForPartner,
                itemsAwaitingPartnerResponse,
              },
              lodging: lodging
                ? {
                    hasRequest: true,
                    quotesPending: lodgingQuotes.filter((q) => q.status === "pending").length,
                    quotesAwaitingCustomerChoice: lodgingQuotes.filter((q) => q.status === "submitted").length,
                    quoteSelected: lodgingQuotes.some((q) => q.status === "selected"),
                    last_outbound_at: lastLodgingMailAt.get(lodging.id) ?? lodging.updated_at,
                  }
                : null,
            })
          : [],
      updatedAt: p.updated_at,
    };
  });

  if (archiveOnly) return summaries;
  if (includeFinished) return summaries;
  // Werklijst: geannuleerde én volledig afgeronde projecten horen in het archief.
  return summaries.filter((s) => s.pipeline !== "geannuleerd" && s.pipeline !== "afgerond");
}
