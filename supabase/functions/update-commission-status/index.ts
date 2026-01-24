import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ADMIN_KEY = Deno.env.get("LOVABLE_API_KEY");

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader || authHeader !== `Bearer ${ADMIN_KEY}`) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { itemIds, status, notes } = await req.json();

    if (!itemIds || !Array.isArray(itemIds) || itemIds.length === 0) {
      return new Response(
        JSON.stringify({ error: "Item IDs are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const validStatuses = ["pending", "invoiced", "paid"];
    if (!validStatuses.includes(status)) {
      return new Response(
        JSON.stringify({ error: "Invalid status" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const updateData: Record<string, unknown> = {
      commission_status: status,
      updated_at: new Date().toISOString(),
    };

    if (status === "invoiced") {
      updateData.commission_invoiced_at = new Date().toISOString();
    }

    if (notes) {
      updateData.commission_notes = notes;
    }

    // Update items
    const { error: updateError } = await supabase
      .from("program_request_items")
      .update(updateData)
      .in("id", itemIds);

    if (updateError) {
      console.error("Error updating items:", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to update commission status" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Log to history for each item
    const { data: items } = await supabase
      .from("program_request_items")
      .select("id, request_id, provider_name")
      .in("id", itemIds);

    if (items) {
      const historyEntries = items.map((item) => ({
        request_id: item.request_id,
        item_id: item.id,
        action: "commission_status_changed",
        actor: "admin",
        actor_name: "Bureau Vlieland",
        new_value: { commission_status: status },
        notes: `Commissie status gewijzigd naar ${status}${notes ? `: ${notes}` : ""}`,
      }));

      await supabase.from("program_request_history").insert(historyEntries);
    }

    return new Response(
      JSON.stringify({ success: true, updatedCount: itemIds.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in update-commission-status:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
