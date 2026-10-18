import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { reportError } from "@/lib/errorReporting";

export type ChargeStatus = "open" | "charged" | "kept_quote" | "skipped" | "legacy";

export interface PurchaseInvoiceLineRow {
  id: string;
  invoice_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  amount_excl_vat: number;
  vat_rate: number;
  vat_amount: number;
  amount_incl_vat: number;
  sort_order: number;
  item_id: string | null;
  charge_status: ChargeStatus;
  skip_reason: string | null;
  charged_at: string | null;
}

export const PURCHASE_INVOICE_LINES_KEY = "purchase-invoice-lines";

/** Alle orderregels van alle inkoopfacturen van een project. */
export function usePurchaseInvoiceLinesByRequest(requestId: string | null | undefined) {
  return useQuery({
    queryKey: [PURCHASE_INVOICE_LINES_KEY, requestId],
    enabled: !!requestId,
    queryFn: async (): Promise<PurchaseInvoiceLineRow[]> => {
      const { data, error } = await supabase
        .from("purchase_invoice_lines")
        .select("*, partner_purchase_invoices!inner(request_id)")
        .eq("partner_purchase_invoices.request_id", requestId!)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []).map((row) => {
        const { partner_purchase_invoices: _ignored, ...line } = row as typeof row & { partner_purchase_invoices: unknown };
        return line as unknown as PurchaseInvoiceLineRow;
      });
    },
  });
}

export type ChargeDecision =
  | { line_id: string; action: "item"; item_id: string }
  | { line_id: string; action: "new_cost"; cost_key: string; cost_name: string }
  | { line_id: string; action: "skip"; skip_reason: string | null }
  | { line_id: string; action: "open" };

export interface ApplyChargesResult {
  charged: number;
  kept: number;
  skipped: number;
  reopened: number;
  new_costs: number;
  new_cost_ids: Record<string, string>;
}

const invalidateAfterCharges = (queryClient: ReturnType<typeof useQueryClient>) => {
  queryClient.invalidateQueries({ queryKey: [PURCHASE_INVOICE_LINES_KEY] });
  queryClient.invalidateQueries({ queryKey: ["purchase-invoices"] });
  queryClient.invalidateQueries({ queryKey: ["commission-worklist"] });
  queryClient.invalidateQueries({ queryKey: ["purchase-invoice-consistency"] });
  queryClient.invalidateQueries({ queryKey: ["item-billing-lines"] });
};

/** De ene schrijfactie van het werkblad: besluiten per regel, in één transactie. */
export function useApplyPurchaseLineCharges(requestId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (decisions: ChargeDecision[]): Promise<ApplyChargesResult> => {
      const { data, error } = await supabase.rpc("apply_purchase_line_charges", {
        p_request_id: requestId,
        p_decisions: decisions as unknown as Parameters<typeof supabase.rpc>[1] extends infer A ? A extends { p_decisions: infer J } ? J : never : never,
      });
      if (error) throw error;
      return data as unknown as ApplyChargesResult;
    },
    onSuccess: () => invalidateAfterCharges(queryClient),
    onError: (error: Error) => {
      reportError(error, { where: "useApplyPurchaseLineCharges" });
      toast.error(error.message || "Doorbelasten mislukt");
    },
  });
}

/**
 * Orderregels maken voor een factuur die er geen heeft (partnerregistratie,
 * handmatige kop). Eén regel per verdeling, anders één regel uit de kop.
 */
export function useCreateLinesFromInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (invoice: {
      id: string;
      description: string | null;
      invoice_number: string;
      amount_excl_vat: number;
      vat_rate: number;
      vat_amount: number;
      amount_incl_vat: number;
      allocations?: Array<{ item_id: string; amount_excl_vat: number; program_request_item?: { block_name: string } | null }> | null;
    }) => {
      const rows: Array<{
        invoice_id: string;
        description: string;
        quantity: number;
        unit_price: number;
        amount_excl_vat: number;
        vat_rate: number;
        vat_amount: number;
        amount_incl_vat: number;
        sort_order: number;
        item_id: string | null;
        charge_status: ChargeStatus;
      }> = [];
      const allocations = invoice.allocations ?? [];
      if (allocations.length > 0) {
        const { data: allocRows, error } = await supabase
          .from("partner_purchase_invoice_allocations")
          .select("item_id, amount_excl_vat, vat_rate, vat_amount, amount_incl_vat, notes, sort_order")
          .eq("invoice_id", invoice.id)
          .order("sort_order");
        if (error) throw error;
        (allocRows ?? []).forEach((a, idx) => {
          const name = allocations.find((x) => x.item_id === a.item_id)?.program_request_item?.block_name;
          rows.push({
            invoice_id: invoice.id,
            description: a.notes || name || `Factuur ${invoice.invoice_number}`,
            quantity: 1,
            unit_price: Number(a.amount_excl_vat),
            amount_excl_vat: Number(a.amount_excl_vat),
            vat_rate: Number(a.vat_rate),
            vat_amount: Number(a.vat_amount),
            amount_incl_vat: Number(a.amount_incl_vat),
            sort_order: idx,
            // De verdeling bestaat al; de regel krijgt die bestemming mee en
            // staat als 'legacy' tot de admin hem in het werkblad opnieuw verdeelt.
            item_id: a.item_id,
            charge_status: "legacy",
          });
        });
      } else {
        rows.push({
          invoice_id: invoice.id,
          description: invoice.description?.trim() || `Factuur ${invoice.invoice_number}`,
          quantity: 1,
          unit_price: Number(invoice.amount_excl_vat),
          amount_excl_vat: Number(invoice.amount_excl_vat),
          vat_rate: Number(invoice.vat_rate),
          vat_amount: Number(invoice.vat_amount),
          amount_incl_vat: Number(invoice.amount_incl_vat),
          sort_order: 0,
          item_id: null,
          charge_status: "open",
        });
      }
      const { error: insertError } = await supabase.from("purchase_invoice_lines").insert(rows);
      if (insertError) throw insertError;
      return rows.length;
    },
    onSuccess: (count) => {
      invalidateAfterCharges(queryClient);
      toast.success(`${count} ${count === 1 ? "orderregel" : "orderregels"} aangemaakt`);
    },
    onError: (error: Error) => {
      reportError(error, { where: "useCreateLinesFromInvoice" });
      toast.error(error.message || "Orderregels aanmaken mislukt");
    },
  });
}
