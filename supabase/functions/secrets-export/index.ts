// Tijdelijke exportfunctie voor de verhuizing van Lovable Cloud naar een eigen
// Supabase-project. De secrets van edge functions staan niet in de database-
// export en het oude project heeft geen beheerderstoegang voor de eigenaar;
// de functies zelf kunnen hun secrets wél lezen. Deze functie geeft, alleen
// aan een ingelogde admin, de waarden van een vaste lijst namen terug.
// supabase/scripts/run-migration.sh secrets haalt ze op en zet ze via de
// beheer-API in het nieuwe project, zonder ze te tonen. Na de verhuizing
// moet deze functie weg (Lovable: "verwijder de edge function secrets-export").
//
// GET → { secrets: { NAAM: waarde, … }, missing: [namen zonder waarde] }
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const NAMES = [
  // Mail
  "MAILJET_API_KEY", "MAILJET_SECRET_KEY", "MAILJET_FROM_EMAIL", "MAILJET_SENDER_EMAIL",
  "MAILJET_SENDER_NAME", "MAILJET_TEST_MODE", "MAILJET_WEBHOOK_TOKEN",
  "MAILJET_INBOUND_WEBHOOK_SECRET", "MAILJET_INBOUND_WEBHOOK_TOKEN", "ADMIN_ALERT_EMAIL",
  // WhatsApp
  "TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_API_KEY_SID", "TWILIO_API_KEY_SECRET",
  "TWILIO_WHATSAPP_NUMBER", "WHATSAPP_DIAG_SECRET",
  // Koppelingen
  "MAP_API_KEY", "DOEKSEN_API_KEY", "GEOAPIFY_API_KEY", "GOOGLE_PLACES_API_KEY",
  // Zelftest
  "CI_ADMIN_EMAIL", "CI_ADMIN_PASSWORD", "CI_FIXTURE_SECRET",
];

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "GET") return json({ error: "GET only" }, 405);

  const url = Deno.env.get("SUPABASE_URL")!;
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "Niet geautoriseerd" }, 401);

  const userClient = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: claims, error: claimsErr } = await userClient.auth.getClaims(
    authHeader.replace("Bearer ", ""),
  );
  const userId = claims?.claims?.sub;
  if (claimsErr || !userId) return json({ error: "Niet geautoriseerd" }, 401);

  const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: role } = await admin
    .from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
  if (!role) return json({ error: "Geen admin rechten" }, 403);

  const secrets: Record<string, string> = {};
  const missing: string[] = [];
  for (const name of NAMES) {
    const v = Deno.env.get(name);
    if (v && v.trim()) secrets[name] = v; else missing.push(name);
  }
  return json({ secrets, missing });
});
