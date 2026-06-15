import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/**
 * social-publish
 * Publiceert ingeplande posts naar Meta (Instagram + Facebook).
 * Respecteert `publishing_enabled` in social_settings.
 * Pakt alle posts met status='scheduled' AND scheduled_for <= now().
 *
 * Auth: service_role (cron) of admin (Authorization header).
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: settings } = await supabase
      .from("social_settings")
      .select("*")
      .limit(1)
      .maybeSingle();

    if (!settings?.publishing_enabled) {
      return json({ ok: true, message: "publishing_enabled=false; alleen conceptmodus", published: 0 });
    }

    const pageId = settings.meta_page_id;
    const igUserId = settings.meta_ig_user_id;
    const token = (settings as Record<string, unknown>).meta_token_encrypted as string | null;
    if (!pageId || !token) {
      return json({ error: "Meta-koppeling onvolledig (page_id of token ontbreekt)" }, 400);
    }

    const { data: posts } = await supabase
      .from("social_posts")
      .select("*")
      .eq("status", "scheduled")
      .lte("scheduled_for", new Date().toISOString())
      .limit(10);

    let published = 0;
    for (const post of posts ?? []) {
      const channels = (post.channels as string[]) ?? [];
      const mediaUrl = (post.media_urls as string[])?.[0];
      const fullCaption = `${post.caption}\n\n${(post.hashtags as string[])?.join(" ") ?? ""}`.trim();
      const externalIds: Record<string, string> = {};
      const permalinks: Record<string, string> = {};
      let errorMsg: string | null = null;

      try {
        if (channels.includes("instagram") && igUserId && mediaUrl) {
          // IG: container -> publish
          const containerRes = await fetch(`https://graph.facebook.com/v21.0/${igUserId}/media`, {
            method: "POST",
            body: new URLSearchParams({
              image_url: mediaUrl,
              caption: fullCaption,
              access_token: token,
            }),
          });
          const containerData = await containerRes.json();
          if (!containerData.id) throw new Error(`IG container: ${JSON.stringify(containerData)}`);
          const publishRes = await fetch(`https://graph.facebook.com/v21.0/${igUserId}/media_publish`, {
            method: "POST",
            body: new URLSearchParams({
              creation_id: containerData.id,
              access_token: token,
            }),
          });
          const publishData = await publishRes.json();
          if (!publishData.id) throw new Error(`IG publish: ${JSON.stringify(publishData)}`);
          externalIds.instagram = publishData.id;
          permalinks.instagram = `https://www.instagram.com/p/${publishData.id}/`;
        }

        if (channels.includes("facebook")) {
          const endpoint = mediaUrl
            ? `https://graph.facebook.com/v21.0/${pageId}/photos`
            : `https://graph.facebook.com/v21.0/${pageId}/feed`;
          const fbBody = new URLSearchParams({
            access_token: token,
            ...(mediaUrl ? { url: mediaUrl, caption: fullCaption } : { message: fullCaption }),
          });
          const fbRes = await fetch(endpoint, { method: "POST", body: fbBody });
          const fbData = await fbRes.json();
          if (!fbData.id && !fbData.post_id) throw new Error(`FB: ${JSON.stringify(fbData)}`);
          externalIds.facebook = fbData.post_id || fbData.id;
          permalinks.facebook = `https://www.facebook.com/${externalIds.facebook}`;
        }

        await supabase
          .from("social_posts")
          .update({
            status: "published",
            published_at: new Date().toISOString(),
            external_ids: externalIds,
            permalinks,
            error_message: null,
          })
          .eq("id", post.id);
        published++;
      } catch (e) {
        errorMsg = String(e);
        console.error("publish error", post.id, errorMsg);
        await supabase
          .from("social_posts")
          .update({ status: "failed", error_message: errorMsg })
          .eq("id", post.id);
      }
    }

    return json({ ok: true, published, attempted: posts?.length ?? 0 });
  } catch (e) {
    console.error(e);
    return json({ error: String(e) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
