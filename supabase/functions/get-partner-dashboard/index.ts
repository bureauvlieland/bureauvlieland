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
    const url = new URL(req.url);
    const partnerToken = url.searchParams.get("token");

    if (!partnerToken) {
      return new Response(
        JSON.stringify({ error: "Partner token is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get partner by token
    const { data: partner, error: partnerError } = await supabase
      .from("partners")
      .select("*")
      .eq("partner_token", partnerToken)
      .eq("is_active", true)
      .single();

    if (partnerError || !partner) {
      return new Response(
        JSON.stringify({ error: "Invalid or inactive partner token" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get all items assigned to this partner
    const { data: items, error: itemsError } = await supabase
      .from("program_request_items")
      .select(`
        *,
        program_requests!inner (
          id,
          customer_name,
          customer_email,
          customer_phone,
          customer_company,
          number_of_people,
          selected_dates,
          status,
          cancelled_at
        )
      `)
      .eq("provider_id", partner.id)
      .neq("block_type", "self_arranged")
      .order("created_at", { ascending: false });

    if (itemsError) {
      console.error("Error fetching items:", itemsError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch items" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Filter out items from cancelled programs
    const activeItems = items?.filter(
      (item) => item.program_requests?.status !== "cancelled"
    ) || [];

    // Group items by status for easy display
    const pendingConfirmation = activeItems.filter((i) => i.status === "pending");
    const confirmed = activeItems.filter((i) => i.status === "confirmed");
    const executed = activeItems.filter((i) => i.executed_at !== null);
    const pendingInvoice = activeItems.filter(
      (i) => i.status === "confirmed" && i.executed_at !== null && !i.invoiced_number
    );
    const invoiced = activeItems.filter((i) => i.invoiced_number !== null);

    return new Response(
      JSON.stringify({
        partner: {
          id: partner.id,
          name: partner.name,
          email: partner.email,
          commission_percentage: partner.commission_percentage,
        },
        items: activeItems,
        summary: {
          pendingConfirmation: pendingConfirmation.length,
          confirmed: confirmed.length,
          executed: executed.length,
          pendingInvoice: pendingInvoice.length,
          invoiced: invoiced.length,
          total: activeItems.length,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in get-partner-dashboard:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
