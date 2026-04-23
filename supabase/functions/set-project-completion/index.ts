import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.23.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const BodySchema = z.object({
  entity_type: z.enum(["program", "accommodation"]),
  entity_id: z.string().uuid(),
  action: z.enum(["complete", "reopen"]),
  reason: z.string().max(2000).optional(),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      token,
    );
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleData) {
      return new Response(
        JSON.stringify({ error: "Admin access required" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Validate body
    const body = await req.json();
    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: parsed.error.flatten().fieldErrors }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }
    const { entity_type, entity_id, action, reason } = parsed.data;

    if (action === "reopen" && (!reason || reason.trim().length < 3)) {
      return new Response(
        JSON.stringify({ error: "Reden van heropening is verplicht" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const table = entity_type === "program"
      ? "program_requests"
      : "accommodation_requests";

    if (action === "complete") {
      const { error: updErr } = await supabase
        .from(table)
        .update({
          completion_status: "fully_invoiced",
          completed_at: new Date().toISOString(),
          completed_by: user.id,
          reopened_reason: null,
        })
        .eq("id", entity_id);
      if (updErr) throw updErr;

      // Close related open invoicing-related todos for program projects
      if (entity_type === "program") {
        await supabase
          .from("admin_todos")
          .update({
            status: "done",
            completed_at: new Date().toISOString(),
          })
          .eq("related_request_id", entity_id)
          .neq("status", "done")
          .in("auto_type", [
            "invoice_followup",
            "register_invoice",
            "ready_for_invoice",
          ]);

        // History row
        await supabase.from("program_request_history").insert({
          request_id: entity_id,
          action: "Project gemarkeerd als afgerond",
          actor: "admin",
          actor_name: user.email ?? "Admin",
          new_value: { completion_status: "fully_invoiced" },
        });
      }
    } else {
      // reopen
      const reopenStatus = "partially_invoiced";
      const { error: updErr } = await supabase
        .from(table)
        .update({
          completion_status: reopenStatus,
          completed_at: null,
          completed_by: null,
          reopened_reason: reason!.trim(),
        })
        .eq("id", entity_id);
      if (updErr) throw updErr;

      if (entity_type === "program") {
        await supabase.from("program_request_history").insert({
          request_id: entity_id,
          action: "Project heropend",
          actor: "admin",
          actor_name: user.email ?? "Admin",
          notes: reason!.trim(),
          new_value: { completion_status: reopenStatus },
        });
      }
    }

    // Audit log
    await supabase.from("admin_activity_log").insert({
      user_id: user.id,
      action: action === "complete"
        ? (entity_type === "program"
          ? "project_completed"
          : "accommodation_completed")
        : (entity_type === "program"
          ? "project_reopened"
          : "accommodation_reopened"),
      entity_type,
      entity_id,
      details: { reason: reason ?? null },
    });

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("set-project-completion error:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message ?? "Internal error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
