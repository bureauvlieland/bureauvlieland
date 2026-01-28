import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ConfirmRequest {
  partnerToken: string;
  itemId: string;
  itemType: "activity" | "accommodation";
  deviation?: {
    actualAmount: number;
    reason: string;
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: ConfirmRequest = await req.json();
    const { partnerToken, itemId, itemType, deviation } = body;

    if (!partnerToken || !itemId || !itemType) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify partner token
    const { data: partner, error: partnerError } = await supabase
      .from("partners")
      .select("id, name, commission_percentage, accommodation_commission_percentage")
      .eq("partner_token", partnerToken)
      .eq("is_active", true)
      .single();

    if (partnerError || !partner) {
      return new Response(
        JSON.stringify({ error: "Invalid partner token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (itemType === "activity") {
      // Handle activity item
      const { data: item, error: itemError } = await supabase
        .from("program_request_items")
        .select("*")
        .eq("id", itemId)
        .eq("provider_id", partner.id)
        .eq("commission_status", "pending_confirmation")
        .single();

      if (itemError || !item) {
        return new Response(
          JSON.stringify({ error: "Item not found or not in pending_confirmation status" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      let updateData: Record<string, unknown>;

      if (deviation) {
        // Partner reported a deviation - recalculate commission
        const commissionPercentage = item.commission_percentage ?? partner.commission_percentage ?? 15;
        const newCommission = deviation.actualAmount * (commissionPercentage / 100);

        updateData = {
          commission_status: "confirmed",
          actual_invoiced_excl_vat: deviation.actualAmount,
          deviation_reason: deviation.reason,
          invoiced_amount: deviation.actualAmount,
          commission_amount: Math.round(newCommission * 100) / 100,
        };
      } else {
        // Partner confirmed pro forma is correct
        updateData = {
          commission_status: "confirmed",
          invoiced_amount: item.proforma_amount_excl_vat,
          commission_amount: item.proforma_commission,
        };
      }

      const { error: updateError } = await supabase
        .from("program_request_items")
        .update(updateData)
        .eq("id", itemId);

      if (updateError) {
        throw updateError;
      }

      // Create admin todo
      const commissionAmount = deviation 
        ? deviation.actualAmount * ((item.commission_percentage ?? partner.commission_percentage ?? 15) / 100)
        : item.proforma_commission;

      await supabase.from("admin_todos").insert({
        title: `Commissie factureren: ${item.provider_name}`,
        description: deviation
          ? `Afwijkend bedrag gemeld. Commissie €${commissionAmount?.toFixed(2)} voor ${item.block_name}. Reden: ${deviation.reason}`
          : `Commissie €${commissionAmount?.toFixed(2)} voor ${item.block_name}`,
        priority: deviation ? "high" : "normal",
        status: "todo",
        auto_type: "commission_ready_to_invoice",
        auto_entity_id: itemId,
        related_request_id: item.request_id,
        related_partner_id: item.provider_id,
      });

      return new Response(
        JSON.stringify({ 
          success: true, 
          commission: {
            amount: deviation ? commissionAmount : item.proforma_commission,
            hasDeviation: !!deviation,
          }
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );

    } else {
      // Handle accommodation quote
      const { data: quote, error: quoteError } = await supabase
        .from("accommodation_quotes")
        .select("*")
        .eq("id", itemId)
        .eq("partner_id", partner.id)
        .eq("commission_status", "pending_confirmation")
        .single();

      if (quoteError || !quote) {
        return new Response(
          JSON.stringify({ error: "Quote not found or not in pending_confirmation status" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      let updateData: Record<string, unknown>;

      if (deviation) {
        // Partner reported a deviation - recalculate commission
        const commissionPercentage = quote.commission_percentage ?? partner.accommodation_commission_percentage ?? 10;
        const newCommission = deviation.actualAmount * (commissionPercentage / 100);

        updateData = {
          commission_status: "confirmed",
          actual_invoiced_excl_vat: deviation.actualAmount,
          deviation_reason: deviation.reason,
          invoiced_amount: deviation.actualAmount,
          commission_amount: Math.round(newCommission * 100) / 100,
        };
      } else {
        // Partner confirmed pro forma is correct
        updateData = {
          commission_status: "confirmed",
          invoiced_amount: quote.proforma_amount_excl_vat,
          commission_amount: quote.proforma_commission,
        };
      }

      const { error: updateError } = await supabase
        .from("accommodation_quotes")
        .update(updateData)
        .eq("id", itemId);

      if (updateError) {
        throw updateError;
      }

      // Create admin todo
      const commissionAmount = deviation 
        ? deviation.actualAmount * ((quote.commission_percentage ?? partner.accommodation_commission_percentage ?? 10) / 100)
        : quote.proforma_commission;

      await supabase.from("admin_todos").insert({
        title: `Logies commissie factureren: ${partner.name}`,
        description: deviation
          ? `Afwijkend bedrag gemeld. Commissie €${commissionAmount?.toFixed(2)} voor ${quote.accommodation_name}. Reden: ${deviation.reason}`
          : `Commissie €${commissionAmount?.toFixed(2)} voor ${quote.accommodation_name}`,
        priority: deviation ? "high" : "normal",
        status: "todo",
        auto_type: "accommodation_commission_ready",
        auto_entity_id: itemId,
        related_partner_id: partner.id,
      });

      return new Response(
        JSON.stringify({ 
          success: true, 
          commission: {
            amount: deviation ? commissionAmount : quote.proforma_commission,
            hasDeviation: !!deviation,
          }
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Error in confirm-partner-commission:", error);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
