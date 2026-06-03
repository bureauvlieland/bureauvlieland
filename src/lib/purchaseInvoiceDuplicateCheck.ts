import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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
  return (value || "").replace(/[\s\-_.]/g, "").toUpperCase();
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
    console.error("Duplicate purchase invoice check failed:", error);
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
