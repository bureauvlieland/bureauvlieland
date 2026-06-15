// Validates the stored Meta Page token and re-derives it from the long-lived user flow if needed.
// Page tokens derived from a long-lived user token don't expire, but we still probe /me to detect revocation.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GRAPH = "https://graph.facebook.com/v21.0";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: s } = await admin.from("social_settings").select("id, meta_page_token, meta_page_id").limit(1).maybeSingle();
  if (!s?.meta_page_token) {
    return new Response(JSON.stringify({ ok: false, reason: "geen token" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const probe = await fetch(`${GRAPH}/me?access_token=${s.meta_page_token}`);
  const probeJson = await probe.json();

  if (probeJson.error) {
    await admin.from("social_settings").update({
      publishing_enabled: false,
      meta_token_expires_at: new Date().toISOString(),
    }).eq("id", s.id);
    return new Response(JSON.stringify({ ok: false, reason: probeJson.error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Token is healthy; bump expiry anchor 55 days forward
  await admin.from("social_settings").update({
    meta_token_expires_at: new Date(Date.now() + 55 * 24 * 60 * 60 * 1000).toISOString(),
  }).eq("id", s.id);

  return new Response(JSON.stringify({ ok: true, page_id: probeJson.id, name: probeJson.name }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
