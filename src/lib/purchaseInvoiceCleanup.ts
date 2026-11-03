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

export interface ResettableItem {
  id: string;
  day_index: number;
  block_id: string | null;
  created_from_purchase_lines?: boolean | null;
}

export interface ResetPlan {
  /** Door het werkblad aangemaakte kostenposten die leeg raakten: weg. */
  remove: string[];
  /** Handmatige kostenposten die als bestemming dienden: op € 0, het bedrag van de regels is weg. */
  zero: string[];
  /** Gewone onderdelen: terug op de offerteprijs. */
  unlock: string[];
}

/**
 * Wat er met onderdelen zonder klantregels moet gebeuren. Een kostenpost
 * zonder bouwsteen toont zijn bedrag ook buiten de regels om
 * (`admin_price_override`, gelijkgezet aan de som van de regels); laat je
 * die staan, dan betaalt de klant een factuur die niet meer bestaat.
 * Kostenposten waar nog inkoopregels aan hangen (`referencedIds`, bv. op
 * offerteprijs gehouden) blijven zoals ze zijn.
 */
export function planResetForItems(items: ResettableItem[], referencedIds: Set<string>): ResetPlan {
  const plan: ResetPlan = { remove: [], zero: [], unlock: [] };
  for (const item of items) {
    const isCostPost = item.day_index === -1 && item.block_id == null;
    if (isCostPost && !referencedIds.has(item.id)) {
      if (item.created_from_purchase_lines) plan.remove.push(item.id);
      else plan.zero.push(item.id);
    } else {
      plan.unlock.push(item.id);
    }
  }
  return plan;
}

/**
 * Zet onderdelen zonder klantregels terug op de offerteprijs en ruimt lege
 * kostenposten op; geeft terug hoeveel onderdelen zijn geraakt.
 */
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

  const [{ data: items, error: itemsError }, { data: refs, error: refsError }] = await Promise.all([
    supabase
      .from("program_request_items")
      .select("id, day_index, block_id, created_from_purchase_lines")
      .in("id", toReset),
    supabase
      .from("purchase_invoice_lines")
      .select("item_id")
      .in("item_id", toReset)
      .in("charge_status", ["charged", "kept_quote", "legacy"]),
  ]);
  if (itemsError) throw itemsError;
  if (refsError) throw refsError;

  const plan = planResetForItems(
    (items ?? []) as ResettableItem[],
    new Set((refs ?? []).map((r) => r.item_id).filter((id): id is string => !!id)),
  );
  const now = new Date().toISOString();
  if (plan.remove.length > 0) {
    const { error } = await supabase.from("program_request_items").delete().in("id", plan.remove);
    if (error) throw error;
  }
  if (plan.zero.length > 0) {
    const { error } = await supabase
      .from("program_request_items")
      .update({ final_billing_locked_at: null, admin_price_override: 0, updated_at: now })
      .in("id", plan.zero);
    if (error) throw error;
  }
  if (plan.unlock.length > 0) {
    const { error } = await supabase
      .from("program_request_items")
      .update({ final_billing_locked_at: null, updated_at: now })
      .in("id", plan.unlock);
    if (error) throw error;
  }
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
