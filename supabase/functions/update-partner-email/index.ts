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

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(
        JSON.stringify({ error: "Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { partnerId, newEmail } = await req.json();

    if (!partnerId || !newEmail) {
      return new Response(
        JSON.stringify({ error: "partnerId and newEmail are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      return new Response(
        JSON.stringify({ error: "Invalid email format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get partner
    const { data: partner, error: partnerError } = await adminClient
      .from("partners")
      .select("id, name, email, auth_user_id")
      .eq("id", partnerId)
      .maybeSingle();

    if (partnerError || !partner) {
      return new Response(
        JSON.stringify({ error: "Partner not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const oldEmail = partner.email;

    // Update partners table
    const { error: updateError } = await adminClient
      .from("partners")
      .update({ email: newEmail })
      .eq("id", partnerId);

    if (updateError) {
      console.error("Error updating partner email:", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to update partner email" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Sync auth user email if linked
    let authSynced = false;
    if (partner.auth_user_id) {
      const { error: authUpdateError } = await adminClient.auth.admin.updateUserById(
        partner.auth_user_id,
        { email: newEmail, email_confirm: true }
      );

      if (authUpdateError) {
        console.error("Error syncing auth email:", authUpdateError);
        // Revert partner email on auth failure
        await adminClient.from("partners").update({ email: oldEmail }).eq("id", partnerId);
        return new Response(
          JSON.stringify({ error: "Failed to sync auth email. Partner email reverted." }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      authSynced = true;
    }

    // Log activity
    await adminClient.from("admin_activity_log").insert({
      user_id: user.id,
      action: "partner_email_updated",
      entity_type: "partner",
      entity_id: partnerId,
      details: { old_email: oldEmail, new_email: newEmail, auth_synced: authSynced },
    });

    return new Response(
      JSON.stringify({ success: true, authSynced }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in update-partner-email:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
