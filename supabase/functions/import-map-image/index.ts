import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify the caller (partner or admin)
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const { blockId, mapImageRef } = body as {
      blockId?: string;
      mapImageRef?: string;
    };
    if (!blockId || !mapImageRef) {
      return new Response(JSON.stringify({ error: "missing fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey);

    // Authorization: must own the block or be admin
    const { data: roleRow } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("role", "admin")
      .maybeSingle();
    const isAdmin = !!roleRow;

    const { data: block, error: blockErr } = await admin
      .from("building_blocks")
      .select("id, provider_id")
      .eq("id", blockId)
      .maybeSingle();
    if (blockErr || !block) {
      return new Response(JSON.stringify({ error: "block not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!isAdmin) {
      const { data: partner } = await admin
        .from("partners")
        .select("id")
        .eq("auth_user_id", userData.user.id)
        .eq("is_active", true)
        .maybeSingle();
      if (!partner || partner.id !== block.provider_id) {
        return new Response(JSON.stringify({ error: "forbidden" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Fetch image from MAP
    const url = `https://portal.mijnactiviteitenplanner.nl/File/Get?reference=${encodeURIComponent(mapImageRef)}`;
    const imgRes = await fetch(url);
    if (!imgRes.ok) {
      return new Response(
        JSON.stringify({ error: `image fetch failed (${imgRes.status})` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const contentType = imgRes.headers.get("content-type") || "image/jpeg";
    const ext = contentType.includes("png")
      ? "png"
      : contentType.includes("webp")
      ? "webp"
      : "jpg";
    const arrayBuf = await imgRes.arrayBuffer();

    const filePath = `${blockId}.${ext}`;
    const { error: upErr } = await admin.storage
      .from("building-block-images")
      .upload(filePath, new Uint8Array(arrayBuf), {
        upsert: true,
        contentType,
      });
    if (upErr) throw upErr;

    const { data: pub } = admin.storage
      .from("building-block-images")
      .getPublicUrl(filePath);
    const publicUrl = pub.publicUrl;

    await admin
      .from("building_blocks")
      .update({ image_url: publicUrl })
      .eq("id", blockId);

    return new Response(JSON.stringify({ image_url: publicUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("import-map-image error", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
