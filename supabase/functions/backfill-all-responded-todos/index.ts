import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Niet geautoriseerd" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Niet geautoriseerd" }), {
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
      return new Response(JSON.stringify({ error: "Geen admin rechten" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get all active program requests
    const { data: requests } = await supabase
      .from("program_requests")
      .select("id, reference_number, customer_name, customer_company, status")
      .in("status", ["active", "in_progress"]);

    if (!requests || requests.length === 0) {
      return new Response(
        JSON.stringify({ success: true, created: 0, message: "Geen actieve aanvragen" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let created = 0;

    for (const req of requests) {
      // Get all items
      const { data: items } = await supabase
        .from("program_request_items")
        .select("id, status, block_type, skip_partner_notification, admin_price_override, quoted_price, block_name")
        .eq("request_id", req.id);

      const custName = req.customer_company || req.customer_name;
      const refNum = req.reference_number || "onbekend";

      // Create bureau_item_pricing todos for bureau items without pricing
      const bureauItems = (items || []).filter(i => i.block_type === "bureau");
      const bureauNeedPricing = bureauItems.filter(
        i => i.admin_price_override === null && i.quoted_price === null
      );

      for (const bi of bureauNeedPricing) {
        const { data: existingBureau } = await supabase
          .from("admin_todos")
          .select("id")
          .eq("auto_type", "bureau_item_pricing")
          .eq("auto_entity_id", bi.id)
          .neq("status", "done")
          .maybeSingle();

        if (!existingBureau) {
          await supabase.from("admin_todos").insert({
            title: `Prijs invullen: "${bi.block_name}" voor ${custName}`,
            description: `Bureau-item "${bi.block_name}" in project ${refNum} heeft nog geen prijs. Vul een admin prijs in.`,
            priority: "normal",
            status: "todo",
            related_request_id: req.id,
            auto_type: "bureau_item_pricing",
            auto_entity_id: bi.id,
          });
          created++;
          console.log(`Created bureau_item_pricing todo for ${bi.block_name} in ${refNum}`);
        }
      }

      // Partner items (not self_arranged, not bureau, not skipped)
      const sentItems = (items || []).filter(
        i => i.block_type !== "self_arranged" &&
             i.block_type !== "bureau" &&
             (i.skip_partner_notification === false || i.skip_partner_notification === null)
      );

      // Skip if no sent items or any still pending
      if (sentItems.length === 0) continue;
      if (sentItems.some(i => i.status === "pending")) continue;
      // Also skip if bureau items still need pricing
      if (bureauNeedPricing.length > 0) continue;

      // Check if todo already exists
      const { data: existing } = await supabase
        .from("admin_todos")
        .select("id")
        .eq("auto_type", "all_partners_responded")
        .eq("auto_entity_id", req.id)
        .maybeSingle();

      if (existing) continue;

      await supabase.from("admin_todos").insert({
        title: `Alle partners hebben gereageerd op ${refNum} (${custName})`,
        description: `Alle verstuurde programmaonderdelen zijn beantwoord${bureauItems.length > 0 ? ' en alle bureau-items hebben een prijs' : ''}. Beoordeel de reacties en stuur een status update naar de klant.`,
        priority: "high",
        status: "todo",
        related_request_id: req.id,
        auto_type: "all_partners_responded",
        auto_entity_id: req.id,
      });

      created++;
      console.log(`Created backfill todo for ${refNum}`);
    }

    return new Response(
      JSON.stringify({ success: true, created, total_checked: requests.length }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in backfill:", error);
    return new Response(
      JSON.stringify({ error: "Backfill mislukt" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
