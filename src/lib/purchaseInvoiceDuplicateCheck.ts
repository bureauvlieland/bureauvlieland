import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { reportError } from "@/lib/errorReporting";
import {
  findItemsAlreadyInvoiced,
  findLikelyDuplicate,
  normalizeInvoiceNumber as normalizeInvoiceNumberRule,
  type DuplicateMatch,
  type ItemInvoiceLink,
} from "@/lib/purchaseInvoiceDuplicateRules";

export interface DuplicatePurchaseInvoice {
  id: string;
  invoice_number: string;
  invoice_date: string;
  amount_incl_vat: number | null;
  amount_excl_vat: number;
  partner_id: string;
  request_id: string | null;
  status: string;
  is_collective: boolean | null;
  created_at: string;
}

/**
 * Normalize an invoice number for duplicate comparison.
 * Strips whitespace, dashes/dots and uppercases — so "F-2026-001" == "f2026.001".
 */
export function normalizeInvoiceNumber(value: string | null | undefined): string {
  return normalizeInvoiceNumberRule(value);
}

/**
 * Check whether an invoice with the same (partner_id, invoice_number) already exists.
 * Used to warn admins and block partners from registering the same purchase invoice twice.
 */
export async function findDuplicatePurchaseInvoice(
  partnerId: string,
  invoiceNumber: string,
  options?: { excludeId?: string },
): Promise<DuplicatePurchaseInvoice | null> {
  const normalized = normalizeInvoiceNumber(invoiceNumber);
  if (!partnerId || !normalized) return null;

  // Pull candidates by partner and do exact normalized compare client-side
  // (Postgres has no normalized column; partner volume is small enough).
  let q = supabase
    .from("partner_purchase_invoices")
    .select(
      "id, invoice_number, invoice_date, amount_incl_vat, amount_excl_vat, partner_id, request_id, status, is_collective, created_at",
    )
    .eq("partner_id", partnerId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (options?.excludeId) q = q.neq("id", options.excludeId);

  const { data, error } = await q;
  if (error) {
    reportError(error, { where: "purchaseInvoiceDuplicateCheck: Duplicate purchase invoice check failed" });
    return null;
  }

  const match = (data || []).find(
    (row) => normalizeInvoiceNumber(row.invoice_number) === normalized,
  );
  return (match as DuplicatePurchaseInvoice) || null;
}

export function useDuplicatePurchaseInvoiceCheck(
  partnerId: string | null | undefined,
  invoiceNumber: string | null | undefined,
  options?: { enabled?: boolean; excludeId?: string },
) {
  const normalized = normalizeInvoiceNumber(invoiceNumber);
  const enabled = (options?.enabled ?? true) && !!partnerId && normalized.length >= 2;
  return useQuery({
    queryKey: ["purchase-invoice-duplicate", partnerId, normalized, options?.excludeId],
    queryFn: () => findDuplicatePurchaseInvoice(partnerId!, invoiceNumber!, { excludeId: options?.excludeId }),
    enabled,
    staleTime: 30_000,
  });
}

export interface LikelyDuplicateProbe {
  partnerId: string | null | undefined;
  invoiceNumber?: string | null;
  invoiceDate?: string | null;
  amountInclVat?: number | null;
  requestId?: string | null;
  excludeId?: string;
}

/**
 * Zoek een waarschijnlijke dubbele registratie bij dezelfde partner: op
 * nummer, of op bedrag + project/datum. Zo vangen we ook de factuur die de
 * partner onder ons projectnummer registreerde en die later met het echte
 * nummer uit de inbox komt.
 */
export async function findLikelyDuplicatePurchaseInvoice(
  probe: LikelyDuplicateProbe,
): Promise<DuplicateMatch<DuplicatePurchaseInvoice> | null> {
  if (!probe.partnerId) return null;
  const hasNumber = normalizeInvoiceNumber(probe.invoiceNumber).length >= 2;
  const hasAmount = Number(probe.amountInclVat) > 0;
  if (!hasNumber && !hasAmount) return null;

  const { data, error } = await supabase
    .from("partner_purchase_invoices")
    .select(
      "id, invoice_number, invoice_date, amount_incl_vat, amount_excl_vat, partner_id, request_id, status, is_collective, created_at",
    )
    .eq("partner_id", probe.partnerId)
    .is("refund_pending_at", null)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) {
    reportError(error, { where: "purchaseInvoiceDuplicateCheck: Likely duplicate check failed" });
    return null;
  }
  return findLikelyDuplicate(
    {
      invoice_number: probe.invoiceNumber ?? null,
      invoice_date: probe.invoiceDate ?? null,
      amount_incl_vat: hasAmount ? Number(probe.amountInclVat) : null,
      request_id: probe.requestId ?? null,
    },
    (data || []) as DuplicatePurchaseInvoice[],
    { excludeId: probe.excludeId },
  );
}

