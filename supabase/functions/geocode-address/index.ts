// Geocode a Dutch/EU address via OpenStreetMap Nominatim (no API key).
// Returns { lat, lng, display_name } or 404 if not found.
// Batch 4 #9 — fallback for lat/lng validation trigger.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  try {
    const { address } = await req.json().catch(() => ({ address: "" }));
    if (!address || typeof address !== "string" || address.trim().length < 3) {
      return new Response(JSON.stringify({ error: "address required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=nl&q=${encodeURIComponent(address)}`;
    const res = await fetch(url, {
      headers: { "User-Agent": "BureauVlieland/1.0 (geocode-address edge function)" },
    });
    if (!res.ok) {
      return new Response(JSON.stringify({ error: "geocoder_failed", status: res.status }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const hits = await res.json();
    if (!Array.isArray(hits) || hits.length === 0) {
      return new Response(JSON.stringify({ error: "not_found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const hit = hits[0];
    return new Response(JSON.stringify({
      lat: Number(hit.lat),
      lng: Number(hit.lon),
      display_name: hit.display_name,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("geocode-address error:", e);
    return new Response(JSON.stringify({ error: "internal_error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
