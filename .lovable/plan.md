# Social media planner — Instagram & Facebook

Een /admin/social omgeving waar de AI concept-posts genereert op basis van website-content, bouwstenen, partners, aanvragen en jouw projectfoto's. Jij keurt elke post goed (of bewerkt) voordat hij via de Meta Graph API live gaat.

## Wat de gebruiker krijgt

**`/admin/social` met 4 tabs:**

1. **Wachtrij** — concept-posts wachtend op goedkeuring. Per kaart: voorbeeldweergave (zoals IG/FB feed), caption, hashtags, beeld, doelkanalen (IG/FB-toggles), geplande datum/tijd. Acties: Bewerk · Goedkeuren & inplannen · Nu publiceren · Verwerp.
2. **Gepland** — goedgekeurde posts met publicatietijd en status.
3. **Geplaatst** — historiek met Meta-permalink, en basis-stats (likes/comments) als API beschikbaar.
4. **Mediabank projecten** — drag-and-drop upload van live projectfoto's, met velden: titel, korte notitie, optioneel gekoppeld project/partner/bouwsteen, "klantnaam afschermen" (default aan). Foto's belanden in een `social-media` storage bucket.

**`/admin/social/instellingen`:**
- Posting-ritme (default: 2–3× per week, ma/wo/vr 10:00).
- Bronnen aan/uit: nieuwe bouwstenen · nieuwe/bijgewerkte partners · seizoen/events · projectfoto's · "partner in spotlight" (wekelijks).
- Tone-of-voice presets (formeel naar klant, speels naar partner — zoals memory).
- Hashtag-sets per categorie (catering, activiteit, logies, eiland-algemeen).
- Standaard CTA-links (bv. /bouwstenen, /catering, /programma-samenstellen).
- Meta-koppeling: status van Facebook Page + IG Business account + token-vervaldatum + "opnieuw koppelen"-knop.

## Hoe het werkt onder de motorkap

**Content-pipeline (edge function `social-generate-drafts`, dagelijks cron 08:00):**
1. Verzamel kandidaten: nieuwe `building_blocks` (laatste 14d), nieuwe/aangepaste `partners`, recente `program_requests` (geanonimiseerd), nieuwe items in `social_media_assets` (jouw upload), seizoens-/event-triggers uit kalender-config, "partner van de week" rotatie.
2. Per kandidaat: stuur naar Lovable AI Gateway (`google/gemini-2.5-flash`) met systeem-prompt incl. positionering + tone-of-voice memory. Output = caption NL, alt-tekst, 8–12 hashtags, suggestie beeld (URL uit asset), voorgestelde publicatiedatum.
3. Vul wachtrij zodanig dat er 2–3 posts per week beschikbaar zijn (geen overschot).
4. Skip kandidaat als er in laatste 30 dagen al over geplaatst is (dedup op `source_type` + `source_id`).

**Publicatie (edge function `social-publish`, cron elke 15 min):**
- Haalt `status='scheduled' AND scheduled_for <= now()` posts op.
- IG: upload media container → publish via Graph API (`/{ig_user_id}/media` + `/media_publish`).
- FB: post naar Page feed (`/{page_id}/photos` of `/feed`).
- Schrijft `external_id` + permalink terug, status → `published` of `failed` (+ error log).

**Goedkeuring & PII-bescherming:**
- Alle drafts starten als `status='draft'`, vereisen expliciete admin-actie.
- Captions worden gescand op klantnaam-tokens uit gekoppelde projecten — automatisch vervangen door "een team uit [stad]" of "een familie" voor publicatie.

## Setup die jij eenmalig doet

1. **Facebook Business Suite** → koppel je Instagram Business-account aan je Facebook Page (vereiste van Meta).
2. **Meta for Developers** → maak een App aan (type: Business), voeg "Instagram Graph API" + "Facebook Login for Business" toe.
3. Vraag App Review aan voor scopes: `pages_manage_posts`, `pages_read_engagement`, `instagram_basic`, `instagram_content_publish`, `business_management`. Review duurt 3–7 dagen.
4. Geef Bureau Vlieland één Page Access Token (long-lived, 60 dagen, auto-refresh in edge function).

Tot review klaar is, werkt alles in **conceptmodus** (genereren + plannen + previews), alleen het daadwerkelijke pushen naar Meta is dan uitgeschakeld.

## Technisch (voor de developer)

**Nieuwe tabellen:**
- `social_posts` — id, status (`draft|scheduled|published|failed|rejected`), caption, hashtags[], media_urls[], channels[] (`instagram`, `facebook`), scheduled_for, published_at, source_type, source_id, external_ids jsonb, error_message, created_by, approved_by.
- `social_media_assets` — id, storage_path, title, note, project_id?, partner_id?, building_block_id?, anonymize_customer bool, uploaded_by, created_at, last_used_at.
- `social_settings` — singleton: cadence_per_week, posting_days[], posting_time, sources_enabled jsonb, hashtag_sets jsonb, default_ctas jsonb, meta_page_id, meta_ig_user_id, meta_token_encrypted, meta_token_expires_at.

Alle tabellen: RLS — alleen admins (via `has_role('admin')`). GRANT-block per memory.

**Nieuwe storage bucket:** `social-media` (privé; signed URLs naar Meta bij publicatie).

**Edge functions:**
- `social-generate-drafts` (cron 08:00 dagelijks, gebruikt `LOVABLE_API_KEY`).
- `social-publish` (cron `*/15 * * * *`, gebruikt Meta token uit `social_settings`).
- `social-meta-oauth-callback` (eenmalige koppeling Page + IG account).
- `social-refresh-token` (cron wekelijks, verlengt long-lived token vóór dag 50).

**Secrets:**
- `META_APP_ID` en `META_APP_SECRET` (jij plakt na App-aanmaak).
- Page-token bewaard versleuteld in `social_settings`, niet als losse secret.

**Frontend routes:**
- `/admin/social` (4 tabs), `/admin/social/instellingen`, `/admin/social/upload`.
- Navigatie-item in `AdminLayout` sidebar onder "Marketing".

**Memory-impact:** nieuw memory-bestand `mem://features/social-media-publisher` met de bron-prioriteiten, cadence-default en PII-regels.

## Niet in scope (vraag het apart als gewenst)

- Andere kanalen (LinkedIn, TikTok, X).
- Comment-moderatie of inbox-reply vanuit /admin/social.
- Story's / Reels / carrousels van >10 items (we starten met single image + carousel ≤10).
- Betaalde advertenties / boosted posts.
- Geavanceerde analytics-dashboards (alleen basis like/comment counts in v1).
