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
| 3 | De bestanden (foto's, offertes, facturen) kopiëren | **Wacht op jou**: `storage-export` in Lovable deployen en het admin-wachtwoord in de Claude-omgeving corrigeren |
| 4 | De 133 programma's plaatsen en hun wachtwoorden invoeren | Programma's staan erop (7 sep, Pro-abonnement was nodig). **Wacht op jou**: de 31 secrets overnemen uit Lovable |
| 5 | Mailjet, Twilio en MAP het nieuwe adres geven | Jij, met exacte adressen van Claude |
| 6 | Omschakelen en controleren | Claude, daarna samen controleren |

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
| Secrets van edge functions | Niet in de export | Opnieuw invoeren (lijst bij stap 4) |
| AI (scanner, Claudia, e-mailhulp) | Liep via Lovable's AI-gateway | Eigen Gemini-sleutel; code is klaar (`_shared/ai.ts`) |
| Outlook-doorsturen | Liep via Lovable's Microsoft-connector | Uitgefaseerd; doorsturen gaat via Mailjet |
| Externe webhooks (Mailjet, Twilio/WhatsApp, MAP) | Wijzen naar de oude URL | Opnieuw registreren op de nieuwe URL |
| Frontend (Netlify) | n.v.t. | Alleen `.env` wijzigen |

## Stap 0 — Nieuw project en sleutels **[gedaan, op drie na]**

Nieuw project: `utshmnyrjzwtrpttxdlw` (regio eu-west-1, Ierland).
URL `https://utshmnyrjzwtrpttxdlw.supabase.co`. Anon key staat in
`supabase/scripts/run-migration.sh` (publiek). Databasewachtwoord en
service_role key zijn aangeleverd.

Het project moet op het **Pro-abonnement** staan: het gratis abonnement laat
lang niet 133 edge functions toe (fout 402 bij het deployen) en pauzeert een
project na een week zonder gebruik. Gedaan op 7 september.

Nog nodig:

1. **Gemini API-sleutel**: https://aistudio.google.com/apikey. Vervangt de
   Lovable AI-gateway voor alle scan- en tekstfuncties (zelfde modellen).
2. **OpenAI API-sleutel** (alleen Claudia's zoekindex, centen per maand):
   https://platform.openai.com/api-keys.
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

Let op bij stap 3: `npm ci` en `bun install` werken niet in de Claude-omgeving,
omdat de lockbestanden naar Lovable's eigen npm-register (`*.pkg.dev`) wijzen
en dat daar geblokkeerd is. Het kopieerscript heeft maar twee pakketten nodig;
die installeert Claude los vanaf registry.npmjs.org
(`npm install --registry=https://registry.npmjs.org @supabase/supabase-js tsx`
in een tijdelijke map) en draait het script van daaruit.

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

Vanaf een eigen computer met `pg_restore` 18 kan het ook zonder GitHub:
`supabase/scripts/run-migration.sh restore <bestand>`.

## Stap 3 — Bestanden kopiëren **[Claude]**

Vereist dat de tijdelijke edge function `storage-export` in het **oude**
project staat (Lovable: "deploy de edge function storage-export"). De
buckets `database_export_*` (Lovable's eigen exports) slaat het script over.
Daarna:

```bash
supabase/scripts/run-migration.sh storage --dry-run   # eerst tellen
supabase/scripts/run-migration.sh storage             # dan kopiëren
```

Het script is herhaalbaar. Verwacht: 250 bestanden, ~470 MB (de grootste
buckets zijn quote-documents 175 MB, building-block-images 150 MB en
partner-images 77 MB).

## Stap 4 — Edge functions en secrets **[Claude + jij]**

```bash
supabase/scripts/run-migration.sh functions
```

De per-functie instelling `verify_jwt` komt uit `supabase/config.toml`.

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
