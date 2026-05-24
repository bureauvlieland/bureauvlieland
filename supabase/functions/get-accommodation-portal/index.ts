import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { token } = await req.json();
    if (!token || typeof token !== "string") {
      return new Response(JSON.stringify({ error: "Token vereist" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Fetch the accommodation request
    const { data: requestData, error: requestError } = await supabase
      .from("accommodation_requests")
      .select("*, linked_program:program_requests!accommodation_requests_linked_program_id_fkey(customer_token)")
      .eq("customer_token", token)
      .maybeSingle();

    if (requestError) {
      console.error("request error", requestError);
      return new Response(JSON.stringify({ error: "Fout bij ophalen aanvraag" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!requestData) {
      return new Response(JSON.stringify({ error: "Aanvraag niet gevonden of verlopen" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check token expiration
    if (requestData.expires_at && new Date(requestData.expires_at) < new Date()) {
      return new Response(JSON.stringify({ error: "Aanvraag is verlopen" }), {
        status: 410,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch quotes
    const { data: quotesData, error: quotesError } = await supabase
      .from("accommodation_quotes")
      .select(`
        *,
        partner:partners(
          id, name, website_url,
          address_street, address_postal, address_city,
          location_lat, location_lng, location_description,
          gallery_images, about_text, highlight_features,
          terms_pdf_path, uses_default_terms
        )
      `)
      .eq("request_id", requestData.id)
      .in("status", ["submitted", "selected", "expired", "declined"])
      .order("price_per_person_per_night", { ascending: true });

    if (quotesError) {
      console.error("quotes error", quotesError);
    }

    return new Response(
      JSON.stringify({
        request: requestData,
        quotes: quotesData || [],
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("unexpected error", err);
    return new Response(JSON.stringify({ error: "Onverwachte fout" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
