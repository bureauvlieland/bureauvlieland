import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Number of days before creating a reminder
const REMINDER_DAYS = 3;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("Starting check-pending-items job...");

    // Calculate the cutoff date (3 days ago)
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - REMINDER_DAYS);

    // Find items that:
    // 1. Have status = 'pending'
    // 2. Were created more than REMINDER_DAYS ago
    // 3. Are not self_arranged
    // 4. Don't already have an active reminder todo
    const { data: pendingItems, error: itemsError } = await supabase
      .from("program_request_items")
      .select(`
        id,
        block_name,
        provider_id,
        provider_name,
        request_id,
        created_at,
        program_requests!inner (
          id,
          customer_name,
          customer_company,
          status,
          expires_at
        )
      `)
      .eq("status", "pending")
      .neq("block_type", "self_arranged")
      .lt("created_at", cutoffDate.toISOString())
      .eq("program_requests.status", "active")
      .gt("program_requests.expires_at", new Date().toISOString());

    if (itemsError) {
      console.error("Error fetching pending items:", itemsError);
      throw itemsError;
    }

    console.log(`Found ${pendingItems?.length || 0} pending items older than ${REMINDER_DAYS} days`);

    if (!pendingItems || pendingItems.length === 0) {
      return new Response(
        JSON.stringify({ message: "No pending items need reminders", created: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let createdCount = 0;
    let skippedCount = 0;

    for (const item of pendingItems) {
      // Check if a reminder todo already exists for this item
      const { data: existingTodo } = await supabase
        .from("admin_todos")
        .select("id")
        .eq("auto_type", "partner_reminder")
        .eq("auto_entity_id", item.id)
        .neq("status", "done")
        .maybeSingle();

      if (existingTodo) {
        skippedCount++;
        continue;
      }

      // Get partner info for the todo
      const { data: partner } = await supabase
        .from("partners")
        .select("name")
        .eq("id", item.provider_id)
        .maybeSingle();

      const partnerName = partner?.name || item.provider_name;
      
      // program_requests is an array from the join, get first element
      const programRequestsArray = item.program_requests as unknown as Array<{
        id: string;
        customer_name: string;
        customer_company: string | null;
        status: string;
        expires_at: string;
      }>;
      const request = programRequestsArray[0];
      
      if (!request) {
        console.error(`No program request found for item ${item.id}`);
        continue;
      }
      
      const customerName = request.customer_company || request.customer_name;
      const daysSinceCreated = Math.floor(
        (Date.now() - new Date(item.created_at).getTime()) / (1000 * 60 * 60 * 24)
      );

      // Create the reminder todo
      const { error: todoError } = await supabase
        .from("admin_todos")
        .insert({
          title: `Partner ${partnerName} heeft niet gereageerd op "${item.block_name}"`,
          description: `Deze activiteit is ${daysSinceCreated} dagen geleden aangevraagd voor ${customerName}, maar de partner heeft nog niet gereageerd. Neem contact op met de partner.`,
          priority: daysSinceCreated > 7 ? "high" : "normal",
          status: "todo",
          related_request_id: request.id,
          related_partner_id: item.provider_id,
          auto_type: "partner_reminder",
          auto_entity_id: item.id,
        });

      if (todoError) {
        console.error(`Error creating todo for item ${item.id}:`, todoError);
      } else {
        createdCount++;
        console.log(`Created reminder for item ${item.id} (${item.block_name})`);
      }
    }

    console.log(`Job completed: ${createdCount} reminders created, ${skippedCount} skipped`);

    return new Response(
      JSON.stringify({ 
        message: "Check completed", 
        created: createdCount,
        skipped: skippedCount,
        total_checked: pendingItems.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in check-pending-items:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
