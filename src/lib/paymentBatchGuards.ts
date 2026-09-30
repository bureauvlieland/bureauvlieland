// Geen supabase-import, zodat dit in node/vitest zonder JSDOM laadt.
import {
  findDuplicateGroupsInSelection,
  normalizeInvoiceNumber,
  type DuplicateReason,
} from "@/lib/purchaseInvoiceDuplicateRules";

export interface BatchCandidate {
  id: string;
  invoice_number: string | null;
  amount_incl_vat: number | null;
  invoice_date: string | null;
  request_id?: string | null;
  partners?: { id?: string; name?: string | null } | null;
  partner_id?: string | null;
}

export interface BatchDuplicateGroup {
  partnerId: string;
  partnerName: string;
  /** "number": zelfde factuurnummer; "amount": zelfde bedrag op hetzelfde project of rond dezelfde datum. */
  reason: DuplicateReason;
  invoiceNumber: string;
  normalized: string;
  ids: string[];
}

/**
 * Waarschijnlijke dubbelen in een batch-selectie: eerst op (partner + genormaliseerd
 * nummer), daarna op (partner + bedrag + project/datum). Die tweede regel bestaat
 * omdat één factuur in juli 2026 onder twee nummers is uitbetaald.
 * Per groep één melding, zodat de knop geblokkeerd kan worden.
 */
export function findDuplicatesInSelection(rows: BatchCandidate[]): BatchDuplicateGroup[] {
  const selection = rows
    .map((row) => ({
      id: row.id,
      partner_id: row.partners?.id ?? row.partner_id ?? "",
      partner_name: row.partners?.name ?? "",
      invoice_number: row.invoice_number,
      invoice_date: row.invoice_date,
      amount_incl_vat: row.amount_incl_vat,
      request_id: row.request_id ?? null,
    }))
    .filter((row) => !!row.partner_id);

  return findDuplicateGroupsInSelection(selection).map((group) => ({
    partnerId: group.partnerId,
    partnerName: group.rows.find((r) => r.partner_name)?.partner_name ?? "",
    reason: group.reason,
    invoiceNumber: group.rows.map((r) => r.invoice_number ?? "").filter(Boolean).join(" / "),
    normalized: group.reason === "number" ? normalizeInvoiceNumber(group.rows[0].invoice_number) : "",
    ids: group.rows.map((r) => r.id),
  }));
}

/**
 * Statusovergangen rond betaalbatches.
 * Een factuur die in een gegenereerde batch zit is betaald: het SEPA-bestand
 * is aangemaakt en wordt bij de bank ingediend. Wordt de batch geannuleerd,
 * dan draaien we die markering terug naar 'doorgestuurd'.
 */
export interface BatchInvoiceStateInput {
  status: string | null;
  paid_at: string | null;
  payment_batch_id: string | null;
}

/** Payload om een factuur bij batch-generatie als betaald te markeren. */
export function buildBatchPaidUpdate(batchId: string, paidAtIso: string) {
  return {
    payment_batch_id: batchId,
    status: "paid" as const,
    paid_at: paidAtIso,
    updated_at: paidAtIso,
  };
}

/** Payload om de betaalmarkering terug te draaien bij annulering van een batch. */
export function buildBatchCancelUpdate(nowIso: string) {
  return {
    payment_batch_id: null,
    status: "forwarded" as const,
    paid_at: null,
    updated_at: nowIso,
  };
}

/** Is deze factuur betaald doordat hij in een batch is opgenomen? */
export function isPaidViaBatch(inv: BatchInvoiceStateInput): boolean {
  return inv.status === "paid" && !!inv.payment_batch_id;
}
