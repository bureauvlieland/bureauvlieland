import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ConfirmResult {
  activitiesConfirmed: number;
  accommodationsConfirmed: number;
  todosCreated: number;
  errors: string[];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const result: ConfirmResult = {
      activitiesConfirmed: 0,
      accommodationsConfirmed: 0,
      todosCreated: 0,
      errors: [],
    };

    const today = new Date().toISOString().split("T")[0];

    // ============================================
    // CONFIRM EXPIRED ACTIVITY PROFORMAS
    // ============================================
    const { data: expiredItems, error: itemsError } = await supabase
      .from("program_request_items")
      .select(`
        *,
        program_requests (
          id,
          customer_name,
          customer_company
        )
      `)
      .eq("commission_status", "pending_confirmation")
      .lt("proforma_deadline", today)
      .is("actual_invoiced_excl_vat", null);

    if (itemsError) {
      console.error("Error fetching expired activity proformas:", itemsError);
      result.errors.push(`Failed to fetch expired items: ${itemsError.message}`);
    } else if (expiredItems && expiredItems.length > 0) {
      console.log(`Found ${expiredItems.length} expired activity proformas to confirm`);

      for (const item of expiredItems) {
        try {
          // Confirm commission based on pro forma
          const { error: updateError } = await supabase
            .from("program_request_items")
            .update({
              commission_status: "confirmed",
              commission_amount: item.proforma_commission,
              invoiced_amount: item.proforma_amount_excl_vat,
            })
            .eq("id", item.id);

          if (updateError) {
            result.errors.push(`Failed to confirm item ${item.id}: ${updateError.message}`);
            continue;
          }

          // Create admin todo for invoicing
          const { error: todoError } = await supabase
            .from("admin_todos")
            .insert({
              title: `Commissie factureren: ${item.provider_name}`,
              description: `Commissie €${item.proforma_commission?.toFixed(2)} voor ${item.block_name} - ${item.program_requests?.customer_name || "Klant"}`,
              priority: "normal",
              status: "todo",
              auto_type: "commission_ready_to_invoice",
              auto_entity_id: item.id,
              related_request_id: item.request_id,
              related_partner_id: item.provider_id,
            });

          if (!todoError) {
            result.todosCreated++;
          }

          result.activitiesConfirmed++;
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err);
          console.error(`Error confirming item ${item.id}:`, err);
          result.errors.push(`Error confirming item ${item.id}: ${message}`);
        }
      }
    }

    // ============================================
    // CONFIRM EXPIRED ACCOMMODATION PROFORMAS
    // ============================================
    const { data: expiredQuotes, error: quotesError } = await supabase
      .from("accommodation_quotes")
      .select(`
        *,
        accommodation_requests (
          id,
          customer_name,
          customer_company
        )
      `)
      .eq("commission_status", "pending_confirmation")
      .lt("proforma_deadline", today)
      .is("actual_invoiced_excl_vat", null);

    if (quotesError) {
      console.error("Error fetching expired accommodation proformas:", quotesError);
      result.errors.push(`Failed to fetch expired quotes: ${quotesError.message}`);
    } else if (expiredQuotes && expiredQuotes.length > 0) {
      console.log(`Found ${expiredQuotes.length} expired accommodation proformas to confirm`);

      for (const quote of expiredQuotes) {
        try {
          // Confirm commission based on pro forma
          const { error: updateError } = await supabase
            .from("accommodation_quotes")
            .update({
              commission_status: "confirmed",
              commission_amount: quote.proforma_commission,
              invoiced_amount: quote.proforma_amount_excl_vat,
            })
            .eq("id", quote.id);

          if (updateError) {
            result.errors.push(`Failed to confirm quote ${quote.id}: ${updateError.message}`);
            continue;
          }

          // Get partner name for todo
          const { data: partner } = await supabase
            .from("partners")
            .select("name")
            .eq("id", quote.partner_id)
            .single();

          // Create admin todo for invoicing
          const { error: todoError } = await supabase
            .from("admin_todos")
            .insert({
              title: `Logies commissie factureren: ${partner?.name || quote.partner_id}`,
              description: `Commissie €${quote.proforma_commission?.toFixed(2)} voor ${quote.accommodation_name} - ${quote.accommodation_requests?.customer_name || "Klant"}`,
              priority: "normal",
              status: "todo",
              auto_type: "accommodation_commission_ready",
              auto_entity_id: quote.id,
              related_accommodation_id: quote.request_id,
              related_partner_id: quote.partner_id,
            });

          if (!todoError) {
            result.todosCreated++;
          }

          result.accommodationsConfirmed++;
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err);
          console.error(`Error confirming quote ${quote.id}:`, err);
          result.errors.push(`Error confirming quote ${quote.id}: ${message}`);
        }
      }
    }

    console.log("Confirm pending commissions result:", result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Error in confirm-pending-commissions:", error);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
