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
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify user is admin
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsError } = await userClient.auth.getClaims(token);
    
    if (claimsError || !claims?.claims?.sub) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = claims.claims.sub;

    // Check admin role
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(
        JSON.stringify({ error: "Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body for filters
    let statusFilter = "pending";
    let typeFilter = "all"; // "all" | "activity" | "accommodation"
    try {
      const body = await req.json();
      if (body.status) statusFilter = body.status;
      if (body.type) typeFilter = body.type;
    } catch {
      // No body or invalid JSON, use defaults
    }

    // Get partners for enrichment
    const { data: partners } = await adminClient
      .from("partners")
      .select("id, name, email, kvk_number, address_street, address_postal, address_city");
    const partnersMap = new Map(partners?.map((p) => [p.id, p]) || []);

    // ====== ACTIVITY ITEMS ======
    let activityItems: unknown[] = [];
    if (typeFilter === "all" || typeFilter === "activity") {
      const { data: items, error: itemsError } = await adminClient
        .from("program_request_items")
        .select(`
          *,
          program_requests!inner (
            id,
            customer_name,
            customer_company,
            selected_dates
          )
        `)
        .eq("commission_status", statusFilter)
        .gt("commission_percentage", 0)
        .not("invoiced_number", "is", null)
        .order("invoiced_date", { ascending: false });

      if (itemsError) {
        console.error("Error fetching activity items:", itemsError);
      } else {
        activityItems = (items || []).map((item) => ({
          ...item,
          item_type: "activity",
          partner: partnersMap.get(item.provider_id) || null,
        }));
      }
    }

    // ====== ACCOMMODATION QUOTES ======
    let accommodationItems: unknown[] = [];
    if (typeFilter === "all" || typeFilter === "accommodation") {
      const { data: quotes, error: quotesError } = await adminClient
        .from("accommodation_quotes")
        .select(`
          *,
          accommodation_requests!inner (
            id,
            customer_name,
            customer_company,
            arrival_date,
            departure_date
          )
        `)
        .eq("commission_status", statusFilter)
        .eq("status", "selected")
        .gt("commission_percentage", 0)
        .not("invoiced_number", "is", null)
        .order("invoiced_date", { ascending: false });

      if (quotesError) {
        console.error("Error fetching accommodation quotes:", quotesError);
      } else {
        accommodationItems = (quotes || []).map((quote) => ({
          id: quote.id,
          block_name: quote.accommodation_name,
          invoiced_amount: quote.invoiced_amount,
          invoiced_number: quote.invoiced_number,
          invoiced_date: quote.invoiced_date,
          commission_percentage: quote.commission_percentage,
          commission_amount: quote.commission_amount,
          commission_status: quote.commission_status,
          provider_id: quote.partner_id,
          provider_name: partnersMap.get(quote.partner_id)?.name || "Onbekend",
          item_type: "accommodation",
          program_requests: null,
          accommodation_requests: quote.accommodation_requests,
          partner: partnersMap.get(quote.partner_id) || null,
        }));
      }
    }

    // Combine all items
    const allItems = [...activityItems, ...accommodationItems] as any[];

    // Group by partner for summary
    const byPartnerMap: Record<string, { partner: any; items: any[]; totalCommission: number }> = {};
    for (const item of allItems) {
      const partnerId = item.provider_id;
      if (!byPartnerMap[partnerId]) {
        byPartnerMap[partnerId] = {
          partner: item.partner,
          items: [],
          totalCommission: 0,
        };
      }
      byPartnerMap[partnerId].items.push(item);
      byPartnerMap[partnerId].totalCommission += parseFloat(item.commission_amount) || 0;
    }

    // Calculate totals
    let totalCommission = 0;
    for (const item of allItems) {
      totalCommission += parseFloat(item.commission_amount) || 0;
    }

    return new Response(
      JSON.stringify({
        items: allItems,
        byPartner: Object.values(byPartnerMap),
        summary: {
          totalItems: allItems.length,
          totalCommission,
          status: statusFilter,
          activityCount: activityItems.length,
          accommodationCount: accommodationItems.length,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in get-admin-commissions:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
