## Doel

Partners krijgen exact 3 dagen voor uitvoering een automatische heads-up per e-mail met de laatste stand van zaken van het onderdeel. Dit vangt last-minute wijzigingen op (gastenlijst, dieetwensen, tijd, instructies) en voorkomt verrassingen op de dag zelf.

## Scope (op basis van keuzes)

Heads-up wordt verstuurd voor `program_request_items` die voldoen aan ALLE onderstaande:
- `activity_date` = vandaag + 3 dagen (gebaseerd op `program_requests.selected_dates[day_index]`).
- `status = 'accepted'` (klant akkoord, partner bevestigd).
- `block_type ≠ 'self_arranged'` en `block_type ≠ 'bureau'`.
- `provider_id` is een echte partner (geen `bureau`-provider).
- Parent `program_requests.status ≠ 'cancelled'` en `cancelled_at is null`.
- `skip_partner_notification = false` (concept-items overslaan).
- Nog niet eerder een heads-up gestuurd voor dit item (controle via `email_log`).

Géén opt-out per partner — operationeel belangrijk.

## Mailinhoud

Per item één mail naar `partner.contact_email` (val terug op `partner.email`). Onderwerp:
> Over 3 dagen: {block_name} – {datum} ({reference_number})

Inhoud:
- Datum, starttijd (`confirmed_time` of `preferred_time`), duur, locatie/adres.
- Aantal personen (`override_people` of `number_of_people`).
- Gastenlijst + dieetwensen (alleen voor catering), met "laatst bijgewerkt op …"-stempel.
- `partner_instructions` en `admin_price_notes` (indien gevuld).
- Bureau-central facturatie-melding indien `invoicing_mode = 'bureau_central'`.
- Knop "Bekijk in partnerportaal" → deeplink naar het item in het partnerportaal (met impersonate-veilige token-/route-strategie zoals andere partnermails).
- Vermelding: "Heeft u nog vragen of zijn er wijzigingen? Reply op deze e-mail." (gebruikt bestaande Reply-To subaddressing zodat antwoord in het projectdossier landt.)

Toon: informeel ("je"), conform partner-communicatiestijl.

## Werking

1. Nieuwe edge function `send-partner-headsup-t3`:
   - Berekent doeldatum = today + 3 (Europe/Amsterdam).
   - Selecteert kandidaat-items via Supabase service-role query.
   - Filtert items waarvoor `email_log` al een rij heeft met `metadata.template_name = 'partner-headsup-t3'` en `metadata.item_id = <id>`.
   - Verstuurt per item via bestaande Mailjet-helper + `logEmail()` (met verplichte `metadata.template_name` en `metadata.actor = 'system'`, plus `item_id`, `partner_id`, `request_id`).
   - Logt ook een rij in `project_communications` zodat het in het projectdossier zichtbaar is.
   - Schrijft `program_request_history`-rij (`action: 'partner_headsup_sent'`).

2. Cron via `pg_cron` + `pg_net`: dagelijks om **08:00 Europe/Amsterdam** (06:00 UTC in winter / 06:00 in zomertijd → we plannen op `0 6 * * *` UTC met opmerking, óf gebruiken `0 7 * * *` UTC zodat hij in NL altijd 08-09 valt; ik gebruik **`0 6 * * *` UTC**).
   - Idempotent: dubbele runs sturen niets dubbel door de `email_log`-check.

3. Tests / verificatie:
   - Handmatige `curl_edge_functions` met `?dryRun=true` query → geeft lijst items terug zonder mail te versturen.
   - Test mode (preview env) reroute blijft werken via bestaande infra.

## Technische details

- Cron registratie via `supabase--insert` (bevat env-specifieke URL + anon key) — niet via migration tool.
- Geen schema-wijzigingen nodig; we hergebruiken `email_log` voor de "al verstuurd"-check (memory: Reminder System gebruikt dezelfde aanpak).
- Edge function logica:
  ```
  - Bepaal target_date (YYYY-MM-DD in Europe/Amsterdam)
  - SELECT items met status accepted, niet-cancelled, geen self_arranged/bureau
  - Voor elk item: bereken activity_date uit program_requests.selected_dates[day_index]
  - Behoud alleen items waar activity_date === target_date
  - Voor elk overgebleven item:
      - Skip als email_log bevat (template_name='partner-headsup-t3' AND metadata->>'item_id' = id)
      - Haal partner + program_request data op
      - Render mailtemplate (HTML + plain)
      - Verstuur via Mailjet helper
      - logEmail(...) + project_communications insert + history insert
  ```
- Deeplink: hergebruik bestaande partner-portal item-URL pattern (zoek in code; vermoedelijk `/partner/projecten/{request_id}?item={item_id}`).

## Out of scope

- Geen tweede reminder T-1.
- Geen heads-up voor onderdelen waarvoor partner nog niet bevestigd heeft (status `pending`/`confirmed`).
- Geen wijziging aan accommodation_quotes (logies krijgt aparte flow als nodig).

## Acceptatiecriteria

- Op T-3 (08:00 NL) ontvangt iedere relevante partner één mail per item.
- Mail bevat actuele gastenlijst + dieetwensen (met laatste update-tijd).
- Geen duplicate sends bij meerdere cron-runs of handmatige triggers.
- Verstuurde mail is zichtbaar in projectdossier en `email_log` met juiste metadata.
- Bureau-items, self-arranged items en geannuleerde projecten worden overgeslagen.
