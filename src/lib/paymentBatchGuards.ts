// Kept dependency-free (no supabase client import) so it loads in node/vitest without JSDOM.
function normalizeInvoiceNumber(value: string | null | undefined): string {
  return (value || "").replace(/[\s\-_.]/g, "").toUpperCase();
}

export interface BatchCandidate {
  id: string;
  invoice_number: string | null;
  amount_incl_vat: number | null;
  invoice_date: string | null;
  partners?: { id?: string; name?: string | null } | null;
  partner_id?: string | null;
}

export interface BatchDuplicateGroup {
  partnerId: string;
  partnerName: string;
  invoiceNumber: string;
  normalized: string;
  ids: string[];
}

/**
 * Detect (partner_id + normalized invoice_number) duplicates in a batch selection.
 * Returns one group per duplicate so callers can show a targeted warning and disable submission.
 */
export function findDuplicatesInSelection(rows: BatchCandidate[]): BatchDuplicateGroup[] {
  const buckets = new Map<string, BatchDuplicateGroup>();
  for (const row of rows) {
    const partnerId = row.partners?.id ?? row.partner_id ?? "";
    const normalized = normalizeInvoiceNumber(row.invoice_number);
    if (!partnerId || !normalized) continue;
    const key = `${partnerId}::${normalized}`;
    const existing = buckets.get(key);
    if (existing) {
      existing.ids.push(row.id);
    } else {
      buckets.set(key, {
        partnerId,
        partnerName: row.partners?.name ?? "",
        invoiceNumber: row.invoice_number ?? "",
        normalized,
        ids: [row.id],
      });
    }
  }
  return Array.from(buckets.values()).filter((g) => g.ids.length > 1);
}

/**
 * Softer heuristic: same partner + same (rounded) amount + same date but a different
 * invoice number. Catches typos where partner accidentally invoiced twice under two nrs.
 */
export function findAmountDateCollisions(rows: BatchCandidate[]): BatchDuplicateGroup[] {
  const buckets = new Map<string, BatchDuplicateGroup>();
  for (const row of rows) {
    const partnerId = row.partners?.id ?? row.partner_id ?? "";
    const amount = Number(row.amount_incl_vat || 0);
    const date = row.invoice_date || "";
    if (!partnerId || !amount || !date) continue;
    const key = `${partnerId}::${amount.toFixed(2)}::${date}`;
    const existing = buckets.get(key);
    if (existing) {
      existing.ids.push(row.id);
    } else {
      buckets.set(key, {
        partnerId,
        partnerName: row.partners?.name ?? "",
        invoiceNumber: row.invoice_number ?? "",
        normalized: "",
        ids: [row.id],
      });
    }
  }
  return Array.from(buckets.values()).filter((g) => g.ids.length > 1);
}
