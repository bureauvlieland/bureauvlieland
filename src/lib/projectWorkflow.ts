/**
 * Centralized project workflow helpers.
 * Single source of truth for project pipeline stages and item send phases.
 */

// ── Project pipeline ──────────────────────────────────────────────────

export type ProjectPipelineStage =
  | "concept"
  | "offerte_verstuurd"
  | "akkoord_ontvangen"
  | "av_getekend"
  | "facturatie"
  | "afgerond"
  | "geannuleerd";

export interface ProjectForPipeline {
  status?: string;
  quote_status?: string | null;
  terms_accepted_at?: string | null;
  completion_status?: string | null;
  cancelled_at?: string | null;
}

export function getProjectPipelineStage(project: ProjectForPipeline): ProjectPipelineStage {
  if (project.status === "cancelled" || project.cancelled_at) return "geannuleerd";
  if (project.completion_status === "fully_invoiced") return "afgerond";
  if (project.completion_status === "ready_for_invoice" || project.completion_status === "partially_invoiced") return "facturatie";
  if (project.terms_accepted_at) return "av_getekend";
  if (project.quote_status === "akkoord_ontvangen" || project.quote_status === "definitief_bevestigd") return "akkoord_ontvangen";
  if (project.quote_status === "offerte_verstuurd") return "offerte_verstuurd";
  return "concept";
}

// ── Item send phase ───────────────────────────────────────────────────

export type ItemSendPhase =
  | "wacht_op_klant"        // offerte sent, customer hasn't approved yet
  | "klaar_voor_partner"    // ready to send to external partner
  | "verstuurd"             // already sent to partner
  | "niet_van_toepassing";  // cancelled or no action needed

export interface ItemForSendPhase {
  status: string;
  skip_partner_notification: boolean | null;
  customer_approved_at?: string | null;
  provider_id?: string | null;
  block_type?: string | null;
}

export interface ProjectForItemPhase {
  quote_status?: string | null;
}

/** @deprecated Bureau items now follow the same workflow as partner items */
export function isBureauItem(item: Pick<ItemForSendPhase, "provider_id">): boolean {
  return item.provider_id === "bureau";
}

/** Get the send phase for a single item in the context of a project */
export function getItemSendPhase(
  item: ItemForSendPhase,
  project: ProjectForItemPhase,
): ItemSendPhase {
  if (item.status === "cancelled") return "niet_van_toepassing";

  // Already sent to partner (or bureau)
  if (!item.skip_partner_notification) return "verstuurd";

  // Item explicitly approved by customer → ready to send
  if (item.customer_approved_at) return "klaar_voor_partner";

  // If overall quote approved → all items ready to send
  const overallApproved = project.quote_status === "akkoord_ontvangen"
    || project.quote_status === "definitief_bevestigd";
  if (overallApproved) return "klaar_voor_partner";

  // If quote sent to customer → waiting for approval
  if (project.quote_status === "offerte_verstuurd") return "wacht_op_klant";

  // Concept phase — items are ready to send (admin decides)
  return "klaar_voor_partner";
}

// ── Counting helpers ──────────────────────────────────────────────────

export interface ItemCounts {
  readyForPartner: number;
  waitingForCustomer: number;
  alreadySent: number;
}

export function getItemSendCounts(
  items: ItemForSendPhase[],
  project: ProjectForItemPhase,
): ItemCounts {
  const counts: ItemCounts = {
    readyForPartner: 0,
    waitingForCustomer: 0,
    bureauIntern: 0,
    alreadySent: 0,
  };

  for (const item of items) {
    const phase = getItemSendPhase(item, project);
    switch (phase) {
      case "klaar_voor_partner":
        counts.readyForPartner++;
        break;
      case "wacht_op_klant":
        counts.waitingForCustomer++;
        break;
      case "bureau_intern":
        counts.bureauIntern++;
        break;
      case "verstuurd":
        counts.alreadySent++;
        break;
    }
  }

  return counts;
}
