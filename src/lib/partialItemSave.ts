import { supabase } from "@/integrations/supabase/client";

/**
 * Field-level partial save voor één program_request_item.
 *
 * - Live items (pending_added=false): schrijft naar `pending_<field>` zodat
 *   pas bij "Publiceer & verstuur" klant/partner een notificatie krijgt.
 * - Concept items (pending_added=true): schrijft direct naar de live kolom,
 *   omdat partner/klant het item nog niet kennen.
 *
 * Houd de logica synchroon met AdminEditActivitySheet#handleSave.
 */

export type PartialSaveField =
  | "block_name"
  | "admin_price_notes"
  | "customer_notes"
  | "partner_instructions";

interface PartialItem {
  id: string;
  pending_added?: boolean | null;
  block_name?: string | null;
  admin_price_notes?: string | null;
  customer_notes?: string | null;
  partner_instructions?: string | null;
  pending_block_name?: string | null;
  pending_admin_price_notes?: string | null;
  pending_customer_notes?: string | null;
  pending_partner_instructions?: string | null;
  pending_changed_at?: string | null;
}

const PENDING_FIELDS: Record<PartialSaveField, string> = {
  block_name: "pending_block_name",
  admin_price_notes: "pending_admin_price_notes",
  customer_notes: "pending_customer_notes",
  partner_instructions: "pending_partner_instructions",
};

/**
 * Schrijf 1 veld voor 1 item weg. Geeft true bij succes, gooit anders.
 */
export async function savePartialItemField(
  item: PartialItem,
  field: PartialSaveField,
  rawValue: string,
): Promise<void> {
  const value = rawValue.trim() === "" ? null : rawValue;
  const liveValue = (item[field] ?? null) as string | null;

  // Concept item → schrijf direct live
  if (item.pending_added === true) {
    if ((liveValue ?? null) === (value ?? null)) return;
    const { error } = await supabase
      .from("program_request_items")
      .update({ [field]: value })
      .eq("id", item.id);
    if (error) throw error;
    return;
  }

  // Live item → pending flow
  const pendingCol = PENDING_FIELDS[field];
  const samenAlsLive = (liveValue ?? null) === (value ?? null);
  const pendingValue = samenAlsLive ? null : value;

  // Bepaal of er na deze update nog enige pending wijziging openstaat.
  // Lees huidige pending-state uit DB om pending_changed_at correct te zetten.
  const { data: current, error: readErr } = await supabase
    .from("program_request_items")
    .select(
      "pending_block_name, pending_admin_price_notes, pending_customer_notes, pending_partner_instructions, pending_preferred_time, pending_day_index, pending_admin_price_override, pending_price_type, pending_location_address, pending_location_lat, pending_location_lng, pending_provider_id, pending_provider_name, pending_provider_email, pending_block_type, pending_marked_for_removal, pending_added, pending_override_people",
    )
    .eq("id", item.id)
    .maybeSingle();
  if (readErr) throw readErr;

  const next = { ...(current ?? {}) } as Record<string, unknown>;
  next[pendingCol] = pendingValue;

  const anyPending = [
    next.pending_block_name,
    next.pending_admin_price_notes,
    next.pending_customer_notes,
    next.pending_partner_instructions,
    next.pending_preferred_time,
    next.pending_day_index,
    next.pending_admin_price_override,
    next.pending_price_type,
    next.pending_location_address,
    next.pending_location_lat,
    next.pending_location_lng,
    next.pending_provider_id,
    next.pending_provider_name,
    next.pending_provider_email,
    next.pending_block_type,
    next.pending_override_people,
  ].some((v) => v !== null && v !== undefined);
  const hasMarkers =
    next.pending_marked_for_removal === true || next.pending_added === true;

  const { error } = await supabase
    .from("program_request_items")
    .update({
      [pendingCol]: pendingValue,
      pending_changed_at: anyPending || hasMarkers ? new Date().toISOString() : null,
    })
    .eq("id", item.id);
  if (error) throw error;
}
