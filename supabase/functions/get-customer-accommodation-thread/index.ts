import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { customerToken, quoteId } = await req.json();
    if (!customerToken || !quoteId) {
      return new Response(JSON.stringify({ error: "customerToken en quoteId verplicht" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: pr } = await supabase
      .from("program_requests")
      .select("id, expires_at")
      .eq("customer_token", customerToken)
      .maybeSingle();
    if (!pr || new Date(pr.expires_at) < new Date()) {
      return new Response(JSON.stringify({ error: "Ongeldig of verlopen token" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: quote } = await supabase
      .from("accommodation_quotes")
      .select("id, request_id, accommodation_name, accommodation_requests!inner(linked_program_id)")
      .eq("id", quoteId)
      .maybeSingle();
    if (!quote || (quote as any).accommodation_requests?.linked_program_id !== pr.id) {
      return new Response(JSON.stringify({ error: "Offerte hoort niet bij dit programma" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: messages, error } = await supabase
      .from("project_communications")
      .select("id, direction, subject, content, contact_name, communication_date, metadata")
      .eq("accommodation_id", quote.request_id)
      .eq("audience", "customer_partner")
      .order("communication_date", { ascending: true });

    if (error) throw error;

    return new Response(
      JSON.stringify({
        messages: messages || [],
        accommodation_name: quote.accommodation_name,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("get-customer-accommodation-thread error:", err);
    return new Response(JSON.stringify({ error: "Kon berichten niet ophalen" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
