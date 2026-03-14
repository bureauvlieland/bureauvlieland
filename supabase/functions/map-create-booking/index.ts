import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MAP_BASE_URL = "https://portal.mijnactiviteitenplanner.nl/api/v1";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    const {
      slug,
      activityId,
      activityName,
      departure,
      partnerId,
      customerName,
      customerEmail,
      customerPhone,
      numberOfAdults,
      numberOfChildren,
      totalPrice,
      notes,
    } = body;

    if (!slug || !activityId || !customerName || !customerEmail || !departure || !partnerId) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get partner-specific API key
    const { data: partner } = await supabase
      .from("partners")
      .select("map_api_key")
      .eq("id", partnerId)
      .single();

    const apiKey = partner?.map_api_key || Deno.env.get("MAP_API_KEY");
    if (!apiKey) throw new Error("No MAP API key found for this partner");

    // Create booking on MAP
    const bookingPayload = {
      ActivityId: activityId,
      CustomerName: customerName,
      CustomerEmail: customerEmail,
      CustomerPhone: customerPhone || "",
      NumberOfAdults: numberOfAdults || 1,
      NumberOfChildren: numberOfChildren || 0,
      Notes: notes || `Boeking via Bureau Vlieland`,
      Source: "Bureau Vlieland",
    };

    console.log("Creating MAP booking:", JSON.stringify(bookingPayload));

    const mapResponse = await fetch(`${MAP_BASE_URL}/bookings?slug=${slug}`, {
      method: "POST",
      headers: {
        "X-Api-Key": apiKey,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(bookingPayload),
    });

    let mapBookingId: string | null = null;
    let mapResult: any = null;

    if (mapResponse.ok) {
      mapResult = await mapResponse.json();
      mapBookingId = mapResult?.Id?.toString() || mapResult?.id?.toString() || null;
      console.log("MAP booking created:", mapBookingId);
    } else {
      const errorText = await mapResponse.text();
      console.error(`MAP booking failed [${mapResponse.status}]: ${errorText}`);
    }

    // Calculate commission (10%)
    const commissionPercentage = 10;
    const price = totalPrice || 0;
    const commissionAmount = Math.round(price * (commissionPercentage / 100) * 100) / 100;

    // Store in our database
    const { data: booking, error: dbError } = await supabase
      .from("map_bookings")
      .insert({
        partner_id: partnerId,
        map_tenant_slug: slug,
        map_activity_id: activityId.toString(),
        map_booking_id: mapBookingId,
        activity_name: activityName || "Onbekend",
        departure: departure,
        customer_name: customerName,
        customer_email: customerEmail,
        customer_phone: customerPhone || null,
        number_of_adults: numberOfAdults || 1,
        number_of_children: numberOfChildren || 0,
        total_price: price,
        commission_percentage: commissionPercentage,
        commission_amount: commissionAmount,
        booking_status: mapResponse.ok ? "confirmed" : "failed",
        notes: notes || null,
      })
      .select()
      .single();

    if (dbError) {
      console.error("DB insert error:", dbError);
      throw dbError;
    }

    return new Response(
      JSON.stringify({
        success: mapResponse.ok,
        booking,
        mapBookingId,
        mapError: !mapResponse.ok ? "Boeking kon niet worden aangemaakt in MAP" : null,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("map-create-booking error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
