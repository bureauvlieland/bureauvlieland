import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MAP_BASE_URL = "https://portal.mijnactiviteitenplanner.nl/api/v1";

async function getApiKeyForPartner(partnerId: string | null, slug: string): Promise<string> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Try partner-specific key first
  const query = partnerId
    ? supabase.from("partners").select("map_api_key").eq("id", partnerId).single()
    : supabase.from("partners").select("map_api_key").eq("map_tenant_slug", slug).single();

  const { data } = await query;
  if (data?.map_api_key) return data.map_api_key;

  // Fallback to central key
  const centralKey = Deno.env.get("MAP_API_KEY");
  if (centralKey) return centralKey;

  throw new Error("No MAP API key found for this partner");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { endpoint, slug, partnerId, params } = body as {
      endpoint: string;
      slug: string;
      partnerId?: string;
      params?: Record<string, string>;
    };

    if (!endpoint || !slug) {
      return new Response(
        JSON.stringify({ error: "Missing endpoint or slug" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const apiKey = await getApiKeyForPartner(partnerId || null, slug);

    const url = new URL(`${MAP_BASE_URL}/${endpoint}`);
    url.searchParams.set("slug", slug);
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        url.searchParams.set(key, value);
      }
    }

    console.log(`MAP Proxy: GET ${url.toString()}`);

    const mapResponse = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "X-Api-Key": apiKey,
        Accept: "application/json",
      },
    });

    if (!mapResponse.ok) {
      const errorText = await mapResponse.text();
      console.error(`MAP API error [${mapResponse.status}]: ${errorText}`);
      return new Response(
        JSON.stringify({
          error: `MAP API returned ${mapResponse.status}`,
          details: errorText,
        }),
        {
          status: mapResponse.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const data = await mapResponse.json();

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("MAP proxy error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
