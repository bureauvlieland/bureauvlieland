// Partner-initiated dismissal van een executed-item dat niet gefactureerd
// gaat worden (buiten Bureau Vlieland om afgehandeld, gratis, vervallen).
// Item verdwijnt uit partner-werkbank; admin ziet reden en kan heropenen.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface Body {
  partnerToken?: string;
  itemId?: string;
  reason?: string;
}

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
  const reason = (body.reason ?? "").trim();

  if (!partnerToken || !itemId) return json(400, { error: "partnerToken and itemId are required" });
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

  const { data: item, error: itemErr } = await supabase
    .from("program_request_items")
    .select("id, provider_id, status, executed_at, invoiced_number, partner_dismissed_at, request_id, block_name")
    .eq("id", itemId)
    .maybeSingle();

  if (itemErr || !item) return json(404, { error: "Item niet gevonden" });
  if (item.provider_id !== partner.id) return json(403, { error: "Item hoort niet bij deze partner" });
  if (item.invoiced_number) return json(409, { error: "Item is al gefactureerd — sluiten niet mogelijk" });
  if (item.partner_dismissed_at) return json(409, { error: "Item is al gesloten" });
  if (item.status !== "executed" && item.status !== "accepted" && item.status !== "confirmed") {
    return json(409, { error: "Alleen uitgevoerde onderdelen kunnen zo gesloten worden" });
  }

  const nowIso = new Date().toISOString();
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
    return json(500, { error: "Kon item niet sluiten" });
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

  return json(200, { success: true });
}

if (import.meta.main) {
  Deno.serve(handler);
}

export { handler };
