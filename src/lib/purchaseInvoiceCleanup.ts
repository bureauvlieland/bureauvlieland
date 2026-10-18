/**
 * Opruimen van wat een inkoopfactuur op het project heeft achtergelaten.
 *
 * Een inkoopfactuur kan klantregels (`program_item_billing_lines`) op
 * onderdelen hebben gezet. Bij verwijderen of opnieuw verwerken van de factuur
 * bleven die regels tot 16 oktober 2026 staan: de klant kreeg dan bedragen
 * gefactureerd van een factuur die niet meer bestond.
 *
 * Sinds het werkblad Doorbelasten kennen klantregels hun bron
 * (`purchase_invoice_id`): die gaan weg. Regels van een factuur die vóór het
 * werkblad is verdeeld hebben geen bron; daarvoor geldt de oude regel: alle
 * klantregels van de onderdelen waar de factuur aan hing.
 */
import { supabase } from "@/integrations/supabase/client";

export interface LinkedInvoiceShape {
  item_id?: string | null;
  allocations?: Array<{ item_id: string }> | null;
}

/** Alle onderdelen waar deze factuur aan hing, via de kop of via de verdeling. */
export function linkedItemIds(invoice: LinkedInvoiceShape): string[] {
  const ids = new Set<string>();
  if (invoice.item_id) ids.add(invoice.item_id);
  for (const a of invoice.allocations ?? []) {
    if (a.item_id) ids.add(a.item_id);
  }
  return Array.from(ids);
}

/**
 * Haalt de klantregels van deze onderdelen weg en zet ze terug op de
 * offerteprijs. Geeft terug op hoeveel onderdelen er regels stonden.
 */
export async function clearCustomerLinesForItems(itemIds: string[]): Promise<number> {
  if (itemIds.length === 0) return 0;

  const { data: existing, error: readError } = await supabase
    .from("program_item_billing_lines")
    .select("item_id")
    .in("item_id", itemIds);
  if (readError) throw readError;

  const affected = Array.from(new Set((existing ?? []).map((row) => row.item_id)));
  if (affected.length === 0) return 0;

  const { error: deleteError } = await supabase
    .from("program_item_billing_lines")
    .delete()
    .in("item_id", affected);
  if (deleteError) throw deleteError;

  await resetItemsWithoutLines(affected);
  return affected.length;
}

/** Zet onderdelen zonder klantregels terug op de offerteprijs; geeft terug hoeveel. */
async function resetItemsWithoutLines(itemIds: string[]): Promise<number> {
  if (itemIds.length === 0) return 0;
  const { data: remaining, error: readError } = await supabase
    .from("program_item_billing_lines")
    .select("item_id")
    .in("item_id", itemIds);
  if (readError) throw readError;
  const stillHasLines = new Set((remaining ?? []).map((r) => r.item_id));
  const toReset = itemIds.filter((id) => !stillHasLines.has(id));
  if (toReset.length === 0) return 0;
  const { error: resetError } = await supabase
    .from("program_request_items")
    .update({
      final_billing_locked_at: null,
      updated_at: new Date().toISOString(),
    })
    .in("id", toReset);
  if (resetError) throw resetError;
  return toReset.length;
}

/**
 * Klantregels van één inkoopfactuur weghalen. Met bron: alleen die regels,
 * en de onderdelen die daardoor leeg raken terug op de offerteprijs. Zonder
 * bron (verdeeld vóór het werkblad): alle klantregels van de gekoppelde
 * onderdelen, zoals voorheen. Geeft terug op hoeveel onderdelen regels
 * verdwenen.
 */
export async function clearCustomerLinesForInvoice(
  invoice: LinkedInvoiceShape & { id: string },
): Promise<number> {
  const { data: sourced, error: readError } = await supabase
    .from("program_item_billing_lines")
    .select("item_id")
    .eq("purchase_invoice_id", invoice.id);
  if (readError) throw readError;

  if ((sourced ?? []).length > 0) {
    const affected = Array.from(new Set((sourced ?? []).map((r) => r.item_id)));
    const { error: deleteError } = await supabase
      .from("program_item_billing_lines")
      .delete()
      .eq("purchase_invoice_id", invoice.id);
    if (deleteError) throw deleteError;
    await resetItemsWithoutLines(affected);
    return affected.length;
  }

  return clearCustomerLinesForItems(linkedItemIds(invoice));
}
