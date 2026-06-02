## Doel

Klant ontvangt na afloop van het programma één aftersales-mail met een bedankje en twee review-links (Google + bureauvlieland.nl). Admin kan de mail handmatig versturen vanuit het projectdetail, en het systeem stelt 'm na 3 dagen automatisch voor via een admin-todo.

## Scope

- 1 mail per project (`requests.id`), niet per item.
- Verstuurd naar `requests.customer_email` (formele 'u'-toon).
- Google-link: `https://g.page/r/CREi-TJGNt7kEAE/review`
- Eigen-site-link: configureerbaar via `app_settings` (default: `https://bureauvlieland.nl/reviews`).
- Defaulttiming: 3 dagen na de laatste `executed_at` van de items in het project. Configureerbaar in `app_settings`.

## Wat we bouwen

### 1. Email-template `customer_aftersales_review`
Nieuw template in `supabase/functions/_shared/email-templates.ts`:
- Onderwerp: `Bedankt voor uw bezoek aan Vlieland — deelt u uw ervaring?`
- Korte bedankboodschap (formeel), referentie naar `reference_number` en programma-datum.
- Twee duidelijke CTA-knoppen: "Review op Google" en "Review op bureauvlieland.nl".
- Korte zin "Liever rechtstreeks reageren? Beantwoord deze mail."
- Standaard Bureau Vlieland-footer.

### 2. Edge function `send-customer-aftersales`
Nieuw, kort:
- Input: `{ request_id, sent_by? }`
- Laadt request + items, rendert template, verstuurt via Mailjet via bestaande helper, logt in `email_log` met `email_type='customer_aftersales_review'`, `metadata.template_name='customer_aftersales_review'`, `metadata.actor` per [Email Logging Contract](mem://infrastructure/email-logging-contract).
- Schrijft `requests.aftersales_sent_at = now()` (nieuw veld, zie 5).
- Idempotent: weigert als `aftersales_sent_at` al gevuld is, tenzij `force=true`.
- Markeert openstaande `admin_todos` met `auto_type='customer_aftersales'` voor dit project als `done`.

### 3. Handmatige knop in admin
In `src/pages/admin/AdminRequestDetail.tsx`:
- Nieuwe actie "Aftersales-mail versturen" in het bestaande actiesmenu van het project.
- Disabled + tooltip wanneer programma nog niet (volledig) uitgevoerd is óf wanneer `aftersales_sent_at` al gevuld is (met "opnieuw versturen"-bevestiging).
- Toont in de timeline/communicatiedossier wanneer de mail verstuurd is.

### 4. Auto-suggestie via todo + auto-send optie
In `supabase/functions/check-pending-items/index.ts`:
- Nieuwe `auto_type='customer_aftersales'`-todo: aangemaakt 3 dagen na laatste `executed_at` van het project, als `aftersales_sent_at IS NULL` en alle items in het project uitgevoerd of geannuleerd zijn.
- Titel: `Aftersales-mail versturen aan {klant}`, met "Verstuur nu"-knop in `AdminTodos` die de edge function aanroept.
- App-setting `customer_aftersales_auto_send` (default: `false`). Wanneer `true`, slaat de todo over en stuurt de edge function direct.
- Aanvullen op de bestaande `post_execution_feedback`-todo (die blijft als interne reminder); deze nieuwe is specifiek klantgericht.

### 5. Schema & settings (één migratie)
- `ALTER TABLE requests ADD COLUMN aftersales_sent_at timestamptz`.
- Nieuwe rijen in `app_settings`:
  - `customer_aftersales_days_after = 3` (number)
  - `customer_aftersales_auto_send = false` (boolean)
  - `customer_aftersales_review_url = https://bureauvlieland.nl/reviews` (text)
  - `customer_aftersales_google_url = https://g.page/r/CREi-TJGNt7kEAE/review` (text)
- Settings worden in `src/pages/admin/AdminSettings.tsx` zichtbaar onder een nieuw blok "Aftersales".

### 6. Frontend types/registry
- Voeg `customer_aftersales` toe aan `AutoTodoType` + labels in `src/lib/autoTodoCreator.ts` en `AdminTodos.tsx`.
- Voeg template toe aan `AdminEmailTemplates`-registry zodat tekst aanpasbaar is.

## Niet in scope
- Geen herinneringsmail (alleen 1 send + handmatig opnieuw).
- Geen NPS/score-formulier; puur doorlinken.
- Geen mail naar deelnemers; alleen naar hoofdklant (`customer_email`).

## Verificatie
- BV-2605-0001: handmatig "Aftersales versturen" — verstuurt, `aftersales_sent_at` gevuld, log zichtbaar in dossier, todo verdwijnt.
- Project met alle items uitgevoerd >3 dagen geleden: cron maakt `customer_aftersales`-todo aan.
- Tweede aanroep weigert tenzij admin "opnieuw versturen" bevestigt.
- Test-mode preview routeert naar test-inbox per bestaande [Test Mode](mem://infrastructure/preview-environment-test-mode)-conventie.
