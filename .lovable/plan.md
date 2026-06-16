## Doel
1. De opgegeven annuleringsreden meesturen in de partner-annuleringsmails (zowel activiteitenpartners als logiespartners).
2. Op reeds geannuleerde projecten een knop tonen waarmee je de nieuwe "Partners informeren"-dialog alsnog kunt openen, zodat we het kunnen testen op BV-2606-0005.

## Wijzigingen

### 1. `notify-partner-cancellation` (edge function)
- Aan het begin: ook `cancellation_reason` ophalen uit `program_requests` (samen met reference_number).
- Doorgeven aan het `cancellation_partner`-template als variabele `cancellation_reason` (in plaats van de huidige lege string). Template toont de reden al wanneer aanwezig (zie EmailTemplateSheet preview).
- Voor de logies-mail (hardcoded HTML in dezelfde functie): een extra alinea toevoegen vóór "Excuses voor het ongemak…" met:
  > "Reden van annulering: <reden>"
  alleen tonen wanneer er een reden is, netjes ge-sanitized.
- Fallback-body voor activiteitenpartner (wanneer template-render faalt) krijgt dezelfde regel.

### 2. `AdminRequestDetail.tsx` — handmatige hertrigger op cancelled projecten
- Toon, wanneer `request.status === 'cancelled'`, naast de bestaande annuleringsmelding een knop **"Partners alsnog informeren over annulering"**.
- Klik:
  - Verzamelt dezelfde lijsten als `cancel-program-request` doet (activity partners uit `program_request_items` met `status='cancelled'`, gegroepeerd per `provider_id` waar het geen `block_type='bureau'`/`provider_id='bureau'` betreft; logies-partners uit `accommodation_quotes` op gekoppelde logies-aanvraag waar `status IN ('selected','pending','submitted','rejected','declined')`).
  - Vult `cancellationPartners` state en opent de bestaande `PartnerCancellationNotifyDialog`.
- Geen extra mailtjes/todo-aanpassingen — de dialog gebruikt verder de bestaande flow (`skip_item_cancel: true`).
- Filterlogica plaatsen in een kleine helper `collectCancellationPartners(requestId)` binnen `AdminRequestDetail.tsx` (of in `src/lib/`) zodat we 'm bij de toekomstige cancel-trigger niet opnieuw bouwen.

### 3. Testen op BV-2606-0005
- Na deploy van bovenstaande:
  - Open project BV-2606-0005 in admin.
  - Klik "Partners alsnog informeren over annulering".
  - Selecteer de vier partners (Vliehors Expres, Bunkermuseum Wn12H, Vlieland Outdoor Center, Zuiver Traiteur — laatstgenoemde kan ook nog meegenomen worden).
  - Verstuur en controleer:
    - email_log entries (`cancellation_partner` + `cancellation_accommodation_partner`)
    - reden uit `program_requests.cancellation_reason` verschijnt in body
    - communicatie-tijdlijn van het project toont de mails.

## Bestanden
- `supabase/functions/notify-partner-cancellation/index.ts` — reden ophalen + meesturen.
- `src/pages/admin/AdminRequestDetail.tsx` — knop + collector + dialog-trigger.

## Buiten scope
- Wijzigingen aan template-tekst zelf (kunt u zelf bewerken in Admin → E-mailtemplates → `cancellation_partner`; `{{cancellation_reason}}` variabele bestaat al).
- Wijzigen van de logies-mail naar bewerkbare template (eerder voorstel) — pakken we later op als u dat wilt.
