// Returns the Meta OAuth authorize URL. Keeps META_APP_ID server-side.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const META_CONFIG_ID = "1760726228673482";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Admin check
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", user.id);
    const isAdmin = roles?.some((r: { role: string }) => r.role === "admin");
    if (!isAdmin) return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const APP_ID = Deno.env.get("META_APP_ID");
    if (!APP_ID) return new Response(JSON.stringify({ error: "META_APP_ID ontbreekt" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const body = await req.json().catch(() => ({}));
    const returnUrl: string = body.return_url || "https://bureauvlieland.nl/admin/social/instellingen";

    const projectRef = (Deno.env.get("SUPABASE_URL") || "").match(/https:\/\/([^.]+)\./)?.[1];
    const redirectUri = `https://${projectRef}.supabase.co/functions/v1/social-meta-oauth-callback`;

    // State = base64(JSON({ user_id, return_url, nonce }))
    const nonce = crypto.randomUUID();
    const state = btoa(JSON.stringify({ u: user.id, r: returnUrl, n: nonce }));

    const url = new URL("https://www.facebook.com/v21.0/dialog/oauth");
    url.searchParams.set("client_id", APP_ID);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("state", state);
    url.searchParams.set("scope", SCOPES);
    url.searchParams.set("response_type", "code");

    return new Response(JSON.stringify({ url: url.toString() }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
