import { supabase } from "@/integrations/supabase/client";

/**
 * Fase 3 van docs/plan-proforma-factuur.md: een inkoopfactuur waarvan regels
 * op een proforma staan kan niet worden verwijderd of opnieuw verwerkt. De
 * klant zou bedragen betalen van een factuur die niet meer bestaat. Eerst
 * terugdraaien in het werkblad.
 */
export async function assertInvoiceNotOnProforma(invoiceId: string): Promise<void> {
  const { count, error } = await supabase
    .from("project_proforma_lines")
    .select("id", { count: "exact", head: true })
    .eq("purchase_invoice_id", invoiceId);
  if (error) throw error;
  if ((count ?? 0) > 0) {
    throw new Error(
      `${count} ${count === 1 ? "regel" : "regels"} van deze factuur ${count === 1 ? "staat" : "staan"} op de proforma. Draai die eerst terug in het werkblad op het project.`,
    );
  }
}
