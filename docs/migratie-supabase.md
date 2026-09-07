# Verhuizing: van Lovable Cloud naar een eigen Supabase-project

Doel: de database, bestanden, gebruikers en edge functions draaien in een
Supabase-project onder je eigen account. Lovable blijft bestaan, maar heeft
daarna niets meer met productie te maken. Deployen gaat dan via GitHub
(`.github/workflows/deploy-supabase.yml`), niet meer via "vraag Lovable".

Dit document is de enige bron. Stappen met **[jij]** doe jij; stappen met
**[Claude]** doet Claude in de repo of met de gegevens die jij aanlevert.
Volgorde aanhouden.

## Wat er wel en niet meeverhuist

| Onderdeel | Hoe | Status |
|---|---|---|
| Tabellen, data, RLS, functies, triggers, enums, sequences | Lovable-export (pg_dump) → pg_restore | Volledig |
| Gebruikersaccounts (auth.users, identities) | Zit in de export | Volledig |
| Wachtwoorden | Lovable zegt sinds juli 2026: mee in de export. Wordt gecontroleerd op de dump; zo niet, dan krijgt iedereen één keer een reset-mail | Controleren |
| Storage-bestanden (facturen, foto's, documenten) | Niet in de export. `scripts/migrate-storage.ts` kopieert ze via de tijdelijke edge function `storage-export` | Script staat klaar |
| Buckets zelf | Staan in de migraties én in de export | Volledig |
| Cron-jobs (pg_cron) | Rijen zitten in de export maar wijzen naar het oude project. `supabase/scripts/after-restore.sql` zet ze recht via Vault | Script staat klaar |
| Edge functions (133) | Uit de repo deployen met de Supabase CLI | Repo is klaar |
| Secrets van edge functions (31) | Niet in de export. Opnieuw invoeren (lijst hieronder) | Handwerk, één keer |
| AI (scanner, Claudia, e-mailhulp) | Liep via Lovable's AI-gateway. Nu via `_shared/ai.ts` met eigen sleutel | Code is klaar |
| Outlook-doorsturen naar de boekhouding | Liep via Lovable's Microsoft-connector. Uitgefaseerd; doorsturen gaat via Mailjet | Klaar |
| Externe webhooks (Mailjet, Twilio/WhatsApp, MAP) | Wijzen naar de oude URL. Opnieuw registreren op de nieuwe URL | Handwerk, één keer |
| Frontend (Netlify) | Alleen `.env` wijzigen (URL, project-id, anon key) | Eén commit |

## Stap 0 — Nieuwe sleutels regelen **[jij]** (kan nu al)

1. **Supabase-project aanmaken** op supabase.com: New project, regio
   *eu-central-1 (Frankfurt)*, een sterk databasewachtwoord — **bewaar dat**.
   Noteer daarna uit *Project Settings → API*: de project-URL, de project-ref
   (het stukje voor `.supabase.co`), de *anon/publishable key* en de
   *service_role key*.
2. **Gemini API-sleutel**: https://aistudio.google.com/apikey → Create API key.
   Dit vervangt de Lovable AI-gateway voor alle scan- en tekstfuncties (zelfde
   modellen als nu).
3. **OpenAI API-sleutel** (alleen voor Claudia's zoekindex, embeddings):
   https://platform.openai.com/api-keys. Kosten: centen per maand. Wil je dit
   niet, zeg het; dan schakelt Claude de index over op Gemini-embeddings en
   wordt de index één keer opnieuw opgebouwd.
4. **Supabase personal access token** voor de deploy-workflow:
   https://supabase.com/dashboard/account/tokens.

## Stap 1 — Export uit Lovable **[jij]**

In Lovable: *Cloud → Overview → Advanced settings → Export project data*.
Download het bestand meteen (het staat in de Cloud-omgeving die straks
verdwijnt). Limiet: 5 GB, één export per dag.

Stuur het bestand niet via chat; zet het op een plek waar Claude erbij kan
(bijv. Google Drive) of doe stap 2 zelf met de commando's hieronder.

## Stap 2 — Herstellen in het nieuwe project **[Claude, of jij met deze commando's]**

De export is een pg_dump (zstd-gecomprimeerd; `pg_restore` 16 of hoger).

```bash
# Connection string: Supabase dashboard → Connect → Session pooler
pg_restore --no-owner --no-privileges --dbname "$NEW_DB_URL" export.dump
```

Foutmeldingen over bestaande extensies of `auth.*`-objecten die al bestaan zijn
normaal; kijk naar wat er *niet* is aangemaakt. Daarna in de SQL editor van het
nieuwe project:

```sql
select vault.create_secret('https://<nieuwe ref>.supabase.co', 'project_url');
select vault.create_secret('<nieuwe anon key>', 'anon_key');
```

en dan `supabase/scripts/after-restore.sql` uitvoeren. Dat toont welke cron-jobs
nog naar het oude project wijzen en zet de bekende jobs recht.

Controle van de wachtwoorden: `select count(*) from auth.users where
encrypted_password is not null;`. Is dat 0, dan gaat er eenmalig een
reset-mail naar alle gebruikers (Claude regelt dat).

## Stap 3 — Bestanden kopiëren **[Claude]**

Vereist dat de tijdelijke edge function `storage-export` in het **oude**
project staat (Lovable: "deploy de edge function storage-export"). Daarna:

```bash
OLD_URL=https://blhspuifehausilnzwio.supabase.co OLD_ANON_KEY=<oude anon key> \
ADMIN_EMAIL=<jouw admin-login> ADMIN_PASSWORD=<wachtwoord> \
NEW_URL=https://<nieuwe ref>.supabase.co NEW_SERVICE_ROLE_KEY=<nieuwe service role> \
npx tsx scripts/migrate-storage.ts --dry-run   # eerst tellen
npx tsx scripts/migrate-storage.ts             # dan kopiëren
```

Het script is herhaalbaar. Verwacht (per bucket) evenveel bestanden als
`select bucket_id, count(*) from storage.objects group by 1` in beide projecten.

## Stap 4 — Edge functions en secrets **[Claude + jij]**

```bash
supabase link --project-ref <nieuwe ref>
supabase functions deploy --no-verify-jwt   # zelfde vlag als in config.toml per functie
```

Secrets invoeren (*Edge Functions → Secrets*, of `supabase secrets set`). Dit
zijn de 31 namen die de functies gebruiken; de waarden staan in Lovable onder
*Cloud → Secrets* en moeten één voor één over:

```
Mail:      MAILJET_API_KEY MAILJET_SECRET_KEY MAILJET_FROM_EMAIL MAILJET_SENDER_EMAIL
           MAILJET_SENDER_NAME MAILJET_TEST_MODE MAILJET_WEBHOOK_TOKEN
           MAILJET_INBOUND_WEBHOOK_SECRET MAILJET_INBOUND_WEBHOOK_TOKEN ADMIN_ALERT_EMAIL
WhatsApp:  TWILIO_ACCOUNT_SID TWILIO_AUTH_TOKEN TWILIO_API_KEY_SID TWILIO_API_KEY_SECRET
           TWILIO_WHATSAPP_NUMBER WHATSAPP_DIAG_SECRET
Koppelingen: MAP_API_KEY DOEKSEN_API_KEY GEOAPIFY_API_KEY GOOGLE_PLACES_API_KEY
           META_APP_ID META_APP_SECRET
Zelftest:  CI_ADMIN_EMAIL CI_ADMIN_PASSWORD CI_FIXTURE_SECRET
AI:        GEMINI_API_KEY OPENAI_API_KEY        ← nieuw, vervangen LOVABLE_API_KEY
Vervalt:   LOVABLE_API_KEY MICROSOFT_OUTLOOK_API_KEY
```

`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` en
`SUPABASE_DB_URL` zet Supabase zelf. De waarden staan in Lovable onder
*Cloud → Secrets*; Claude kan ze niet zien, jij wel.

## Stap 5 — Externe partijen op de nieuwe URL zetten **[jij, Claude geeft de exacte URLs]**

- **Mailjet**: event-webhook (bounces/spam), inbound parse (inkoop-inbox en
  sales-inbox) en de heartbeat. `scripts/mailjet-webhook-setup.ps1` doet dit
  met de nieuwe basis-URL.
- **Twilio**: WhatsApp inbound-webhook en status-callback.
- **MAP (Mijnfietsverhuur)**: betaal-webhook.
- **Netlify**: niets in Netlify zelf; de nieuwe waarden komen via `.env` in de repo.

## Stap 6 — Omschakelen **[Claude]**

Eén commit: `.env` (URL, project-id, anon key), `supabase/config.toml`
(project_id), en `SUPABASE_DEPLOY_ENABLED=true` als repository variable met de
twee secrets `SUPABASE_ACCESS_TOKEN` en `SUPABASE_DB_PASSWORD`. Netlify bouwt
de frontend tegen het nieuwe project.

Daarna de controlelijst: inloggen, een inkoopfactuur scannen (AI-sleutel), een
partnermail sturen (Mailjet), een WhatsApp (Twilio), de logiesoffertes en
foto's zichtbaar (storage), en de volgende ochtend `critical-selftest` en de
heartbeat in de logs (cron).

Pas als dat groen is: in Lovable *Remove Lovable Cloud*. Tot die tijd blijft het
oude project als vangnet staan.

## Waarom niet gewoon "Lovable koppelen aan eigen Supabase"

Lovable kan na *Remove Lovable Cloud* een eigen Supabase-project koppelen. Dat
is dezelfde verhuizing als hierboven (export, restore, bestanden, secrets),
alleen blijft Lovable dan de deployer. Wij willen juist dat GitHub dat doet;
daarom koppelen we Lovable niet opnieuw.
