import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { partnerToken, itemId, invoicedAmount, invoicedNumber, invoicedDate, notes } = await req.json();

    if (!partnerToken || !itemId || !invoicedAmount || !invoicedNumber || !invoicedDate) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify partner token
    const { data: partner, error: partnerError } = await supabase
      .from("partners")
      .select("*")
      .eq("partner_token", partnerToken)
      .eq("is_active", true)
      .single();

    if (partnerError || !partner) {
      return new Response(
        JSON.stringify({ error: "Invalid partner token" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify item belongs to this partner
    const { data: item, error: itemError } = await supabase
      .from("program_request_items")
      .select("*, program_requests!inner(customer_name, customer_email)")
      .eq("id", itemId)
      .eq("provider_id", partner.id)
      .single();

    if (itemError || !item) {
      return new Response(
        JSON.stringify({ error: "Item not found or not assigned to this partner" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Calculate commission
    const commissionPercentage = partner.commission_percentage;
    const commissionAmount = (invoicedAmount * commissionPercentage) / 100;

    // Update item with invoice details
    const { error: updateError } = await supabase
      .from("program_request_items")
      .update({
        invoiced_amount: invoicedAmount,
        invoiced_number: invoicedNumber,
        invoiced_date: invoicedDate,
        commission_percentage: commissionPercentage,
        commission_amount: commissionAmount,
        commission_status: commissionPercentage > 0 ? "pending" : "not_applicable",
        commission_notes: notes || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", itemId);

    if (updateError) {
      console.error("Error updating item:", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to register invoice" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Log to history
    await supabase.from("program_request_history").insert({
      request_id: item.request_id,
      item_id: itemId,
      action: "invoice_registered",
      actor: "partner",
      actor_name: partner.name,
      new_value: {
        invoiced_amount: invoicedAmount,
        invoiced_number: invoicedNumber,
        invoiced_date: invoicedDate,
        commission_percentage: commissionPercentage,
        commission_amount: commissionAmount,
      },
      notes: `Partner heeft factuur ${invoicedNumber} geregistreerd (€${invoicedAmount})`,
    });

    // TODO: Send notification email to Bureau Vlieland

    return new Response(
      JSON.stringify({
        success: true,
        commission: {
          percentage: commissionPercentage,
          amount: commissionAmount,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in register-partner-invoice:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
