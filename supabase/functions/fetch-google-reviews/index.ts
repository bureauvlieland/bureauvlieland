// Fetches Bureau Vlieland's reviews from Google Places API (New) and stores them
// in the google_reviews_cache singleton row. Triggered by cron daily, and can be
// invoked manually from the admin.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const API_KEY = Deno.env.get("GOOGLE_PLACES_API_KEY");

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  // Look up the configured Place ID
  const { data: placeSetting } = await supabase
    .from("app_settings")
    .select("value")
    .eq("id", "google_place_id")
    .maybeSingle();

  const placeId = (placeSetting?.value ?? "").toString().replace(/^"|"$/g, "").trim();

  if (!API_KEY) {
    await supabase.from("google_reviews_cache").update({
      last_error: "GOOGLE_PLACES_API_KEY ontbreekt",
      updated_at: new Date().toISOString(),
    }).eq("id", "singleton");
    return json({ error: "GOOGLE_PLACES_API_KEY ontbreekt" }, 500);
  }
  if (!placeId) {
    await supabase.from("google_reviews_cache").update({
      last_error: "google_place_id niet ingesteld in app_settings",
      updated_at: new Date().toISOString(),
    }).eq("id", "singleton");
    return json({ error: "google_place_id niet ingesteld" }, 400);
  }

  try {
    // Places API (New) - GET https://places.googleapis.com/v1/places/{PLACE_ID}
    // Field mask required.
    const url = `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}?languageCode=nl`;
    const res = await fetch(url, {
      headers: {
        "X-Goog-Api-Key": API_KEY,
        "X-Goog-FieldMask":
          "id,displayName,rating,userRatingCount,googleMapsUri,reviews",
      },
    });

    if (!res.ok) {
      const txt = await res.text();
      await supabase.from("google_reviews_cache").update({
        last_error: `Places API ${res.status}: ${txt.slice(0, 500)}`,
        updated_at: new Date().toISOString(),
      }).eq("id", "singleton");
      return json({ error: "Places API error", status: res.status, body: txt }, 502);
    }

    const place = await res.json();

    // Normalize reviews
    const reviews = Array.isArray(place.reviews)
      ? place.reviews.map((r: any) => ({
          author_name: r.authorAttribution?.displayName ?? "Anoniem",
          author_uri: r.authorAttribution?.uri ?? null,
          author_photo: r.authorAttribution?.photoUri ?? null,
          rating: r.rating ?? null,
          text: r.text?.text ?? r.originalText?.text ?? "",
          language: r.text?.languageCode ?? r.originalText?.languageCode ?? null,
          relative_time: r.relativePublishTimeDescription ?? null,
          publish_time: r.publishTime ?? null,
        }))
      : [];

    const payload = {
      place_id: placeId,
      rating: place.rating ?? null,
      review_count: place.userRatingCount ?? 0,
      reviews,
      place_url: place.googleMapsUri ?? null,
      fetched_at: new Date().toISOString(),
      last_error: null,
      updated_at: new Date().toISOString(),
    };

    const { error: upsertErr } = await supabase
      .from("google_reviews_cache")
      .update(payload)
      .eq("id", "singleton");

    if (upsertErr) {
      return json({ error: "DB update failed", details: upsertErr.message }, 500);
    }

    return json({ ok: true, rating: payload.rating, review_count: payload.review_count, reviews_cached: reviews.length });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await supabase.from("google_reviews_cache").update({
      last_error: msg,
      updated_at: new Date().toISOString(),
    }).eq("id", "singleton");
    return json({ error: msg }, 500);
  }
});
