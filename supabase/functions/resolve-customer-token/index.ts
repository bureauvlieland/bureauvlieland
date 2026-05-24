// Resolves a customer_token against program_requests without exposing any PII.
// Used by SharedProgram fallback: legacy email links pointed at /programma/:token
// but the real portal lives at /mijn-programma/:token.
//
// Returns: { exists: boolean }
//
// Public endpoint (no auth) — only confirms existence of a non-expired token.

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface Body {
  token?: unknown;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = (await req.json().catch(() => ({}))) as Body;
    const token = typeof body.token === "string" ? body.token.trim() : "";

    if (!token || token.length < 8 || token.length > 128) {
      return new Response(
        JSON.stringify({ error: "invalid_token" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data, error } = await supabase
      .from("program_requests")
      .select("customer_token")
      .eq("customer_token", token)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();

    if (error) {
      console.error("resolve-customer-token error:", error);
      return new Response(
        JSON.stringify({ error: "lookup_failed" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    return new Response(
      JSON.stringify({ exists: !!data }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    console.error("resolve-customer-token unexpected:", err);
    return new Response(
      JSON.stringify({ error: "internal_error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
