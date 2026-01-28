// Deprecated: import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
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

    // Get all items assigned to this partner (activity items)
    // Include billing details only when terms have been accepted (for invoicing)
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
          cancelled_at,
          terms_accepted_at,
          billing_company_name,
          billing_kvk_number,
          billing_vat_number,
          billing_address_street,
          billing_address_postal,
          billing_address_city,
          billing_contact_name,
          billing_contact_email,
          billing_reference
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

    // Group items by status for easy display (new status flow)
    const pendingConfirmation = activeItems.filter((i) => i.status === "pending");
    const confirmed = activeItems.filter((i) => i.status === "confirmed"); // Waiting for customer acceptance
    const accepted = activeItems.filter((i) => i.status === "accepted");
    const executed = activeItems.filter((i) => i.status === "executed");
    const invoiced = activeItems.filter((i) => i.status === "invoiced" || i.invoiced_number !== null);
    const closed = activeItems.filter((i) => ["unavailable", "cancelled"].includes(i.status));
    
    // Items ready for invoice: executed AND customer has accepted terms
    const readyForInvoice = activeItems.filter(
      (i) => i.status === "executed" && 
             !i.invoiced_number && 
             i.program_requests?.terms_accepted_at !== null
    );

    // Fetch accommodation quotes if partner offers accommodation
    let accommodationQuotes: any[] = [];
    let accommodationSummary = {
      pending: 0,
      submitted: 0,
      selected: 0,
      closed: 0,
      total: 0,
    };

    const partnerType = partner.partner_type || "activity_provider";
    const isAccommodationPartner = partnerType === "accommodation" || partnerType === "both";

    if (isAccommodationPartner) {
      const { data: quotes, error: quotesError } = await supabase
        .from("accommodation_quotes")
        .select(`
          *,
          accommodation_requests!inner (
            id,
            customer_name,
            customer_email,
            customer_phone,
            customer_company,
            arrival_date,
            departure_date,
            number_of_guests,
            accommodation_type,
            room_count,
            room_types,
            location_preference,
            budget_range,
            special_requests,
            status,
            created_at
          )
        `)
        .eq("partner_id", partner.id)
        .order("created_at", { ascending: false });

      if (!quotesError && quotes) {
        // Filter out quotes from cancelled requests
        accommodationQuotes = quotes.filter(
          (q) => q.accommodation_requests?.status !== "cancelled"
        );

        accommodationSummary = {
          pending: accommodationQuotes.filter((q) => q.status === "pending").length,
          submitted: accommodationQuotes.filter((q) => q.status === "submitted").length,
          selected: accommodationQuotes.filter((q) => q.status === "selected").length,
          closed: accommodationQuotes.filter((q) => 
            ["rejected", "expired"].includes(q.status)
          ).length,
          total: accommodationQuotes.length,
        };
      }
    }

    return new Response(
      JSON.stringify({
        partner: {
          id: partner.id,
          name: partner.name,
          email: partner.email,
          commission_percentage: partner.commission_percentage,
          accommodation_commission_percentage: partner.accommodation_commission_percentage,
          partner_type: partnerType,
        },
        items: activeItems,
        summary: {
          pending: pendingConfirmation.length,
          confirmed: confirmed.length,
          accepted: accepted.length,
          executed: executed.length,
          closed: closed.length,
          readyForInvoice: readyForInvoice.length,
          invoiced: invoiced.length,
          total: activeItems.length,
        },
        accommodationQuotes,
        accommodationSummary,
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
