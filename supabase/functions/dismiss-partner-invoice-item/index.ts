// Partner-initiated dismissal van een executed-item dat niet gefactureerd
// gaat worden (buiten Bureau Vlieland om afgehandeld, gratis, vervallen).
// Item verdwijnt uit partner-werkbank; admin ziet reden en kan heropenen.
// Ondersteunt ook het sluiten van een volledig project (requestId): alle
// onderdelen van dat project die geen actie meer vragen worden gesloten.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface Body {
  partnerToken?: string;
  itemId?: string;
  requestId?: string;
  reason?: string;
}

// Statussen waarbij de partner nog iets moet doen → niet stilzwijgend sluiten.
const OPEN_ACTION_STATUSES = ["pending", "alternative", "counter_proposed"];
const CLOSABLE_STATUSES = ["executed", "accepted", "confirmed"];

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function handler(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return json(400, { error: "Invalid JSON body" });
  }

  const partnerToken = (body.partnerToken ?? "").trim();
  const itemId = (body.itemId ?? "").trim();
  const requestId = (body.requestId ?? "").trim();
  const reason = (body.reason ?? "").trim();

  if (!partnerToken || (!itemId && !requestId)) {
    return json(400, { error: "partnerToken en itemId of requestId zijn verplicht" });
  }
  if (reason.length < 3) return json(400, { error: "Reden is verplicht (min. 3 tekens)." });
  if (reason.length > 500) return json(400, { error: "Reden is te lang (max. 500 tekens)." });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: partner, error: partnerErr } = await supabase
    .from("partners")
    .select("id, name")
    .eq("partner_token", partnerToken)
    .eq("is_active", true)
    .maybeSingle();

  if (partnerErr || !partner) return json(404, { error: "Invalid or inactive partner token" });

  const nowIso = new Date().toISOString();
  const selectCols =
    "id, provider_id, status, executed_at, invoiced_number, partner_dismissed_at, request_id, block_name";

  // ---- Bulk: heel project sluiten -----------------------------------------
  if (!itemId) {
    const { data: items, error: itemsErr } = await supabase
      .from("program_request_items")
      .select(selectCols)
      .eq("request_id", requestId)
      .eq("provider_id", partner.id);

    if (itemsErr) {
      console.error("project dismiss fetch failed:", itemsErr);
      return json(500, { error: "Kon onderdelen niet ophalen" });
    }
    if (!items || items.length === 0) {
      return json(404, { error: "Geen onderdelen van deze partner in dit project" });
    }
    const open = items.filter((i) => OPEN_ACTION_STATUSES.includes(i.status) && !i.partner_dismissed_at);
    if (open.length > 0) {
      return json(409, {
        error: `Er staan nog ${open.length} onderdelen open die uw reactie vragen. Handel die eerst af.`,
      });
    }
    const closable = items.filter(
      (i) => !i.partner_dismissed_at && !i.invoiced_number && CLOSABLE_STATUSES.includes(i.status),
    );
    if (closable.length === 0) {
      return json(409, { error: "Er zijn geen onderdelen meer om te sluiten in dit project." });
    }

    const { error: bulkErr } = await supabase
      .from("program_request_items")
      .update({ partner_dismissed_at: nowIso, partner_dismissed_reason: reason, updated_at: nowIso })
      .in("id", closable.map((i) => i.id));

    if (bulkErr) {
      console.error("project dismiss update failed:", bulkErr);
      return json(500, { error: "Kon project niet sluiten", details: bulkErr.message });
    }

    try {
      await supabase.from("project_communications").insert({
        request_id: requestId,
        type: "partner_note",
        direction: "inbound",
        subject: `Partner sluit project af (${closable.length} onderdelen)`,
        body:
          `Partner ${partner.name} heeft het project in het partnerportaal gesloten.\n\n` +
          `Gesloten onderdelen: ${closable.map((i) => i.block_name).join(", ")}\n\nReden: ${reason}`,
        metadata: {
          action: "partner_project_dismiss",
          item_ids: closable.map((i) => i.id),
          partner_id: partner.id,
        },
      });
    } catch (e) {
      console.error("project_communications insert failed (non-fatal):", e);
    }

    try {
      await supabase
        .from("admin_todos")
        .update({ status: "done", completed_at: nowIso, closed_reason: "partner_dismissed_no_invoice" })
        .in("item_id", closable.map((i) => i.id))
        .in("auto_type", ["partner_invoice_pending", "commission_pending"])
        .eq("status", "open");
    } catch (e) {
      console.error("admin_todos close failed (non-fatal):", e);
    }

    return json(200, { success: true, dismissed: closable.length });
  }

  // ---- Enkel item ----------------------------------------------------------
  const { data: item, error: itemErr } = await supabase
    .from("program_request_items")
    .select(selectCols)
    .eq("id", itemId)
    .maybeSingle();

  if (itemErr || !item) return json(404, { error: "Item niet gevonden" });
  if (item.provider_id !== partner.id) return json(403, { error: "Item hoort niet bij deze partner" });
  if (item.invoiced_number) return json(409, { error: "Item is al gefactureerd — sluiten niet mogelijk" });
  if (item.partner_dismissed_at) return json(409, { error: "Item is al gesloten" });
  if (!CLOSABLE_STATUSES.includes(item.status)) {
    return json(409, { error: "Alleen uitgevoerde onderdelen kunnen zo gesloten worden" });
  }

  const { error: updErr } = await supabase
    .from("program_request_items")
    .update({
      partner_dismissed_at: nowIso,
      partner_dismissed_reason: reason,
      updated_at: nowIso,
    })
    .eq("id", itemId);

  if (updErr) {
    console.error("dismiss update failed:", updErr);
    return json(500, { error: "Kon item niet sluiten", details: updErr.message });
  }

  // Log naar project-dossier zodat admin het terugziet
  try {
    await supabase.from("project_communications").insert({
      request_id: item.request_id,
      type: "partner_note",
      direction: "inbound",
      subject: `Partner sluit factureren: ${item.block_name}`,
      body: `Partner ${partner.name} heeft aangegeven geen factuur (meer) te sturen voor "${item.block_name}".\n\nReden: ${reason}`,
      metadata: {
        action: "partner_invoice_dismiss",
        item_id: itemId,
        partner_id: partner.id,
      },
    });
  } catch (e) {
    console.error("project_communications insert failed (non-fatal):", e);
  }

  // Sluit gerelateerde open admin-todos
  try {
    await supabase
      .from("admin_todos")
      .update({ status: "done", completed_at: nowIso, closed_reason: "partner_dismissed_no_invoice" })
      .eq("item_id", itemId)
      .in("auto_type", ["partner_invoice_pending", "commission_pending"])
      .eq("status", "open");
  } catch (e) {
    console.error("admin_todos close failed (non-fatal):", e);
  }

  return json(200, { success: true, dismissed: 1 });
}

if (import.meta.main) {
  Deno.serve(handler);
}

export { handler };
