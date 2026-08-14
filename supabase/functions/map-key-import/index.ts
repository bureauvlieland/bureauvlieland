import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { isAllowedMapSecretName } from "../_shared/map.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Niet geauthenticeerd" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, anon, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) return json({ error: "Niet geauthenticeerd" }, 401);

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: isAdmin } = await admin.rpc("has_role", {
      _user_id: userData.user.id,
      _role: "admin",
    });
    if (!isAdmin) return json({ error: "Alleen admins mogen sleutels importeren" }, 403);

    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    const partnerId = typeof body?.partnerId === "string" ? body.partnerId.trim() : "";
    const secretName = typeof body?.secretName === "string" ? body.secretName.trim() : "";
    const tenantSlugRaw = typeof body?.tenantSlug === "string" ? body.tenantSlug.trim() : "";

    if (!partnerId) return json({ error: "partnerId ontbreekt." }, 400);
    if (!isAllowedMapSecretName(secretName)) {
      return json({ error: "secretName ontbreekt of is niet toegestaan." }, 400);
    }
    if (tenantSlugRaw && !/^[a-z0-9-]{2,60}$/i.test(tenantSlugRaw)) {
      return json({ error: "tenantSlug is ongeldig." }, 400);
    }

    const apiKey = Deno.env.get(secretName);
    if (!apiKey) return json({ error: `Secret ${secretName} is niet geconfigureerd.` }, 400);

    const { data: partner, error: partnerErr } = await admin
      .from("partners")
      .select("id, name, map_tenant_slug")
      .eq("id", partnerId)
      .maybeSingle();
    if (partnerErr) return json({ error: "Partner kon niet worden opgehaald." }, 500);
    if (!partner) return json({ error: "Partner niet gevonden." }, 404);

    const tenantSlug = tenantSlugRaw || (partner.map_tenant_slug as string | null) || "";
    if (!tenantSlug) return json({ error: "Deze partner heeft nog geen tenantSlug." }, 400);

    const { error: updateErr } = await admin
      .from("partners")
      .update({ map_api_key: apiKey, map_tenant_slug: tenantSlug })
      .eq("id", partnerId);
    if (updateErr) {
      console.error("map-key-import update failed:", updateErr.message);
      return json({ error: "Opslaan van de sleutel is mislukt." }, 500);
    }

    // Nooit de sleutel (of een deel daarvan) teruggeven.
    return json({
      ok: true,
      partnerId,
      partnerName: partner.name ?? null,
      tenantSlug,
      keySet: true,
      keyLength: apiKey.length,
    });
  } catch (error) {
    console.error("map-key-import error:", error instanceof Error ? error.message : String(error));
    return json({ error: "Onverwachte fout." }, 500);
  }
});
