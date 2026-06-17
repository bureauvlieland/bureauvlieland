
## Stand van zaken Meta / socials

Ja — er is al **flink** gebouwd. Wat staat:

**Database** (`social_settings`, `social_media_assets`, `social_posts`):
- Cadence, posting-dagen, hashtag-sets, default CTA's, tone-of-voice
- Mediabank met anonymize-flag + koppelingen aan project/partner/bouwsteen
- Posts met status `draft/scheduled/publishing/published/failed/rejected`

**Edge functions**:
- `social-meta-oauth-start` + `-callback` (Facebook Login → page token + IG user id)
- `social-publish` (post naar FB-pagina + IG)
- `social-generate-drafts` (AI-drafts uit bouwstenen/partners/projecten)
- `social-refresh-token`

**Admin-UI**:
- `/admin/social` (kalender + drafts review)
- `/admin/social-settings` (cadence, OAuth-connect, tone)

### Wat nog ontbreekt vóór dit écht live kan

1. **Meta App credentials** — `META_APP_ID` + `META_APP_SECRET` als runtime-secrets. Vereist: een Meta App (Business type) met Facebook Login + Instagram Graph permissions (`pages_manage_posts`, `pages_read_engagement`, `instagram_basic`, `instagram_content_publish`), en in de Meta App console onze callback-URL whitelisten.
2. **OAuth flow doortesten** met echte FB-pagina + gekoppeld IG-business-account; bevestigen dat `meta_page_token` + `meta_ig_user_id` correct landen in `social_settings`.
3. **Scheduler/cron** — er staat nu géén `pg_cron`-job die `social-generate-drafts` en `social-publish` periodiek triggert. Toevoegen:
   - dagelijks 07:00 → `social-generate-drafts` (vult draft-pijplijn voor komende week)
   - elke 15 min → `social-publish` (pakt posts op met `status='scheduled' AND scheduled_for <= now()`)
   - wekelijks → `social-refresh-token` (Meta long-lived tokens vervallen na 60 dagen)
4. **Publishing-toggle** — `publishing_enabled` staat default `false`; bewust pas op `true` zetten na succesvolle dry-run.
5. **Error-surfacing** — als `social-publish` faalt (token expired, asset te groot, IG ratio), nu alleen `status='failed'`. Toevoegen: admin-todo + e-mail naar Erwin bij faal.
6. **Asset-validatie** — IG eist 1:1/4:5/1.91:1 en >320px; check vóór scheduling, niet pas bij publish.

→ Aparte batch zodra je credentials hebt aangemaakt in Meta for Developers.

---

## Plan Google Reviews + Google Business Profile

Twee aparte sporen, los te bouwen, eigen credentials per spoor.

### Spoor A — Reviews tonen op site + aggregateRating-schema

**Doel**: sterren in Google-zoekresultaten + social proof op homepage/landingspagina's.

**Aanpak**:
- **Google Places API (New)** gebruiken — gratis tier ruim genoeg, geen OAuth nodig, alleen API key.
- Nieuwe edge function `fetch-google-reviews`:
  - Roept `places:searchText` of direct `places/{PLACE_ID}` aan met fields `rating`, `userRatingCount`, `reviews`.
  - Cachet resultaat 24u in nieuwe tabel `google_reviews_cache` (singleton row: `rating`, `review_count`, `reviews jsonb`, `fetched_at`).
- **Component** `<GoogleReviewsBlock />`:
  - Toont gemiddelde + aantal + 3-5 recente reviews (auteur, sterren, tekst, datum, link naar review).
  - Plaats op homepage onder ActivitiesShowcase, op `/wadlopen-vlieland`, `/zeehondentochten-vlieland`, `/activiteiten-vlieland` + landingspagina's catering/logies.
  - "Schrijf een review"-CTA → directe Google review-URL (zelfde als aftersales).
- **`StructuredData.tsx`** — bestaande `aggregateRating` koppelen aan live data uit cache i.p.v. hardcoded. Alleen tonen als `review_count > 0`.
- **Settings** — `applicatie_instellingen`: `google_place_id`, `google_reviews_min_rating` (filter weg <4 sterren?), `google_reviews_show_count`.
- **Secrets** — `GOOGLE_PLACES_API_KEY` (server-only).
- **Cron** — dagelijks 06:00 `fetch-google-reviews` om cache te verversen.

**Bestanden**:
- Nieuw: `supabase/functions/fetch-google-reviews/index.ts`, `src/components/GoogleReviewsBlock.tsx`, migratie voor `google_reviews_cache`
- Edit: `StructuredData.tsx`, homepage, 4 landingspagina's, `AdminApplicatieInstellingen.tsx`

### Spoor B — Google Business Profile beheren vanuit admin

**Doel**: vanuit Bureau Vlieland-admin posts/updates plaatsen op het GBP-profiel (zoals nieuws, events, aanbiedingen).

**Realiteitscheck eerst**: Google heeft per **augustus 2024** de **Local Posts API officieel uitgefaseerd** (Account Management API + Business Information API leven nog, Posts is dood). Posts plaatsen via API kan dus **niet meer**. Wat wél kan via API: Q&A beantwoorden, reviews ophalen + beantwoorden, NAP-gegevens en openingstijden updaten.

**Twee opties** — beslist door jou:

1. **Reviews-beheer in admin** (haalbaar):
   - OAuth-flow Google Business Profile API
   - Edge function `gbp-list-reviews` + `gbp-reply-review`
   - Admin-pagina `/admin/google-business` met inbox van reviews + reply-knop + AI-suggestie reply
   - Notificatie + todo bij nieuwe review (gebruikmaken van bestaand todo-systeem)
   - NAP/openingstijden-sync vanuit admin

2. **"Posts" via reminder + diepe link** (workaround):
   - Admin maakt "GBP-post" als concept in onze app (zelfde flow als social-posts)
   - Op gepland moment: e-mail/todo naar Erwin met tekst + foto + diepe link `business.google.com/posts`
   - Erwin plakt + publiceert handmatig (≤30 sec werk)
   - Niet sexy maar wél echt werkend

**Aanbeveling**: spoor B = **optie 1 (reviews-beheer)** als hoofdcase, optie 2 als nice-to-have later.

**Secrets** — `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET` (eigen Google Cloud project nodig met Business Profile API aangezet en verified ownership van het GBP-locatie).

### Volgorde van uitvoering

1. **Batch A1** — Spoor A (reviews op site + aggregateRating). Snelste SEO-win, alleen Places API key nodig.
2. **Batch A2** — Spoor B optie 1 (reviews-beheer in admin). Vereist OAuth-setup in Google Cloud Console.
3. **Batch Meta** — Meta-koppeling afmaken (cron + foutafhandeling + go-live) zodra `META_APP_ID/SECRET` er zijn.

Elk los te starten — geen onderlinge afhankelijkheid.

### Wat ik van je nodig heb vóór bouw

- **Voor Spoor A**: bevestiging "ja, bouw maar"; ik vraag dan `GOOGLE_PLACES_API_KEY` aan via `add_secret` en jij maakt 'm in Google Cloud Console (Places API (New) aanzetten, key restrictten tot Places).
- **Voor Spoor B**: bevestiging "optie 1" of "optie 1 + 2"; ik leg dan stap-voor-stap uit hoe je de OAuth-credentials aanmaakt in Google Cloud Console.
- **Voor Meta-afmaken**: laat weten wanneer je een Meta App hebt aangemaakt; ik regel cron + foutafhandeling + activeer publishing.
