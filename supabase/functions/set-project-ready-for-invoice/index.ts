import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.23.8";
import { computeInvoicingSnooze } from "../_shared/projectActivity.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const BodySchema = z.object({
  program_id: z.string().uuid(),
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
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: parsed.error.flatten().fieldErrors }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }
    const { program_id, reason } = parsed.data;

    // Load program
    const { data: program, error: progErr } = await supabase
      .from("program_requests")
      .select("id, customer_name, customer_company, completion_status, status, selected_dates")
      .eq("id", program_id)
      .maybeSingle();
    if (progErr) throw progErr;
    if (!program) {
      return new Response(JSON.stringify({ error: "Program not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (program.status === "cancelled") {
      return new Response(
        JSON.stringify({ error: "Project is geannuleerd" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }
    if (
      program.completion_status === "ready_for_invoice" ||
      program.completion_status === "partially_invoiced" ||
      program.completion_status === "fully_invoiced"
    ) {
      return new Response(
        JSON.stringify({
          ok: true,
          alreadyAdvanced: true,
          completion_status: program.completion_status,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // 1. Update completion status
    const { error: updErr } = await supabase
      .from("program_requests")
      .update({ completion_status: "ready_for_invoice" })
      .eq("id", program_id);
    if (updErr) throw updErr;

    // 2. Resolve open terms_reminder todos (same as customer-flow)
    await supabase
      .from("admin_todos")
      .update({
        status: "done",
        completed_at: new Date().toISOString(),
      })
      .eq("auto_type", "terms_reminder")
      .eq("auto_entity_id", program_id)
      .neq("status", "done");

    // 3. Create invoicing_ready todo if not present
    const { data: existingTodo } = await supabase
      .from("admin_todos")
      .select("id")
      .eq("auto_type", "invoicing_ready")
      .eq("auto_entity_id", program_id)
      .neq("status", "done")
      .maybeSingle();

    if (!existingTodo) {
      const customerLabel = program.customer_company || program.customer_name;
      const snoozeUntil = computeInvoicingSnooze(program.selected_dates);
      await supabase.from("admin_todos").insert({
        title: `Facturatie: ${customerLabel}`,
        description:
          `Admin heeft het project handmatig op "klaar voor facturatie" gezet${
            reason ? ` — reden: ${reason}` : ""
          }.${snoozeUntil ? ` Taak verschijnt automatisch de dag na afloop van het event (${snoozeUntil}).` : ""}`,
        priority: "normal",
        status: "todo",
        related_request_id: program_id,
        auto_type: "invoicing_ready",
        auto_entity_id: program_id,
        snoozed_until: snoozeUntil,
      });
    }

    // 4. History
    await supabase.from("program_request_history").insert({
      request_id: program_id,
      action: "Project handmatig op facturatie gezet",
      actor: "admin",
      actor_name: user.email ?? "Admin",
      notes: reason ?? null,
      new_value: { completion_status: "ready_for_invoice" },
    });

    // 5. Audit log
    await supabase.from("admin_activity_log").insert({
      user_id: user.id,
      action: "project_marked_ready_for_invoice",
      entity_type: "program",
      entity_id: program_id,
      details: { reason: reason ?? null },
    });

    return new Response(
      JSON.stringify({ ok: true, completion_status: "ready_for_invoice" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("set-project-ready-for-invoice error:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message ?? "Internal error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
