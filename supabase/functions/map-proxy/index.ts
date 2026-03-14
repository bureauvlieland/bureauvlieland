import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MAP_BASE_URL = "https://portal.mijnactiviteitenplanner.nl/api/v1";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const MAP_API_KEY = Deno.env.get("MAP_API_KEY");
    if (!MAP_API_KEY) {
      throw new Error("MAP_API_KEY is not configured");
    }

    // Verify admin
    const authHeader = req.headers.get("Authorization");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const body = await req.json();
    const { endpoint, slug, params } = body as {
      endpoint: string;
      slug: string;
      params?: Record<string, string>;
    };

    if (!endpoint || !slug) {
      return new Response(
        JSON.stringify({ error: "Missing endpoint or slug" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build URL with query params
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
        "X-Api-Key": MAP_API_KEY,
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
