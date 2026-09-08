// Nachtelijke synchronisatie: bouwstenen met een gekoppeld MAP-activiteitstype
// nemen foto, beschrijving en duur over uit MijnActiviteitenPlanner; prijs
// alleen als map_sync_price aan staat. Aanroep: cron (apikey-header) of een
// ingelogde admin, optioneel met { blockId } voor één bouwsteen.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { MAP_BASE_URL, mapFetch } from "../_shared/map.ts";
import {
  buildBlockUpdate,
  pickPricePerPerson,
  type MapActivityLike,
  type MapActivityTypeLike,
} from "../_shared/map-sync.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

interface SyncResult {
  blockId: string;
  name: string;
  changed: string[];
  error?: string;
}

async function importImage(
  admin: ReturnType<typeof createClient>,
  blockId: string,
  imageRef: string,
): Promise<string | null> {
  const res = await fetch(`${MAP_BASE_URL}/File/Get?reference=${encodeURIComponent(imageRef)}`);
  if (!res.ok) return null;
  const contentType = res.headers.get("content-type") || "image/jpeg";
  const ext = contentType.includes("png") ? "png" : contentType.includes("webp") ? "webp" : "jpg";
  const filePath = `${blockId}.${ext}`;
  const { error } = await admin.storage
    .from("building-block-images")
    .upload(filePath, new Uint8Array(await res.arrayBuffer()), { upsert: true, contentType });
  if (error) return null;
  return admin.storage.from("building-block-images").getPublicUrl(filePath).data.publicUrl;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    // Toegang: cron (apikey = anon key, geen gebruikers-JWT) of een admin.
    const authHeader = req.headers.get("authorization");
    const apikey = req.headers.get("apikey");
    let allowed = apikey === anonKey && (!authHeader || authHeader === `Bearer ${anonKey}`);
    if (!allowed && authHeader?.startsWith("Bearer ")) {
      const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
      const { data: { user } } = await userClient.auth.getUser();
      if (user) {
        const { data: role } = await admin.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
        allowed = !!role;
      }
    }
    if (!allowed) return json({ error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => ({})) as { blockId?: string };

    let blockQuery = admin
      .from("building_blocks")
      .select("id, name, provider_id, map_activity_type_id, map_sync_price, description, duration, price_adult")
      .not("map_activity_type_id", "is", null)
      .not("provider_id", "is", null);
    if (body.blockId) blockQuery = blockQuery.eq("id", body.blockId);
    const { data: blocks, error: blocksError } = await blockQuery;
    if (blocksError) throw blocksError;
    if (!blocks || blocks.length === 0) return json({ synced: 0, results: [], message: "Geen gekoppelde bouwstenen" });

    const providerIds = Array.from(new Set(blocks.map((b) => b.provider_id as string)));
    const { data: partners } = await admin
      .from("partners")
      .select("id, name, map_tenant_slug, map_api_key")
      .in("id", providerIds)
      .not("map_api_key", "is", null);
    const partnerById = new Map((partners ?? []).map((p) => [p.id as string, p]));

    const today = new Date();
    const until = new Date(today.getTime() + 90 * 86400000);
    const fmt = (d: Date) => d.toISOString().slice(0, 10);

    const results: SyncResult[] = [];
    const now = new Date().toISOString();

    for (const partnerId of providerIds) {
      const partner = partnerById.get(partnerId);
      const partnerBlocks = blocks.filter((b) => b.provider_id === partnerId);
      if (!partner?.map_api_key) {
        for (const b of partnerBlocks) {
          results.push({ blockId: b.id, name: b.name, changed: [], error: "Partner heeft geen MAP-sleutel" });
          await admin.from("building_blocks").update({ map_sync_error: "Partner heeft geen MAP-sleutel" }).eq("id", b.id);
        }
        continue;
      }
      const apiKey = partner.map_api_key as string;
      const typesRes = await mapFetch<MapActivityTypeLike[]>("/api/v1/activitytypes", apiKey);
      if (!typesRes.ok || !Array.isArray(typesRes.data)) {
        for (const b of partnerBlocks) {
          const msg = `MAP activitytypes mislukt (${typesRes.status})`;
          results.push({ blockId: b.id, name: b.name, changed: [], error: msg });
          await admin.from("building_blocks").update({ map_sync_error: msg }).eq("id", b.id);
        }
        continue;
      }
      const needPrices = partnerBlocks.some((b) => b.map_sync_price);
      let activities: MapActivityLike[] = [];
      if (needPrices) {
        const actRes = await mapFetch<MapActivityLike[]>(
          `/api/v1/activities?dateStart=${fmt(today)}&dateEnd=${fmt(until)}`,
          apiKey,
        );
        if (actRes.ok && Array.isArray(actRes.data)) activities = actRes.data;
      }

      for (const b of partnerBlocks) {
        const type = typesRes.data.find((t) => t.Id === b.map_activity_type_id);
        if (!type) {
          const msg = "MAP-activiteitstype bestaat niet meer";
          results.push({ blockId: b.id, name: b.name, changed: [], error: msg });
          await admin.from("building_blocks").update({ map_sync_error: msg }).eq("id", b.id);
          continue;
        }
        const price = b.map_sync_price ? pickPricePerPerson(activities, type.Id) : null;
        const { imageRef, ...fields } = buildBlockUpdate(
          { id: b.id, map_activity_type_id: b.map_activity_type_id, map_sync_price: !!b.map_sync_price, description: b.description, duration: b.duration, price_adult: b.price_adult },
          type,
          price,
        );
        const update: Record<string, unknown> = { ...fields, map_synced_at: now, map_sync_error: null };
        const changed = Object.keys(fields);
        if (imageRef) {
          const imageUrl = await importImage(admin, b.id, imageRef);
          if (imageUrl) {
            update.image_url = imageUrl;
            changed.push("image_url");
          }
        }
        const { error: updErr } = await admin.from("building_blocks").update(update).eq("id", b.id);
        results.push({ blockId: b.id, name: b.name, changed, error: updErr?.message });
      }
    }

    const summary = {
      synced: results.filter((r) => !r.error).length,
      failed: results.filter((r) => r.error).length,
      changed: results.filter((r) => r.changed.length > 0).length,
      results,
    };
    console.log("map-sync-blocks", JSON.stringify({ ...summary, results: undefined }));
    return json(summary);
  } catch (error) {
    console.error("map-sync-blocks error", error);
    return json({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});
