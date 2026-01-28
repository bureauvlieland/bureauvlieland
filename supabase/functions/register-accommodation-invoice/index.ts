// Deprecated: import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RegisterInvoiceRequest {
  quoteId: string;
  partnerToken: string;
  invoicedAmount: number;
  invoicedNumber: string;
  invoicedDate: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { quoteId, partnerToken, invoicedAmount, invoicedNumber, invoicedDate }: RegisterInvoiceRequest = await req.json();

    // Validate input
    if (!quoteId || !partnerToken || !invoicedAmount || !invoicedNumber || !invoicedDate) {
      return new Response(
        JSON.stringify({ error: "Alle velden zijn verplicht" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Find partner by token
    const { data: partner, error: partnerError } = await supabase
      .from("partners")
      .select("id, name")
      .eq("partner_token", partnerToken)
      .eq("is_active", true)
      .maybeSingle();

    if (partnerError || !partner) {
      console.error("Partner not found:", partnerError);
      return new Response(
        JSON.stringify({ error: "Partner niet gevonden" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Find the quote and verify ownership
    const { data: quote, error: quoteError } = await supabase
      .from("accommodation_quotes")
      .select("*, accommodation_requests(customer_name, customer_company)")
      .eq("id", quoteId)
      .eq("partner_id", partner.id)
      .maybeSingle();

    if (quoteError || !quote) {
      console.error("Quote not found:", quoteError);
      return new Response(
        JSON.stringify({ error: "Offerte niet gevonden of geen toegang" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify quote status
    if (quote.status !== "selected") {
      return new Response(
        JSON.stringify({ error: "Factuur kan alleen worden geregistreerd voor geaccepteerde offertes" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if already invoiced
    if (quote.invoiced_number) {
      return new Response(
        JSON.stringify({ error: "Er is al een factuur geregistreerd voor deze offerte" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Calculate commission based on actual invoiced amount
    const commissionPercentage = quote.commission_percentage || 10;
    const commissionAmount = (invoicedAmount * commissionPercentage) / 100;

    // Update quote with invoice data
    const { error: updateError } = await supabase
      .from("accommodation_quotes")
      .update({
        invoiced_amount: invoicedAmount,
        invoiced_number: invoicedNumber,
        invoiced_date: invoicedDate,
        commission_amount: commissionAmount,
        commission_status: "pending",
        updated_at: new Date().toISOString(),
      })
      .eq("id", quoteId);

    if (updateError) {
      console.error("Update error:", updateError);
      throw new Error("Fout bij registreren factuur");
    }

    console.log(`Invoice registered for quote ${quoteId} by partner ${partner.name}: €${invoicedAmount} (commission: €${commissionAmount.toFixed(2)})`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Factuur succesvol geregistreerd",
        commission: {
          percentage: commissionPercentage,
          amount: commissionAmount,
        }
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in register-accommodation-invoice:", error);
    return new Response(
      JSON.stringify({ error: "Er ging iets mis bij het registreren van de factuur" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
