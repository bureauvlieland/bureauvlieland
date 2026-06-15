# Social media planner — vervolg

We pakken op waar we stopten. De drie tabellen (`social_posts`, `social_media_assets`, `social_settings`) en de `social-media` storage bucket staan al klaar. Nu bouwen we de Meta-koppeling, edge functions en admin UI.

## Stappen

### 1. Meta-koppeling (eenmalig door jou)
- Jij maakt: Facebook Page ↔ Instagram Business-account koppeling in Facebook Business Suite, plus een App in Meta for Developers.
- Ik vraag straks `META_APP_ID` en `META_APP_SECRET` aan via de secrets-tool. Jij plakt ze.
- Tot App Review klaar is: alles werkt in **conceptmodus** — genereren, plannen, previews — alleen `social-publish` push staat uit (`publishing_enabled=false` in `social_settings`).

### 2. Admin UI — `/admin/social`
4 tabs:
- **Wachtrij**: concept-posts met IG/FB preview-kaart, caption, hashtags, beeld, kanaal-toggles, datum. Acties: Bewerk · Goedkeuren & inplannen · Nu publiceren · Verwerp.
- **Gepland**: status + publicatietijd, mogelijkheid om terug te trekken.
- **Geplaatst**: Meta-permalinks, basis-stats.
- **Mediabank projecten**: drag-and-drop upload naar `social-media` bucket, koppelen aan project/partner/bouwsteen, "klantnaam afschermen" default aan.

`/admin/social/instellingen`: cadence (default 2-3×/wk, ma/wo/vr 10:00), bronnen aan/uit, tone-of-voice, hashtag-sets, default CTA's, Meta-connectie status + "opnieuw koppelen".

Navigatie: sidebar-item onder "Marketing".

### 3. Edge functions
- `social-meta-oauth-callback` — eenmalige Page+IG koppeling, schrijft `meta_page_id`, `meta_ig_user_id`, encrypted token + expiry naar `social_settings`.
- `social-generate-drafts` — dagelijks 08:00 cron. Verzamelt kandidaten (nieuwe `building_blocks` 14d, nieuwe/bijgewerkte `partners`, recente geanonimiseerde `program_requests`, jouw `social_media_assets`, seizoens-triggers, "partner van de week"). Stuurt naar `google/gemini-2.5-flash` met tone-of-voice + positionering uit memory. Dedup op `source_type+source_id` (geen herhaling binnen 30d). PII-scan op klantnaam-tokens → vervangt door "een team uit [stad]" / "een familie".
- `social-publish` — cron `*/15 * * * *`. Pakt `status='scheduled' AND scheduled_for<=now()`. IG via `/{ig_user_id}/media` + `media_publish`. FB via `/{page_id}/photos` of `/feed`. Schrijft `external_ids` + permalinks. Respecteert `publishing_enabled` flag.
- `social-refresh-token` — wekelijks cron, verlengt long-lived Page token vóór dag 50.

### 4. Memory
Nieuw bestand `mem://features/social-media-publisher` met bron-prioriteiten, cadence-default, PII-regels en de "altijd eerst goedkeuren"-regel.

## Volgorde van werken

1. Secrets aanvragen (`META_APP_ID`, `META_APP_SECRET`).
2. Edge functions schrijven (eerst `social-generate-drafts` zodat je in conceptmodus al de wachtrij kunt zien vullen).
3. Admin UI bouwen (Wachtrij + Mediabank eerst, dan Gepland/Geplaatst/Instellingen).
4. Pas wanneer jouw Meta App Review goedgekeurd is en token gekoppeld: `publishing_enabled` aan, en `social-publish` cron activeren.

## Niet in scope (zoals afgesproken)

LinkedIn/TikTok/X, comment-moderatie, Stories/Reels, betaalde ads, diepe analytics.
