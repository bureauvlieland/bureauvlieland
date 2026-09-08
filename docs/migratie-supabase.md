# Verhuizing: van Lovable Cloud naar een eigen Supabase-project

Doel: de database, bestanden, gebruikers en edge functions draaien in een
Supabase-project onder je eigen account. Lovable blijft bestaan, maar heeft
daarna niets meer met productie te maken. Deployen gaat dan via GitHub
(`.github/workflows/deploy-supabase.yml`), niet meer via "vraag Lovable".

Dit document is de enige bron. Stappen met **[jij]** doe jij; stappen met
**[Claude]** doet Claude in de repo of met de gegevens die jij aanlevert.
Volgorde aanhouden.

## Waar staan we, in gewone taal

De app bestaat uit twee helften. De *website* (wat je in de browser ziet)
staat op Netlify en verhuist niet; die hoeft straks alleen te weten waar de
nieuwe achterkant staat. De *achterkant* (database, bestanden, gebruikers,
en 134 kleine programma's voor mail, WhatsApp en de factuurscanner) staat nu
bij Lovable en moet naar een Supabase-project van jezelf.

| Stap | Wat het is | Stand |
|---|---|---|
| 0 | Nieuw, leeg Supabase-project met sleutels | Klaar |
| 1 | Export (een kopie van alles) uit Lovable halen | Klaar, 7 september |
| 2 | Die kopie in het nieuwe project zetten | Klaar, 7 september (run 6 van "Herstel database") |
| 3 | De bestanden (foto's, offertes, facturen) kopiëren | Klaar, 7 september (249 bestanden, 460 MB) |
| 4 | De 134 programma's plaatsen en hun wachtwoorden overzetten | Klaar, 7 september (19 secrets overgezet); alleen `GEMINI_API_KEY` nog **[jij]** |
| 5 | Mailjet en Twilio het nieuwe adres geven | Klaar, 8 september 00:15 (`run-migration.sh webhooks --apply`) |
| 6 | Omschakelen en controleren | **Klaar, 8 september 00:50.** Nieuwe website live, bewerking "Lunch in de natuur" overgedaan, WhatsApp en zelftest groen. Oude project blijft een week als vangnet |

Waarom stap 2 via een knop in GitHub gaat: om de kopie in de database te
zetten is een rechtstreekse databaseverbinding nodig, en de omgeving waarin
Claude werkt laat alleen webverkeer door. GitHub kan die verbinding wel maken.
Claude heeft de knop gebouwd; jij drukt erop en laat het resultaat zien.

## Wat er in de export zit (gecontroleerd op de export van 7 september 2026)

De export is teruggezet op een lokale PostgreSQL 17 als generale repetitie.
Resultaat: de hele structuur en data komen goed over. De cijfers:

| Onderdeel | In de export | Wat er nog bij moet |
|---|---|---|
| Database (67 tabellen, 218 policies, functies, triggers) | Volledig, 46 MB | Niets |
| Gebruikers | 41 accounts, alle 41 met wachtwoord-hash | Niets: iedereen logt gewoon in |
| Storage-bestanden | Alleen de rijen (250 bestanden, ~470 MB in 11 buckets) | `scripts/migrate-storage.ts` kopieert de bestanden zelf |
| Cron-jobs | 16 jobs, 14 daarvan met de oude URL en anon key erin | `after-restore.sql` vervangt die in één keer |
| Migratiehistorie | 311 regels, maar met andere nummers dan de repo | `after-restore.sql` zet de historie gelijk aan de repo |
| Vault | Leeg | Niets |
| Eén data-oneffenheid | 27 template-regels wijzen naar verwijderde templates | `restore-from-lovable.sh` ruimt ze op (anders blokkeren ze een foreign key) |
| Edge functions (134) | Niet in de export | Uit de repo deployen met de Supabase CLI |
| Secrets van edge functions | Niet in de export (staan versleuteld buiten de database) | `secrets-export` + `run-migration.sh secrets` zet ze over (stap 4) |
| AI (scanner, e-mailhulp) | Liep via Lovable's AI-gateway | Eigen Gemini-sleutel (`_shared/ai.ts`); Claudia is op 8 september verwijderd |
| Outlook-doorsturen | Liep via Lovable's Microsoft-connector | Uitgefaseerd; doorsturen gaat via Mailjet |
| Externe webhooks (Mailjet, Twilio/WhatsApp) | Wijzen naar de oude URL | Bij de omschakeling omzetten (stap 5); MAP heeft niets nodig |
| Frontend (Netlify) | n.v.t. | Alleen `.env` wijzigen |

## Stap 0 — Nieuw project en sleutels **[gedaan, op drie na]**

Nieuw project: `utshmnyrjzwtrpttxdlw` (regio eu-west-1, Ierland).
URL `https://utshmnyrjzwtrpttxdlw.supabase.co`. Anon key staat in
`supabase/scripts/run-migration.sh` (publiek). Databasewachtwoord en
service_role key zijn aangeleverd.

Nog nodig:

1. **Gemini API-sleutel**: https://aistudio.google.com/apikey. Vervangt de
   Lovable AI-gateway voor alle scan- en tekstfuncties (zelfde modellen).
2. ~~OpenAI API-sleutel~~ Vervallen: Claudia is op 8 september verwijderd.
3. **Supabase personal access token**: https://supabase.com/dashboard/account/tokens.
   Nodig om de edge functions te deployen.

## Uitvoering vanuit Claude **[jij: instellen, Claude: draaien]**

Alles wat Claude uitvoert staat in `supabase/scripts/run-migration.sh`, met
vier subcommando's: `check`, `restore`, `storage`, `functions`. Het script
leest de geheimen uit omgevingsvariabelen. Zet die in de instellingen van de
Claude-omgeving (claude.ai/code → omgeving → *Environment variables*); dan
staan ze in geen enkele chat en zijn ze in elke nieuwe sessie beschikbaar:

```
NEW_DB_PASSWORD        databasewachtwoord van het nieuwe project
NEW_SERVICE_ROLE_KEY   service_role key van het nieuwe project
SUPABASE_ACCESS_TOKEN  personal access token
ADMIN_EMAIL            admin-login van de app (voor het kopiëren van bestanden)
ADMIN_PASSWORD         idem
```

En in dezelfde omgevingsinstellingen onder *Network*, toestaan:

```
utshmnyrjzwtrpttxdlw.supabase.co
aws-1-eu-west-1.pooler.supabase.com
api.supabase.com
blhspuifehausilnzwio.supabase.co
```

Deze variabelen en netwerkregels staan sinds 7 september ingesteld; `check`
bereikt de storage-API en de beheer-API van het nieuwe project. Alleen de
databasepoort (5432) blijft dicht; daarvoor is stap 2 naar GitHub verplaatst.

## Stap 1 — Export uit Lovable **[gedaan]**

In Lovable: *Cloud → Overview → Advanced settings → Export project data*. De
export van 7 september staat bij Claude; vlak voor de definitieve
omschakeling maken we een verse (één export per dag mogelijk), zodat er geen
werk van de tussenliggende dagen verloren gaat.

## Stap 2 — Herstellen in het nieuwe project **[jij drukt op de knop, Claude leest het resultaat]**

Dit is de enige stap die niet vanuit Claude kan (zie hierboven). Daarom is er
de GitHub-workflow `.github/workflows/restore-database.yml`, zichtbaar als
*Actions → Herstel database*. Eenmalig voorbereiden:

1. **Exportbestand uploaden.** Ga in het nieuwe project naar *Storage →
   migratie* (die map staat al klaar, privé) en upload
   `bureauvlieland_<datum>.backup` (als zip mag ook). Onthoud de bestandsnaam.
2. **Twee geheimen in GitHub.** *Settings → Secrets and variables → Actions →
   New repository secret*:
   - `SUPABASE_DB_PASSWORD`: het databasewachtwoord van het nieuwe project.
   - `SUPABASE_SERVICE_ROLE_KEY`: *Project Settings → API → service_role*.
   Het eerste geheim gebruikt de deploy-workflow bij stap 6 ook.
3. **Op de knop drukken.** *Actions → Herstel database → Run workflow*, de
   bestandsnaam invullen, *Run workflow*. Het duurt een paar minuten.
4. **Resultaat delen.** Onder de run staat een samenvatting met een tabel
   (gebruikers, bestanden, cron-jobs, en of er onverwachte fouten waren).
   Stuur die aan Claude, of de link naar de run.

De workflow weigert als de database al gevuld is, tenzij je *overschrijven*
aanvinkt. Zo kan een tweede klik geen schade doen. Wat hij doet: het bestand
ophalen, `restore-from-lovable.sh` (vier fasen: structuur, data, constraints,
en daarna wat in de datafase niet kon: `auth.identities` en de cron-jobs, die
opnieuw worden ingepland via `cron.schedule()`; ruimt tussendoor de 27
wees-rijen op) en daarna `after-restore.sql` (vervangt
de oude URL en anon key in alle cron-jobs, zet de migratiehistorie gelijk aan
de repo, print de controles). Foutmeldingen over `extensions`,
`graphql_public`, `vault`, `pg_cron`, `pg_net` en `supabase_vault` zijn
normaal: die heeft Supabase al; de workflow filtert ze eruit en meldt alleen
de rest.

Resultaat op 7 september (run 6): 67 tabellen, 41 gebruikers met wachtwoord
én inlogmethode, 218 policies, 249 bestandsrijen, 16 cron-jobs allemaal
actief en naar het nieuwe project, 310 migraties in de historie. De cron-jobs
roepen edge functions aan die er pas na stap 4 staan; tot die tijd falen ze
stilletjes, dat is verwacht.

**Geleerd op 8 september:** de restore draaide met `--no-privileges`, waardoor
na de omschakeling geen enkele app-rol bij de tabellen kon en niemand kon
inloggen. `restore-from-lovable.sh` heeft nu een fase 5 die de ACL-regels
voor schema public alsnog uit de export haalt (`restore-privileges.sh`), en er
is een losse knop *Actions → Herstel rechten* voor herstel achteraf.

Vanaf een eigen computer met `pg_restore` 18 kan het ook zonder GitHub:
`supabase/scripts/run-migration.sh restore <bestand>`.

## Stap 3 — Bestanden kopiëren **[gedaan]**

```bash
supabase/scripts/run-migration.sh storage --dry-run   # eerst tellen
supabase/scripts/run-migration.sh storage             # dan kopiëren
```

Het script logt in als admin op het oude project en leest de bestanden via
de gewone storage-API (de RLS-policies geven admins leesrecht op alle
buckets). De tijdelijke edge function `storage-export` levert alleen nog de
bucketlijst met instellingen; staat die er niet, dan neemt het script de
buckets die de dump al in het nieuwe project heeft gezet. De buckets
`database_export_*` (Lovable's eigen exports) slaat het over. Na afloop
vergelijkt het per bucket wat het oude project laat zien met de rijen in het
nieuwe project, zodat een bestand dat de admin niet mag zien zou opvallen.

Het script is herhaalbaar (bestaande bestanden worden overschreven).

Resultaat op 7 september: 249 bestanden, 459,5 MB, 0 mislukt; in alle 13
buckets is het aantal bestanden in het oude project gelijk aan het aantal
rijen in het nieuwe (quote-documents 13 / 175 MB, building-block-images
57 / 150 MB, partner-images 25 / 78 MB, partner-invoices 77, ticket-documents
25, email-attachments 30, bureau-invoices 8, payment-batches 6,
bank-statements 6, project-documents 2, drie buckets leeg). Steekproef: een
offerte-PDF en een foto zijn in het nieuwe project byte voor byte even groot
als de rij aangeeft.

Let op bij de definitieve omschakeling (stap 6): bestanden die tussen 7
september en dan worden geüpload staan nog niet in het nieuwe project. Het
script dan nog één keer draaien; dat kost een paar minuten.

## Stap 4 — Edge functions en secrets **[Claude + jij]**

```bash
supabase/scripts/run-migration.sh functions
```

De per-functie instelling `verify_jwt` komt uit `supabase/config.toml`.

De secrets staan niet in de export: Supabase bewaart ze versleuteld buiten
de database, en alleen de beheerder van een project (bij het oude project is
dat Lovable) kan ze uitlezen. De edge functions zelf kunnen ze wél lezen.
Daarom gaat het net als bij de bestanden via een tijdelijke edge function:

1. **[jij]** In Lovable: "deploy de edge function secrets-export".
2. **[Claude]** `supabase/scripts/run-migration.sh secrets --dry-run` (ophalen
   en tellen) en daarna `run-migration.sh secrets`. Het script logt in als
   admin, haalt de 25 waarden op en zet ze via de beheer-API
   (`api.supabase.com`) in het nieuwe project. Het toont alleen namen en
   lengtes; de waarden komen in geen chat of bestand terecht.
3. **[jij]** Na de verhuizing in Lovable: "verwijder de edge function
   secrets-export" (en `storage-export`).

Dit zijn de 25 namen die overgaan; de waarden staan in Lovable onder
*Cloud → Secrets* (daar kun je ze desnoods ook met de hand overtypen naar
*Edge Functions → Secrets* in het nieuwe project):

```
Mail:      MAILJET_API_KEY MAILJET_SECRET_KEY MAILJET_FROM_EMAIL MAILJET_SENDER_EMAIL
           MAILJET_SENDER_NAME MAILJET_TEST_MODE MAILJET_WEBHOOK_TOKEN
           MAILJET_INBOUND_WEBHOOK_SECRET MAILJET_INBOUND_WEBHOOK_TOKEN ADMIN_ALERT_EMAIL
WhatsApp:  TWILIO_ACCOUNT_SID TWILIO_AUTH_TOKEN TWILIO_API_KEY_SID TWILIO_API_KEY_SECRET
           TWILIO_WHATSAPP_NUMBER WHATSAPP_DIAG_SECRET
Koppelingen: MAP_API_KEY DOEKSEN_API_KEY GEOAPIFY_API_KEY GOOGLE_PLACES_API_KEY
           (META_APP_ID en META_APP_SECRET vervallen: social-media-planner verwijderd op 8 september)
Zelftest:  CI_ADMIN_EMAIL CI_ADMIN_PASSWORD CI_FIXTURE_SECRET
```

Resultaat op 7 september: 19 secrets overgezet, gecontroleerd met de
beheer-API en met een echte aanroep (`get-ferry-departures` op het nieuwe
project haalt vertrektijden op met `DOEKSEN_API_KEY`). Zes namen hadden in
het oude project ook geen waarde en hebben in de code een vaste terugval:
`MAILJET_FROM_EMAIL` (noreply@), `MAILJET_SENDER_EMAIL` (info@),
`MAILJET_SENDER_NAME` ("Bureau Vlieland"), `ADMIN_ALERT_EMAIL` (hallo@),
`MAILJET_TEST_MODE` (uit) en `MAILJET_INBOUND_WEBHOOK_TOKEN` (alternatief
voor `…_SECRET`). Gedrag is dus gelijk aan onder Lovable.

Twee zijn nieuw en bestaan niet in Lovable; die zet jij zelf in het nieuwe
project onder *Edge Functions → Secrets*:

```
GEMINI_API_KEY   aistudio.google.com/apikey        (factuurscanner, e-mailhulp, enz.)
```

Vervallen: `LOVABLE_API_KEY` en `MICROSOFT_OUTLOOK_API_KEY`. `SUPABASE_URL`,
`SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` en `SUPABASE_DB_URL` zet
Supabase zelf.

## Stap 5 — Externe partijen op de nieuwe URL zetten **[jij, op het moment van omschakelen]**

**Timing.** Dit pas doen ná het omzetten van de frontend (stap 6), binnen
hetzelfde uur. Wijzen Mailjet en Twilio eerder naar het nieuwe project, dan
komen inkomende mails, leveringsstatussen en WhatsApp-berichten in de nieuwe
database terecht terwijl iedereen nog in de oude werkt.

Basis-URL van het nieuwe project: `https://utshmnyrjzwtrpttxdlw.supabase.co/functions/v1`
(oud: `https://blhspuifehausilnzwio.supabase.co/functions/v1`). Alleen het
project-ID verandert; de rest van elk adres blijft gelijk.

### Mailjet (drie dingen)

Inloggen op app.mailjet.com. Waar `<token>` staat, de waarde van de
genoemde secret invullen (te zien in Supabase, nieuwe project, *Edge
Functions → Secrets*, of in Lovable onder *Cloud → Secrets*; ze zijn gelijk).

1. **Event-webhook** (aflevering, bounces, spam, uitschrijvingen).
   *Account → Settings → Event tracking (Triggers)*, of via de REST API
   zoals `scripts/mailjet-webhook-setup.ps1` doet. Voor elk van de zeven
   events `sent`, `open`, `click`, `bounce`, `blocked`, `spam`, `unsub`
   dezelfde URL, versie 2 (gegroepeerd):

   ```
   https://utshmnyrjzwtrpttxdlw.supabase.co/functions/v1/mailjet-event-webhook?token=<MAILJET_WEBHOOK_TOKEN>
   ```

   Zonder `?token=` weigert de functie alles met 401 en verdwijnt de
   terugkoppeling stilzwijgend (dat is tussen 8 juli en 1 september 2026
   gebeurd). Vanaf Windows: `.\scripts\mailjet-webhook-setup.ps1
   -MailjetApiKey … -MailjetSecretKey … -WebhookToken … -WebhookBaseUrl
   https://utshmnyrjzwtrpttxdlw.supabase.co/functions/v1/mailjet-event-webhook`;
   dat script ruimt de oude registraties ook op.

2. **Inbound parse** (alle mail op `reply.bureauvlieland.nl`: antwoorden van
   klanten, inkoopfacturen op inkoop@/facturen@/invoices@, leads op
   sales@/leads@/aanvraag@). *Account → Settings → Inbound Parse (Parseroute)*.
   Er is één route; de URL wordt:

   ```
   https://utshmnyrjzwtrpttxdlw.supabase.co/functions/v1/inbound-email?token=<MAILJET_INBOUND_WEBHOOK_SECRET>
   ```

   De functie `inbound-email` stuurt inkoopfacturen zelf door naar
   `inbound-purchase-invoice`; daar hoeft bij Mailjet niets voor.

3. **Controle** na het omzetten: in de app *Admin → E-mail gezondheid →
   Webhook-status*, knop *Zelftest*. De dagelijkse `email-webhook-heartbeat`
   is een cron-job in het nieuwe project en hoeft nergens geregistreerd.

### Twilio (WhatsApp)

console.twilio.com → *Messaging → Senders → WhatsApp senders* (of, als het
nummer nog via een Messaging Service loopt, *Messaging → Services → [service]
→ Integration*). Bij het nummer uit `TWILIO_WHATSAPP_NUMBER`:

```
When a message comes in (webhook):  https://utshmnyrjzwtrpttxdlw.supabase.co/functions/v1/whatsapp-webhook   (HTTP POST)
Status callback URL:                 leeg laten (wordt niet gebruikt)
```

Geen token in de URL: Twilio ondertekent elk bericht en de functie
controleert die handtekening met `TWILIO_AUTH_TOKEN`. Controle: stuur een
WhatsApp naar het bureau-nummer en kijk of hij in de Werkbank verschijnt, of
roep *Admin → WhatsApp diagnose* aan.

### MAP (Mijnfietsverhuur): niets nodig

Er is geen webhook van MAP naar ons. De betaalstatus wordt door de pagina
`/boeking` zelf opgevraagd via `map-payment-status`, en de terugkeer-URL na
betalen is `bureauvlieland.nl`, die niet verandert.

### Netlify: niets nodig

De nieuwe waarden komen via `.env` in de repo (stap 6).

### Claude zet het om: `run-migration.sh webhooks`

Mailjet en Twilio hebben beide een API. `supabase/scripts/migrate-webhooks.py`
haalt de sleutels op via `secrets-export` en zet alles in één keer om:

```bash
supabase/scripts/run-migration.sh webhooks                 # alleen tonen wat er staat
supabase/scripts/run-migration.sh webhooks --apply         # omzetten naar nieuw
supabase/scripts/run-migration.sh webhooks --apply --target old   # vangnet: terug
```

Vereist in de netwerkregels van de Claude-omgeving: `api.mailjet.com`,
`api.twilio.com` en `messaging.twilio.com` (WhatsApp-senders en messaging
services staan op die laatste). Stand op 7 september (kijk-modus): Mailjet
zeven event-registraties en één parse-route (`@reply.bureauvlieland.nl`);
Twilio de WhatsApp-sender +31 562 700 208 (ONLINE) en de messaging service
"Whatsapp bureauvlieland website", beide met de inbound-webhook. Alles wijst
nog naar het oude project en is klaar om om te zetten. De sandbox-sender
+1 415 523 8886 (OFFLINE, demo-URL van Twilio) laat het script met rust.

## Stap 6 — Omschakelen **[Claude]**

Volgorde: (a) verse export uit Lovable en `restore` opnieuw met overschrijven,
(b) `storage` opnieuw, (c) de commit hieronder, (d) zodra Netlify klaar is
stap 5 uitvoeren. Eén commit: `.env` (URL, project-id, anon key), `supabase/config.toml`
(project_id), en `SUPABASE_DEPLOY_ENABLED=true` als repository variable met de
twee secrets `SUPABASE_ACCESS_TOKEN` en `SUPABASE_DB_PASSWORD`. Netlify bouwt
de frontend tegen het nieuwe project.

Daarna de controlelijst: inloggen, een inkoopfactuur scannen (AI-sleutel), een
partnermail sturen (Mailjet), een WhatsApp (Twilio), de logiesoffertes en
foto's zichtbaar (storage), en de volgende ochtend `critical-selftest` en de
heartbeat in de logs (cron).

Verloop op 8 september (nacht): route B (export 19:36 hergebruikt, één
bewerking overgedaan). Twee hobbels, beide opgelost: (1) de toegangsrechten
ontbraken na de restore (zie stap 2, fase 5 / *Herstel rechten*); (2) daardoor
faalde ook de Netlify-build, want `scripts/generate-sitemap.ts` leest tijdens
de build bouwstenen en programma's uit de database met de anon key. Na het
herstel van de rechten en *Trigger deploy* in Netlify stond de nieuwe website
om 00:45 live. Controles: inloggen, WhatsApp (twee testberichten aangekomen),
`critical-selftest` 13/13, Mailjet-webhookstatus in orde. Nog te doen: een
inkoopfactuur scannen (Gemini) en een partnermail (Mailjet) op een werkdag.
Ochtend 8 september: cron-planner stond stil door een tellerconflict
(`runid_seq`), gerepareerd via de SQL Editor en vastgelegd in
`after-restore.sql` (stap 1b). Claudia verwijderd (migratie
`20260908063000_claudia-opruimen.sql`); `OPENAI_API_KEY` vervalt daarmee.
Het Lovable-domein `bureauvlieland.lovable.app` wordt in de code niet meer
als productie behandeld (mails vanaf die host krijgen [TEST] en gaan naar het
testadres); na *Remove Lovable Cloud* bestaat die host niet meer.

Pas als dat groen is: in Lovable *Remove Lovable Cloud*. Tot die tijd blijft het
oude project als vangnet staan.

### Eerst: visitvlieland.nl omzetten

Visitvlieland.nl (apart Lovable-project met eigen database) leest de
vermeldingen van logies en activiteiten uit **onze** database, en op 8
september nog uit de oude (`blhspuifehausilnzwio`). Na *Remove Lovable Cloud*
vallen die pagina's dus weg. Omzetten vóór het opruimen, in het
visitvlieland-project in Lovable:

1. Zoek in de code naar `blhspuifehausilnzwio` (meestal `.env` en
   `src/integrations/supabase/client.ts`).
2. Vervang de URL door `https://utshmnyrjzwtrpttxdlw.supabase.co` en de
   publieke sleutel (`VITE_SUPABASE_PUBLISHABLE_KEY` / anon key) door die van
   het nieuwe project (staat in `.env` van deze repo; openbaar, geen geheim).
3. Publiceer en controleer <https://visitvlieland.nl/verblijven?type=hotel>
   en een detailpagina. In het nieuwe project verschijnt visitvlieland.nl
   dan als referer in de logboeken (Supabase → Logs → API).

Wat visitvlieland gebruikt is al aanwezig in het nieuwe project: de
weergave `partners_public` (leesbaar zonder inloggen), gepubliceerde
`building_blocks`, `program_templates`, `partner_room_types` en de
publieke bucket `partner-images`. De velden uit logieskeuze fase 2
(`facilities`, `check_in_time`, `check_out_time`) zitten niet in
`partners_public`; toevoegen als visitvlieland ze wil tonen.

## Waarom niet gewoon "Lovable koppelen aan eigen Supabase"

Lovable kan na *Remove Lovable Cloud* een eigen Supabase-project koppelen. Dat
is dezelfde verhuizing als hierboven (export, restore, bestanden, secrets),
alleen blijft Lovable dan de deployer. Wij willen juist dat GitHub dat doet;
daarom koppelen we Lovable niet opnieuw.
