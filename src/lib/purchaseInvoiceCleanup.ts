/**
 * Opruimen van wat een inkoopfactuur op het project heeft achtergelaten.
 *
 * Een inkoopfactuur kan klantregels (`program_item_billing_lines`) op
 * onderdelen hebben gezet. Bij verwijderen of opnieuw verwerken van de factuur
 * bleven die regels tot 16 oktober 2026 staan: de klant kreeg dan bedragen
 * gefactureerd van een factuur die niet meer bestond. De klantregels kennen hun
 * bron nog niet (dat komt met het werkblad Doorbelasten), dus we ruimen op per
 * onderdeel dat aan de factuur hing.
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

  const { error: resetError } = await supabase
    .from("program_request_items")
    .update({
      use_actual_costs: false,
      final_billing_locked_at: null,
      updated_at: new Date().toISOString(),
    })
    .in("id", affected);
  if (resetError) throw resetError;

  return affected.length;
}
