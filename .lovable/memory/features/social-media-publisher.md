---
name: social-media-publisher
description: Social media planner voor IG+FB via Meta Graph API met AI-concepten, altijd handmatig goedkeuren
type: feature
---

## Bron-prioriteiten (social-generate-drafts)
1. Nieuwe `building_blocks` (status='published', laatste 14d)
2. Mediabank-uploads (`social_media_assets`) niet gebruikt in laatste 30d
3. Nieuwe/bijgewerkte `partners` (laatste 14d, is_active=true)
4. Wekelijkse "partner in spotlight" rotatie (oudste updated_at, is_public=true)

## Dedup-regel
Geen herhaling van zelfde (source_type, source_id) binnen 30 dagen, exclusief rejected posts.

## Cadence
Default 2-3 posts per week. `social-generate-drafts` telt posts van laatste 7d (exclusief rejected) en stopt bij cadence_per_week.

## Goedkeuring & PII
- Alle posts starten als `status='draft'`. Geen automatische publicatie.
- Captions worden door AI gegenereerd met expliciete instructie geen prijzen/datums te verzinnen.
- Lichtgewicht PII-scrub (twee opeenvolgende hoofdletter-woorden → "een groep") draait vóór insert.
- Admin moet Goedkeuren & inplannen of Nu publiceren expliciet klikken.

## Publicatie
- `social-publish` respecteert `social_settings.publishing_enabled`. False = conceptmodus, geen Meta-calls.
- IG: `/{ig_user_id}/media` container + `media_publish`.
- FB: `/{page_id}/photos` met url+caption, fallback `/feed` met message.
- Mislukt = `status='failed'` + `error_message` (zichtbaar in Geplaatst-tab).

## Setup
Meta App ID/Secret als secrets. Page Access Token (long-lived, ~60d) wordt in `social_settings.meta_token_encrypted` opgeslagen via UI (geen secret). Vervaldatum bewaakt; herhaalde plakactie verlengt.

## Toon
'je/jullie' (social is informeler dan klant-mails), warm, eilandelijk, niet schreeuwerig, max 2 emoji.
