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

    // Verify admin
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

    // Check admin role
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

    const { partnerId, customPassword } = await req.json();

    if (!partnerId) {
      return new Response(
        JSON.stringify({ error: "partnerId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch partner
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

    if (!partner.auth_user_id) {
      return new Response(
        JSON.stringify({ error: "Partner has no login account yet. Invite them first." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate or use custom password
    const newPassword = customPassword?.trim() || ("Vlieland-" + Math.floor(1000 + Math.random() * 9000));

    // Validate minimum length
    if (newPassword.length < 6) {
      return new Response(
        JSON.stringify({ error: "Password must be at least 6 characters" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update auth user password
    const { error: updateAuthError } = await adminClient.auth.admin.updateUserById(
      partner.auth_user_id,
      { password: newPassword }
    );

    if (updateAuthError) {
      console.error("Error updating auth password:", updateAuthError);
      return new Response(
        JSON.stringify({ error: `Failed to update password: ${updateAuthError.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Store new password as initial_password and reset password_set_at
    const { error: updatePartnerError } = await adminClient
      .from("partners")
      .update({
        initial_password: newPassword,
        password_set_at: null,
      })
      .eq("id", partnerId);

    if (updatePartnerError) {
      console.error("Error updating partner:", updatePartnerError);
    }

    // Log activity
    await adminClient.from("admin_activity_log").insert({
      user_id: user.id,
      action: "partner_password_reset",
      entity_type: "partner",
      entity_id: partnerId,
      details: { partner_name: partner.name },
    });

    console.log(`Admin ${user.id} reset password for partner ${partner.name}`);

    return new Response(
      JSON.stringify({
        success: true,
        password: newPassword,
        message: `Password reset for ${partner.name}`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in admin-reset-partner-password:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
