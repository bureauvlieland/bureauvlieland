// Tijdelijke exportfunctie voor de verhuizing van Lovable Cloud naar een eigen
// Supabase-project. Onder Lovable Cloud is er geen service-role key of
// databasetoegang voor de eigenaar; deze functie draait binnen het oude project
// en geeft, alleen aan een ingelogde admin, de lijst met opgeslagen bestanden
// plus tijdelijke downloadlinks. scripts/migrate-storage.ts haalt die op en
// zet ze in het nieuwe project. Na de verhuizing kan deze functie weg.
//
// GET  ?mode=buckets                 → alle buckets (naam, public, limieten)
// GET  ?bucket=<id>&after=<name>     → max 500 objecten na <name> (alfabetisch), met signed url
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const PAGE = 500;
const SIGNED_URL_TTL = 60 * 60; // 1 uur

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
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

  const params = new URL(req.url).searchParams;
  if (params.get("mode") === "buckets") {
    const { data, error } = await admin.storage.listBuckets();
    if (error) return json({ error: error.message }, 500);
    return json({
      buckets: data.map((b) => ({
        id: b.id,
        public: b.public,
        file_size_limit: b.file_size_limit ?? null,
        allowed_mime_types: b.allowed_mime_types ?? null,
      })),
    });
  }

  const bucket = params.get("bucket");
  if (!bucket) return json({ error: "bucket ontbreekt" }, 400);
  const after = params.get("after") ?? "";

  // Via de storage-API (de tabel storage.objects is via PostgREST niet
  // bereikbaar: "Invalid schema: storage"). Die geeft per map één niveau,
  // dus recursief doorlopen; daarna alfabetisch pagineren op naam.
  async function walk(prefix: string): Promise<Array<{ name: string; metadata: Record<string, unknown> | null }>> {
    const out: Array<{ name: string; metadata: Record<string, unknown> | null }> = [];
    for (let offset = 0; ; offset += 1000) {
      const { data, error } = await admin.storage.from(bucket!).list(prefix, {
        limit: 1000, offset, sortBy: { column: "name", order: "asc" },
      });
      if (error) throw new Error(error.message);
      for (const e of data ?? []) {
        const name = prefix ? `${prefix}/${e.name}` : e.name;
        if (e.id === null) out.push(...await walk(name));
        else if (e.name !== ".emptyFolderPlaceholder") out.push({ name, metadata: (e.metadata ?? null) as Record<string, unknown> | null });
      }
      if ((data ?? []).length < 1000) break;
    }
    return out;
  }
  let objects: Array<{ name: string; metadata: Record<string, unknown> | null }>;
  try {
    objects = (await walk("")).filter((o) => o.name > after).sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0)).slice(0, PAGE);
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }

  const names = (objects ?? []).map((o) => o.name as string).filter((n) => !n.endsWith("/"));
  let signed: Array<{ path: string | null; signedUrl: string | null; error: string | null }> = [];
  if (names.length > 0) {
    const { data: urls, error: signErr } = await admin.storage.from(bucket).createSignedUrls(names, SIGNED_URL_TTL);
    if (signErr) return json({ error: signErr.message }, 500);
    signed = urls ?? [];
  }
  const byPath = new Map(signed.map((s) => [s.path, s]));
  const items = (objects ?? []).map((o) => {
    const s = byPath.get(o.name as string);
    const meta = (o.metadata ?? {}) as Record<string, unknown>;
    return {
      name: o.name as string,
      mimetype: (meta.mimetype as string | undefined) ?? null,
      size: (meta.size as number | undefined) ?? null,
      signedUrl: s?.signedUrl ?? null,
      error: s?.error ?? null,
    };
  });
  return json({
    bucket,
    items,
    next: items.length === PAGE ? items[items.length - 1].name : null,
  });
});
