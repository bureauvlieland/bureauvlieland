import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { reportError } from "@/lib/errorReporting";
import { PURCHASE_INVOICE_LINES_KEY } from "@/hooks/usePurchaseInvoiceLines";
import type { ProformaChange } from "@/lib/proformaWorksheet";
import { computeBillingLineAmounts } from "@/types/programItemBillingLine";

export interface ApplyProformaResult {
  replaced: number;
  added: number;
  reverted: number;
  hidden: number;
  unhidden: number;
  kept: number;
  reopened: number;
}

const invalidate = (queryClient: ReturnType<typeof useQueryClient>) => {
  queryClient.invalidateQueries({ queryKey: [PURCHASE_INVOICE_LINES_KEY] });
  queryClient.invalidateQueries({ queryKey: ["purchase-invoices"] });
  queryClient.invalidateQueries({ queryKey: ["commission-worklist"] });
  queryClient.invalidateQueries({ queryKey: ["purchase-invoice-consistency"] });
};

/** De ene schrijfactie van het werkblad op de proforma (`apply_proforma_changes`), in één transactie. */
export function useApplyProformaChanges(requestId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (changes: ProformaChange[]): Promise<ApplyProformaResult> => {
      const { data, error } = await supabase.rpc("apply_proforma_changes", {
        p_request_id: requestId,
        p_changes: changes as unknown as Parameters<typeof supabase.rpc>[1] extends infer A ? A extends { p_changes: infer J } ? J : never : never,
      });
      if (error) throw error;
      return data as unknown as ApplyProformaResult;
    },
    onSuccess: () => invalidate(queryClient),
    onError: (error: Error) => {
      reportError(error, { where: "useApplyProformaChanges" });
      toast.error(error.message || "Proforma bijwerken mislukt");
    },
  });
}

export interface ManualLineInput {
  description: string;
  quantity: number;
  unit_price_excl_vat: number;
  vat_rate: number;
  section?: string;
}

/** Handmatige regels: rechtstreeks op de tabel, buiten de databasefunctie om. */
export function useManualProformaLines() {
  const add = useMutation({
    mutationFn: async ({ proformaId, input, sortOrder }: { proformaId: string; input: ManualLineInput; sortOrder: number }) => {
      const amounts = computeBillingLineAmounts(input.quantity, input.unit_price_excl_vat, input.vat_rate);
      const { error } = await supabase.from("project_proforma_lines").insert({
        proforma_id: proformaId,
        sort_order: sortOrder,
        kind: "cost",
        section: input.section?.trim() || "Overig",
        description: input.description.trim() || "Regel",
        quantity: input.quantity,
        quantity_label: String(input.quantity),
        unit_price_excl_vat: input.unit_price_excl_vat,
        vat_rate: input.vat_rate,
        amount_excl_vat: amounts.amount_excl_vat,
        vat_amount: amounts.vat_amount,
        amount_incl_vat: amounts.amount_incl_vat,
        origin: "manual",
        line_status: "active",
      });
      if (error) throw error;
    },
    onError: (error: Error) => {
      reportError(error, { where: "useManualProformaLines.add" });
      toast.error(error.message || "Regel toevoegen mislukt");
    },
  });

  const rename = useMutation({
    mutationFn: async ({ lineId, description }: { lineId: string; description: string }) => {
      const { error } = await supabase
        .from("project_proforma_lines")
        .update({ description: description.trim() || "Regel" })
        .eq("id", lineId);
      if (error) throw error;
    },
    onError: (error: Error) => {
      reportError(error, { where: "useManualProformaLines.rename" });
      toast.error(error.message || "Omschrijving wijzigen mislukt");
    },
  });

  const remove = useMutation({
    mutationFn: async (lineId: string) => {
      const { error } = await supabase
        .from("project_proforma_lines")
        .delete()
        .eq("id", lineId)
        .eq("origin", "manual");
      if (error) throw error;
    },
    onError: (error: Error) => {
      reportError(error, { where: "useManualProformaLines.remove" });
      toast.error(error.message || "Regel verwijderen mislukt");
    },
  });

  return { add, rename, remove };
}

/**
 * Fase 3: een volledige eindfactuur is geregistreerd uit de proforma. De
 * proforma gaat op `registered` (regels bevroren door de trigger) en wijst
 * naar de factuur. Mislukt dit, dan blijft het concept staan; de factuur
 * zelf is al geregistreerd, dus we melden alleen.
 */
export async function markProformaRegistered(proformaId: string, invoiceId: string): Promise<void> {
  const { error } = await supabase
    .from("project_proformas")
    .update({ status: "registered", registered_invoice_id: invoiceId })
    .eq("id", proformaId)
    .eq("status", "concept");
  if (error) reportError(error, { where: "markProformaRegistered" });
}
