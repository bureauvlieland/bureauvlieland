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

    // Get all partners with auth_user_id
    const { data: partners, error: partnersError } = await adminClient
      .from("partners")
      .select("id, name, auth_user_id")
      .not("auth_user_id", "is", null);

    if (partnersError) {
      console.error("Error fetching partners:", partnersError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch partners" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${partners?.length || 0} partners with auth accounts to reset`);

    const results: { partnerId: string; partnerName: string; success: boolean; error?: string }[] = [];

    // Process each partner
    for (const partner of partners || []) {
      try {
        if (partner.auth_user_id) {
          // Delete user_roles for this auth user
          await adminClient
            .from("user_roles")
            .delete()
            .eq("user_id", partner.auth_user_id);

          // Delete the auth user
          const { error: deleteUserError } = await adminClient.auth.admin.deleteUser(
            partner.auth_user_id
          );

          if (deleteUserError) {
            console.error(`Error deleting auth user for ${partner.name}:`, deleteUserError);
          }
        }

        // Reset partner columns
        const { error: updateError } = await adminClient
          .from("partners")
          .update({
            auth_user_id: null,
            invited_at: null,
            password_set_at: null,
            last_login_at: null,
          })
          .eq("id", partner.id);

        if (updateError) {
          throw updateError;
        }

        results.push({
          partnerId: partner.id,
          partnerName: partner.name,
          success: true,
        });
      } catch (err) {
        console.error(`Error resetting partner ${partner.name}:`, err);
        results.push({
          partnerId: partner.id,
          partnerName: partner.name,
          success: false,
          error: err instanceof Error ? err.message : "Unknown error",
        });
      }
    }

    // Log the activity
    await adminClient.from("admin_activity_log").insert({
      user_id: userId,
      action: "reset_partner_connections",
      entity_type: "partner",
      details: {
        total_partners: partners?.length || 0,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: `Reset ${results.filter(r => r.success).length} of ${partners?.length || 0} partner connections`,
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in reset-partner-connections:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
