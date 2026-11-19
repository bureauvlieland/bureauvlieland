// Verloop van één project voor het partnerportaal: de regels uit
// program_request_history die deze partner aangaan. De tabel is alleen voor
// admins leesbaar, dus het portaal haalt het log hier op met het partnertoken.
//
// Wat de partner ziet: regels over zijn eigen onderdelen (item_id van hem) en
// projectbrede regels zonder item_id die hem raken (aanvraag ingediend, data of
// aantal gewijzigd, geannuleerd, voorwaarden getekend). Regels over onderdelen
// van andere aanbieders, logies, facturatiegegevens van de klant en interne
// bureauzaken blijven buiten beeld. De lijst met acties staat in
// _shared/partnerProjectLog.ts, gedeeld met de tests.
import { createClient } from "npm:@supabase/supabase-js@2";
import { isPartnerVisibleHistoryRow, PARTNER_LOG_LIMIT } from "../_shared/partnerProjectLog.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const partnerToken = url.searchParams.get("token");
    const requestId = url.searchParams.get("requestId");
    if (!partnerToken || !requestId) return json({ error: "token and requestId are required" }, 400);

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: partner } = await supabase
      .from("partners")
      .select("id, name")
      .eq("partner_token", partnerToken)
      .eq("is_active", true)
      .maybeSingle();
    if (!partner) return json({ error: "Invalid or inactive partner token" }, 404);

    // Alleen projecten waar de partner een (niet-concept) onderdeel in heeft.
    const { data: ownItems } = await supabase
      .from("program_request_items")
      .select("id, block_name, skip_partner_notification, status")
      .eq("request_id", requestId)
      .eq("provider_id", partner.id)
      .neq("block_type", "self_arranged");
    const visibleItems = (ownItems || []).filter((i) => !(i.skip_partner_notification && i.status === "pending"));
    if (visibleItems.length === 0) return json({ entries: [] });
    const ownItemIds = new Set(visibleItems.map((i) => i.id));
    const itemNames = Object.fromEntries(visibleItems.map((i) => [i.id, i.block_name as string]));

    const { data: rows, error } = await supabase
      .from("program_request_history")
      .select("id, item_id, action, actor, actor_name, old_value, new_value, notes, created_at")
      .eq("request_id", requestId)
      .order("created_at", { ascending: false })
      .limit(PARTNER_LOG_LIMIT);
    if (error) {
      console.error("history fetch failed:", error);
      return json({ error: "Failed to fetch log" }, 500);
    }

    const entries = (rows || [])
      .filter((r) => isPartnerVisibleHistoryRow(r, ownItemIds))
      .map((r) => ({
        id: r.id,
        item_id: r.item_id,
        item_name: r.item_id ? itemNames[r.item_id] ?? null : null,
        action: r.action,
        actor: r.actor,
        // De klantnaam staat al op de projectpagina; namen van bureaumedewerkers
        // en de eigen naam voegen niets toe, dus alleen de rol gaat mee.
        old_value: r.old_value,
        new_value: r.new_value,
        notes: r.notes,
        created_at: r.created_at,
      }));

    // Door het bureau gepubliceerde wijzigingen aan de eigen onderdelen
    // (program_change_log) staan niet in de historie; die voegen we hier toe
    // als regels van Bureau Vlieland.
    const { data: logRows } = await supabase
      .from("program_change_log")
      .select("id, item_id, field, old_value, new_value, published_at")
      .eq("request_id", requestId)
      .in("item_id", [...ownItemIds])
      .in("field", ["time", "day", "people", "notes", "price", "location", "name"])
      .not("published_at", "is", null)
      .order("published_at", { ascending: false })
      .limit(PARTNER_LOG_LIMIT);
    for (const r of logRows || []) {
      entries.push({
        id: `cl-${r.id}`,
        item_id: r.item_id,
        item_name: itemNames[r.item_id] ?? null,
        action: `bureau_published_${r.field}`,
        actor: "admin",
        old_value: { value: r.old_value },
        new_value: { value: r.new_value },
        notes: null,
        created_at: r.published_at,
      });
    }
    entries.sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));

    return json({ entries });
  } catch (e) {
    console.error("get-partner-project-log failed:", e);
    return json({ error: "Internal error" }, 500);
  }
});
