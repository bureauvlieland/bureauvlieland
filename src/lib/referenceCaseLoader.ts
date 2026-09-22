import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase as defaultClient } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { ACTIVITY_LANDINGS, LANDINGS } from "@/content/landings";
import { entryPath, kindFromTitle, type SnapshotInput } from "@/lib/referenceCases";
import { normalizePath } from "@/lib/reviews";

/**
 * Haalt alles op wat `buildReferenceSnapshot` nodig heeft: de aanvraag, de
 * onderdelen, de bouwstenen (voor de foto's), de beoordeling en het gekozen
 * logies. Alleen voor admin; de publieke kant leest de momentopname.
 */

/** "Bedrijfsuitje" voor "/bedrijfsuitje-vlieland", of null zonder instappagina. */
export const kindForPath = (path: string): string | null => {
  if (!path) return null;
  const pad = normalizePath(path);
  const landing = [...LANDINGS, ...ACTIVITY_LANDINGS].find((l) => l.path === pad);
  return landing ? kindFromTitle(landing.hero.title) || null : null;
};

/**
 * Alleen echte foto-URL's (storage of extern) komen in de momentopname. De
 * lokale assets van oude bouwstenen krijgen per build een andere naam en
 * zouden na de volgende deploy niet meer laden.
 */
const usableImage = (url: string | null): string | null => (url && /^https?:\/\//.test(url) ? url : null);

type Client = SupabaseClient<Database>;

async function loadSelectedAccommodation(supabase: Client, requestId: string, linkedId: string | null): Promise<string | null> {
  const ids = new Set<string>();
  if (linkedId) ids.add(linkedId);
  const { data: linked } = await supabase.from("accommodation_requests").select("id").eq("linked_program_id", requestId);
  for (const r of linked ?? []) ids.add(r.id);
  if (ids.size === 0) return null;
  const { data: quotes } = await supabase
    .from("accommodation_quotes")
    .select("accommodation_name")
    .in("request_id", [...ids])
    .eq("status", "selected")
    .limit(1);
  return quotes?.[0]?.accommodation_name ?? null;
}

/**
 * `client` is standaard de app-client (admin, RLS); een script kan een
 * service-role-client meegeven. `kind` overschrijft de soort uit de
 * instappagina (voor projecten van vóór de attributie).
 */
export async function loadReferenceSnapshotInput(
  requestId: string,
  reviewId: string | null,
  existingSlugs: string[],
  options: { client?: Client; kind?: string | null } = {},
): Promise<SnapshotInput> {
  const supabase = options.client ?? defaultClient;
  const { data: request, error } = await supabase
    .from("program_requests")
    .select("id, reference_number, customer_name, customer_company, number_of_people, selected_dates, attribution, linked_accommodation_id")
    .eq("id", requestId)
    .maybeSingle();
  if (error) throw error;
  if (!request) throw new Error("Aanvraag niet gevonden");

  const { data: items, error: itemsError } = await supabase
    .from("program_request_items")
    .select("day_index, preferred_time, confirmed_time, block_name, block_category, block_id, provider_name, status")
    .eq("request_id", requestId);
  if (itemsError) throw itemsError;

  const blockIds = [...new Set((items ?? []).map((i) => i.block_id).filter((id): id is string => Boolean(id)))];
  let blocks: SnapshotInput["blocks"] = [];
  if (blockIds.length > 0) {
    const { data, error: blocksError } = await supabase.from("building_blocks").select("id, name, image_url").in("id", blockIds);
    if (blocksError) throw blocksError;
    blocks = (data ?? []).map((b) => ({ id: b.id, name: b.name, image: usableImage(b.image_url) }));
  }

  let review: SnapshotInput["review"] = null;
  if (reviewId) {
    const { data } = await supabase
      .from("customer_reviews")
      .select("quote, text_positive, author_name, author_role, company")
      .eq("id", reviewId)
      .maybeSingle();
    review = data ?? null;
  }

  const accommodation = await loadSelectedAccommodation(supabase, requestId, request.linked_accommodation_id);

  return {
    request,
    items: items ?? [],
    blocks,
    review,
    accommodation,
    kind: options.kind ?? kindForPath(entryPath(request.attribution)),
    existingSlugs,
  };
}
