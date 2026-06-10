import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.23.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const BodySchema = z.object({
  item_id: z.string().uuid(),
  new_status: z.enum(["confirmed"]).default("confirmed"),
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
    const { item_id, new_status, reason } = parsed.data;

    const { data: item, error: itemErr } = await supabase
      .from("program_request_items")
      .select(
        "id, request_id, status, item_quote_status, block_name, provider_id, provider_name",
      )
      .eq("id", item_id)
      .maybeSingle();
    if (itemErr) throw itemErr;
    if (!item) {
      return new Response(JSON.stringify({ error: "Item not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const oldStatus = item.status;
    const oldQuoteStatus = item.item_quote_status;

    const { error: updErr } = await supabase
      .from("program_request_items")
      .update({
        status: new_status,
        item_quote_status: "bevestigd",
      })
      .eq("id", item_id);
    if (updErr) throw updErr;

    await supabase.from("program_request_history").insert({
      request_id: item.request_id,
      action: `Admin override: item "${item.block_name}" handmatig op ${new_status}`,
      actor: "admin",
      actor_name: user.email ?? "Admin",
      notes: reason ?? null,
      old_value: { status: oldStatus, item_quote_status: oldQuoteStatus },
      new_value: { status: new_status, item_quote_status: "bevestigd" },
    });

    await supabase.from("admin_activity_log").insert({
      user_id: user.id,
      action: "item_status_overridden",
      entity_type: "program_request_item",
      entity_id: item_id,
      details: {
        block_name: item.block_name,
        provider_id: item.provider_id,
        old_status: oldStatus,
        new_status,
        reason: reason ?? null,
      },
    });

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("override-item-status error:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message ?? "Internal error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
