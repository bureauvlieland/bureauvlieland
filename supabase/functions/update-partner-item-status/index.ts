import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { partnerToken, itemId, status, statusNote, executedAt, quotedPrice, quotedNotes } = await req.json();

    if (!partnerToken || !itemId || !status) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const validStatuses = ["confirmed", "unavailable", "alternative"];
    if (!validStatuses.includes(status)) {
      return new Response(
        JSON.stringify({ error: "Invalid status" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate quoted price is required for confirmed status
    if (status === "confirmed" && (quotedPrice === undefined || quotedPrice === null || quotedPrice <= 0)) {
      return new Response(
        JSON.stringify({ error: "Quoted price is required when confirming" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify partner token
    const { data: partner, error: partnerError } = await supabase
      .from("partners")
      .select("*")
      .eq("partner_token", partnerToken)
      .eq("is_active", true)
      .single();

    if (partnerError || !partner) {
      return new Response(
        JSON.stringify({ error: "Invalid partner token" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get current item state
    const { data: item, error: itemError } = await supabase
      .from("program_request_items")
      .select("*, program_requests!inner(customer_name, customer_email, customer_token)")
      .eq("id", itemId)
      .eq("provider_id", partner.id)
      .single();

    if (itemError || !item) {
      return new Response(
        JSON.stringify({ error: "Item not found or not assigned to this partner" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const oldStatus = item.status;

    // Update item
    const updateData: Record<string, unknown> = {
      status,
      status_note: statusNote || null,
      status_updated_at: new Date().toISOString(),
      status_updated_by: partner.name,
      version: item.version + 1,
      updated_at: new Date().toISOString(),
    };

    // If marking as confirmed with a quoted price
    if (status === "confirmed" && quotedPrice !== undefined) {
      updateData.quoted_price = quotedPrice;
      updateData.quoted_at = new Date().toISOString();
      updateData.quoted_notes = quotedNotes || null;
    }

    // If marking as executed
    if (executedAt) {
      updateData.executed_at = executedAt;
    }

    const { error: updateError } = await supabase
      .from("program_request_items")
      .update(updateData)
      .eq("id", itemId);

    if (updateError) {
      console.error("Error updating item:", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to update item" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Log to history
    const historyNotes = status === "confirmed" && quotedPrice
      ? `Partner heeft bevestigd voor €${quotedPrice.toFixed(2)}${quotedNotes ? ` - ${quotedNotes}` : ""}`
      : `Partner heeft status gewijzigd naar ${status}${statusNote ? `: ${statusNote}` : ""}`;

    await supabase.from("program_request_history").insert({
      request_id: item.request_id,
      item_id: itemId,
      action: "status_changed",
      actor: "partner",
      actor_name: partner.name,
      old_value: { status: oldStatus },
      new_value: { status, status_note: statusNote, quoted_price: quotedPrice, quoted_notes: quotedNotes },
      notes: historyNotes,
    });

    // TODO: Send notification email to customer

    return new Response(
      JSON.stringify({ success: true, quotedPrice }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in update-partner-item-status:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
