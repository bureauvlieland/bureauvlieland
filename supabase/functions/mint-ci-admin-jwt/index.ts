// mint-ci-admin-jwt — exchanges shared CI secret for a short-lived admin
// session JWT, eliminating the "ADMIN_JWT expired" problem in CI.
// Batch 5 #6.
//
// Auth: header `x-ci-secret` MUST equal env CI_FIXTURE_SECRET.
// Returns { access_token, expires_at } from signing in a known CI admin user
// (CI_ADMIN_EMAIL/CI_ADMIN_PASSWORD, configured as secrets).
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-ci-secret",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const secret = req.headers.get("x-ci-secret") ?? "";
    const expected = Deno.env.get("CI_FIXTURE_SECRET") ?? "";
    if (!expected || secret !== expected) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const email = Deno.env.get("CI_ADMIN_EMAIL");
    const password = Deno.env.get("CI_ADMIN_PASSWORD");
    if (!email || !password) {
      return new Response(JSON.stringify({ error: "ci_admin_credentials_missing" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use the publishable/anon key — signInWithPassword does not need service role.
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!
    );

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data?.session) {
      return new Response(JSON.stringify({ error: "signin_failed", detail: error?.message }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({
      access_token: data.session.access_token,
      expires_at: data.session.expires_at,
      token_type: data.session.token_type,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("mint-ci-admin-jwt error:", e);
    return new Response(JSON.stringify({ error: String((e as Error).message ?? e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
