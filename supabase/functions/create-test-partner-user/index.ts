import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Create admin client with service role
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { partnerId, email, password, assignAdminRole } = await req.json();

    if (!email || !password) {
      return new Response(
        JSON.stringify({ error: "email and password are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If creating admin-only user (no partner)
    if (assignAdminRole && !partnerId) {
      // Check if user already exists
      const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
      const existingUser = existingUsers?.users?.find(u => u.email === email);
      
      let authUserId: string;
      
      if (existingUser) {
        authUserId = existingUser.id;
      } else {
        // Create auth user
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
        });

        if (authError) {
          return new Response(
            JSON.stringify({ error: `Failed to create auth user: ${authError.message}` }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        authUserId = authData.user.id;
      }

      // Check if already has admin role
      const { data: existingRole } = await supabaseAdmin
        .from("user_roles")
        .select("id")
        .eq("user_id", authUserId)
        .eq("role", "admin")
        .maybeSingle();

      if (!existingRole) {
        // Assign admin role
        const { error: roleError } = await supabaseAdmin
          .from("user_roles")
          .insert({ user_id: authUserId, role: "admin" });

        if (roleError) {
          return new Response(
            JSON.stringify({ error: `Failed to assign admin role: ${roleError.message}` }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: `Admin user created/updated: ${email}`,
          authUserId,
          email,
          isAdmin: true,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Partner user creation flow
    if (!partnerId) {
      return new Response(
        JSON.stringify({ error: "partnerId is required for partner users" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if partner exists
    const { data: partner, error: partnerError } = await supabaseAdmin
      .from("partners")
      .select("id, name, auth_user_id")
      .eq("id", partnerId)
      .single();

    if (partnerError || !partner) {
      return new Response(
        JSON.stringify({ error: `Partner not found: ${partnerId}` }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (partner.auth_user_id) {
      return new Response(
        JSON.stringify({ error: "Partner already has an auth user linked", existingAuthUserId: partner.auth_user_id }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create auth user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authError) {
      return new Response(
        JSON.stringify({ error: `Failed to create auth user: ${authError.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Link auth user to partner
    const { error: updateError } = await supabaseAdmin
      .from("partners")
      .update({ auth_user_id: authData.user.id })
      .eq("id", partnerId);

    if (updateError) {
      // Rollback: delete the created auth user
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      return new Response(
        JSON.stringify({ error: `Failed to link auth user to partner: ${updateError.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Auth user created and linked to partner ${partner.name}`,
        authUserId: authData.user.id,
        partnerId: partner.id,
        partnerName: partner.name,
        email,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