export function useLikelyDuplicatePurchaseInvoice(
  probe: LikelyDuplicateProbe,
  options?: { enabled?: boolean },
) {
  const normalized = normalizeInvoiceNumber(probe.invoiceNumber);
  const amount = Number(probe.amountInclVat) > 0 ? Number(probe.amountInclVat).toFixed(2) : "";
  const enabled = (options?.enabled ?? true) && !!probe.partnerId && (normalized.length >= 2 || !!amount);
  return useQuery({
    queryKey: [
      "purchase-invoice-likely-duplicate",
      probe.partnerId,
      normalized,
      amount,
      probe.invoiceDate ?? "",
      probe.requestId ?? "",
      probe.excludeId ?? "",
    ],
    queryFn: () => findLikelyDuplicatePurchaseInvoice(probe),
    enabled,
    staleTime: 30_000,
  });
}

/**
 * Welke van deze programma-onderdelen hebben al een inkoopfactuur van deze
 * partner (direct gekoppeld of via een verdeling)? Een tweede factuur op
 * hetzelfde onderdeel is bijna altijd dezelfde factuur nog een keer.
 */
export async function findItemsWithExistingPurchaseInvoice(
  partnerId: string | null | undefined,
  itemIds: string[],
  options?: { excludeInvoiceId?: string },
): Promise<Map<string, ItemInvoiceLink>> {
  const ids = Array.from(new Set(itemIds.filter(Boolean)));
  if (!partnerId || ids.length === 0) return new Map();

  const [direct, allocated] = await Promise.all([
    supabase
      .from("partner_purchase_invoices")
      .select("id, item_id, invoice_number")
      .eq("partner_id", partnerId)
      .is("refund_pending_at", null)
      .in("item_id", ids),
    supabase
      .from("partner_purchase_invoice_allocations")
      .select("item_id, invoice:partner_purchase_invoices!inner(id, invoice_number, partner_id, refund_pending_at)")
      .eq("invoice.partner_id", partnerId)
      .in("item_id", ids),
  ]);
  if (direct.error) reportError(direct.error, { where: "purchaseInvoiceDuplicateCheck: item check (direct) failed" });
  if (allocated.error) reportError(allocated.error, { where: "purchaseInvoiceDuplicateCheck: item check (allocations) failed" });

  const links: ItemInvoiceLink[] = [];
  for (const row of (direct.data || []) as Array<{ id: string; item_id: string | null; invoice_number: string | null }>) {
    links.push({ item_id: row.item_id, invoice_id: row.id, invoice_number: row.invoice_number });
  }
  for (const row of (allocated.data || []) as unknown as Array<{
    item_id: string | null;
    invoice: { id: string; invoice_number: string | null; refund_pending_at: string | null } | null;
  }>) {
    if (!row.invoice || row.invoice.refund_pending_at) continue;
    links.push({ item_id: row.item_id, invoice_id: row.invoice.id, invoice_number: row.invoice.invoice_number });
  }
  const filtered = options?.excludeInvoiceId
    ? links.filter((l) => l.invoice_id !== options.excludeInvoiceId)
    : links;
  return findItemsAlreadyInvoiced(ids, filtered);
}

export function useItemsWithExistingPurchaseInvoice(
  partnerId: string | null | undefined,
  itemIds: string[],
  options?: { enabled?: boolean; excludeInvoiceId?: string },
) {
  const ids = Array.from(new Set(itemIds.filter(Boolean))).sort();
  const enabled = (options?.enabled ?? true) && !!partnerId && ids.length > 0;
  return useQuery({
    queryKey: ["purchase-invoice-items-invoiced", partnerId, ids.join(","), options?.excludeInvoiceId ?? ""],
    queryFn: () => findItemsWithExistingPurchaseInvoice(partnerId, ids, { excludeInvoiceId: options?.excludeInvoiceId }),
    enabled,
    staleTime: 30_000,
  });
}
