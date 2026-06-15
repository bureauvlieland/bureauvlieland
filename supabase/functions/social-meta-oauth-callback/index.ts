// Handles Meta OAuth redirect. Exchanges code -> long-lived user token -> page token + IG account.
// Saves to social_settings. Redirects user back to return_url with status.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const GRAPH = "https://graph.facebook.com/v21.0";

function html(message: string, returnUrl?: string, ok = false) {
  const safeUrl = returnUrl?.replace(/"/g, "") ?? "";
  const color = ok ? "#16a34a" : "#dc2626";
  return `<!doctype html><html><head><meta charset="utf-8"><title>Meta koppeling</title>
<style>body{font-family:system-ui;background:#f8fafc;display:flex;align-items:center;justify-content:center;height:100vh;margin:0}
.card{background:#fff;padding:32px;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,.08);max-width:480px;text-align:center}
h1{color:${color};font-size:18px;margin:0 0 12px}p{color:#475569;font-size:14px;margin:0 0 16px}
a{display:inline-block;background:#0f172a;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none}</style></head>
<body><div class="card"><h1>${ok ? "✓ Meta gekoppeld" : "Koppeling mislukt"}</h1>
<p>${message}</p>${safeUrl ? `<a href="${safeUrl}">Terug naar instellingen</a>` : ""}
${safeUrl && ok ? `<script>setTimeout(()=>location.href=${JSON.stringify(safeUrl)},1500)</script>` : ""}
</div></body></html>`;
}

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const stateRaw = url.searchParams.get("state");
  const error = url.searchParams.get("error_description") || url.searchParams.get("error");

  let returnUrl: string | undefined;
  try {
    if (stateRaw) returnUrl = JSON.parse(atob(stateRaw)).r;
  } catch { /* ignore */ }

  if (error) return new Response(html(`Meta gaf een foutmelding: ${error}`, returnUrl), { headers: { "Content-Type": "text/html" } });
  if (!code || !stateRaw) return new Response(html("Geen code ontvangen.", returnUrl), { headers: { "Content-Type": "text/html" } });

  const APP_ID = Deno.env.get("META_APP_ID");
  const APP_SECRET = Deno.env.get("META_APP_SECRET");
  if (!APP_ID || !APP_SECRET) {
    return new Response(html("META_APP_ID of META_APP_SECRET ontbreekt op de server.", returnUrl), { headers: { "Content-Type": "text/html" } });
  }

  const projectRef = (Deno.env.get("SUPABASE_URL") || "").match(/https:\/\/([^.]+)\./)?.[1];
  const redirectUri = `https://${projectRef}.supabase.co/functions/v1/social-meta-oauth-callback`;

  try {
    // 1) code -> short-lived user token
    const tok1 = await fetch(`${GRAPH}/oauth/access_token?client_id=${APP_ID}&client_secret=${APP_SECRET}&redirect_uri=${encodeURIComponent(redirectUri)}&code=${code}`);
    const tok1Json = await tok1.json();
    if (!tok1Json.access_token) throw new Error("Code-exchange faalde: " + JSON.stringify(tok1Json));

    // 2) -> long-lived user token (~60d)
    const tok2 = await fetch(`${GRAPH}/oauth/access_token?grant_type=fb_exchange_token&client_id=${APP_ID}&client_secret=${APP_SECRET}&fb_exchange_token=${tok1Json.access_token}`);
    const tok2Json = await tok2.json();
    const longUserToken = tok2Json.access_token;
    if (!longUserToken) throw new Error("Long-lived exchange faalde: " + JSON.stringify(tok2Json));

    // 3) Get pages
    const pagesResp = await fetch(`${GRAPH}/me/accounts?fields=id,name,access_token,instagram_business_account{id,username}&access_token=${longUserToken}`);
    const pagesJson = await pagesResp.json();
    const pages = pagesJson.data || [];
    if (!pages.length) throw new Error("Geen Facebook Pages gevonden voor dit account.");

    // Pick the page that has an Instagram business account, fallback to first
    const page = pages.find((p: { instagram_business_account?: unknown }) => p.instagram_business_account) || pages[0];
    const pageToken: string = page.access_token; // page tokens derived from long-lived user token are long-lived
    const igId: string | null = page.instagram_business_account?.id ?? null;
    const igUsername: string | null = page.instagram_business_account?.username ?? null;

    // 4) Save to social_settings
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: existing } = await admin.from("social_settings").select("id").limit(1).maybeSingle();

    const payload: Record<string, unknown> = {
      meta_page_id: page.id,
      meta_page_name: page.name,
      meta_page_token: pageToken,
      meta_ig_user_id: igId,
      meta_ig_username: igUsername,
      meta_connected_at: new Date().toISOString(),
      // page tokens are typically long-lived (no expiry); store 55d as a refresh anchor
      meta_token_expires_at: new Date(Date.now() + 55 * 24 * 60 * 60 * 1000).toISOString(),
    };

    if (existing?.id) {
      await admin.from("social_settings").update(payload).eq("id", existing.id);
    } else {
      await admin.from("social_settings").insert({ id: "default", ...payload });
    }

    return new Response(
      html(`Page: ${page.name}${igUsername ? ` · IG: @${igUsername}` : " · geen Instagram-account gevonden"}`, returnUrl, true),
      { headers: { "Content-Type": "text/html" } }
    );
  } catch (e) {
    return new Response(html(String(e), returnUrl), { headers: { "Content-Type": "text/html" } });
  }
});
