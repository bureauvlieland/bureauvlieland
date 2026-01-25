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

    // Parse request body for status filter
    let statusFilter = "pending";
    try {
      const body = await req.json();
      if (body.status) {
        statusFilter = body.status;
      }
    } catch {
      // No body or invalid JSON, use default
    }

    // Get all items with commission
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
      console.error("Error fetching items:", itemsError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch commissions" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get partners for additional info
    const { data: partners } = await adminClient
      .from("partners")
      .select("id, name, email, kvk_number, address_street, address_postal, address_city");

    const partnersMap = new Map(partners?.map((p) => [p.id, p]) || []);

    // Enrich items with partner info
    const enrichedItems = items?.map((item) => ({
      ...item,
      partner: partnersMap.get(item.provider_id) || null,
    })) || [];

    // Group by partner for summary
    const byPartner = enrichedItems.reduce((acc, item) => {
      const partnerId = item.provider_id;
      if (!acc[partnerId]) {
        acc[partnerId] = {
          partner: item.partner,
          items: [],
          totalCommission: 0,
        };
      }
      acc[partnerId].items.push(item);
      acc[partnerId].totalCommission += parseFloat(item.commission_amount) || 0;
      return acc;
    }, {} as Record<string, { partner: unknown; items: unknown[]; totalCommission: number }>);

    // Calculate totals
    const totalCommission = enrichedItems.reduce(
      (sum, item) => sum + (parseFloat(item.commission_amount) || 0),
      0
    );

    return new Response(
      JSON.stringify({
        items: enrichedItems,
        byPartner: Object.values(byPartner),
        summary: {
          totalItems: enrichedItems.length,
          totalCommission,
          status: statusFilter,
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
