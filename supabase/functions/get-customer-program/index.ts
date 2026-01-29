import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const token = url.searchParams.get("token");

    if (!token) {
      return new Response(
        JSON.stringify({ error: "Token is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch program request
    const { data: program, error: programError } = await supabase
      .from("program_requests")
      .select("*")
      .eq("customer_token", token)
      .gt("expires_at", new Date().toISOString())
      .single();

    if (programError || !program) {
      return new Response(
        JSON.stringify({ error: "Program not found or expired" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch items
    const { data: items, error: itemsError } = await supabase
      .from("program_request_items")
      .select("*")
      .eq("request_id", program.id)
      .order("day_index", { ascending: true })
      .order("preferred_time", { ascending: true, nullsFirst: false });

    if (itemsError) {
      throw itemsError;
    }

    // Fetch accepted terms log (if terms have been accepted)
    let acceptedTerms: any[] = [];
    if (program.terms_accepted_at) {
      const { data: termsData, error: termsError } = await supabase
        .from("accepted_terms_log")
        .select("*")
        .eq("request_id", program.id)
        .order("created_at", { ascending: true });

      if (!termsError && termsData) {
        acceptedTerms = termsData;
      }
    }

    return new Response(
      JSON.stringify({
        program: {
          ...program,
          items: items || [],
          acceptedTerms: acceptedTerms,
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error fetching customer program:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
