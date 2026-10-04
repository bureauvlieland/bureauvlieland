# Naar productie

> Achtergrond bij de verhuizing van Lovable Cloud naar een eigen Supabase-project (8 september 2026): zie [migratie-supabase.md](migratie-supabase.md).

Er zijn twee helften, en ze gaan op verschillende manieren live.

## Frontend — vanzelf, via Netlify

Alles onder `src/` en `public/`. Een merge naar `main` bouwt en publiceert
automatisch op bureauvlieland.nl. Elke pull request krijgt een eigen preview
(`https://deploy-preview-<nummer>--bureauvlieland.netlify.app`). Hier hoef je
niets voor te doen.

## Backend — via GitHub Actions naar Supabase

Alles onder `supabase/`: de edge functions (`supabase/functions/`), de
databasemigraties (`supabase/migrations/`) en `supabase/config.toml`. Dat gaat
**niet** via Netlify. De backend draait in een eigen Supabase-project
(`utshmnyrjzwtrpttxdlw`) en wordt bij elke merge naar `main` gedeployed door de
workflow "Deploy Supabase" (zie hieronder). Een wijziging onder `supabase/` die
op `main` staat maar niet is gedeployed, draait dus niet: kijk bij *Actions →
Deploy Supabase* of de run groen is.

### Controleren of de nieuwe backend draait

Open de run in *Actions → Deploy Supabase*: de stap "functions deploy" noemt de
gedeployde functies, de migratiestap de toegepaste bestanden. Daarnaast staat
elke functie met zijn laatste versie in het Supabase-dashboard onder *Edge
Functions*.

## Netlify: bouwminuten

Netlify bouwt bij elke push naar `main` en bij elke pull request (deploy
preview). Het gratis plan heeft 300 bouwminuten per maand; op 8 september
2026 was dat op en moest een betaald plan worden afgesloten. Twee dingen
houden het verbruik laag:

1. `netlify.toml` heeft een `ignore`-regel: wijzigt een commit alleen
   `docs/`, `supabase/`, `.github/`, `.lovable/` of markdownbestanden, dan
   bouwt Netlify niet. Die wijzigingen gaan via GitHub Actions of zijn tekst.
2. Deploy previews voor pull requests kunnen uit (Netlify → Site
   configuration → Build & deploy → Deploy Previews → "None"). GitHub Actions
   controleert de productiebuild al op elke PR; de preview-URL is handig maar
   niet nodig.

## AI-aanbieder (Claude of Gemini)

Alle AI-aanroepen lopen via `supabase/functions/_shared/ai.ts`. Staat het
secret `ANTHROPIC_API_KEY` bij de edge functions, dan gaat alles naar Claude
(`claude-opus-5`); anders naar Gemini via `GEMINI_API_KEY`, met terugval op
andere Gemini-modellen als een model verdwijnt of aan zijn limiet zit. Beide
sleutels tegelijk kan: Claude eerst, Gemini bij een storing.

Sleutel toevoegen: Supabase-dashboard → Edge Functions → Secrets →
`ANTHROPIC_API_KEY`. Geen herdeploy nodig; functies lezen het secret bij de
volgende aanroep. Een Anthropic-sleutel maak je op
<https://console.anthropic.com/settings/keys>. Zet de sleutel nooit in de
repo of in een chat.

## De GitHub-workflow "Deploy Supabase"

`.github/workflows/deploy-supabase.yml` deployt edge functions en migraties bij
elke merge naar `main` die iets onder `supabase/` raakt. Hij draait alleen als
de repository-variabele `SUPABASE_DEPLOY_ENABLED` op `true` staat; zonder die
variabele slaat de job zichzelf over.

Eenmalig ingericht (nodig bij een nieuw project of nieuwe token):

1. Personal access token op <https://supabase.com/dashboard/account/tokens>.
2. GitHub: *Settings → Secrets and variables → Actions → Secrets* →
   `SUPABASE_ACCESS_TOKEN`.
3. Voor migraties ook `SUPABASE_DB_PASSWORD` (Supabase → Project Settings →
   Database). Zonder dit geheim worden alleen functies gedeployed.
4. Variabele `SUPABASE_DEPLOY_ENABLED` = `true`.
5. `project_id` in `supabase/config.toml` en de `VITE_SUPABASE_*`-waarden in
   `.env` moeten naar dit project wijzen.

Handmatig draaien kan via *Actions → Deploy Supabase → Run workflow*, met
een lijst functies en een schakelaar om migraties over te slaan. Vanaf een eigen
machine werkt ook `npx supabase login`, `npx supabase link --project-ref <ref>`,
`npx supabase functions deploy [naam]` en `npx supabase db push`.

Faalt de migratiestap met "Found local migration files to be inserted before the
last migration on remote database", dan is een migratie gemerged met een oudere
datum dan de laatste in productie (twee branches naast elkaar). Alles erna blijft
dan wachten. Start de workflow handmatig met de schakelaar *include_all* (zelfde
als `supabase db push --include-all`); controleer eerst wat de achterliggende
migratie doet, want die draait buiten de volgorde van de datums.

De workflow gebruikt een vaste CLI-versie (`version:` bij `supabase/setup-cli`).
Met `latest` vraagt de actie bij elke run de nieuwste release op bij de
GitHub-API, en dat verzoek loopt zonder token geregeld tegen "rate limit
exceeded" aan. Bijwerken: nieuw nummer invullen (`npm view supabase version`
geeft de laatste).

Faalt een migratie halverwege, dan zijn de migraties ervóór wél toegepast en
geregistreerd; alleen de gefaalde en latere blijven staan. De volgende run
probeert precies die opnieuw. Een nog niet toegepaste migratie mag je dus
gewoon aanpassen in plaats van een nieuwe ernaast te zetten.

Wat de workflow bewust níet doet: functies verwijderen die van schijf zijn
(`temp-invoice-pdf-audit` gaat dus mee zolang hij er staat), secrets zetten, of
op pull requests draaien. Verwijderen kan wel expliciet: *Run workflow* met
bij *delete_functions* de namen (spatie-gescheiden) van functies die al uit
`supabase/functions/` zijn gehaald; de workflow weigert namen die nog in de
repo staan.

## Volgorde bij een release die beide raakt

Een migratie die een kolom toevoegt, en een frontend die die kolom leest:
merge ze samen; de workflow deployt de backend direct daarna. Netlify is
meestal eerder klaar; de minuten waarin de frontend een kolom leest die er nog
niet is, vang je op door de frontend tegen een ontbrekende kolom bestand te
maken — niet door de volgorde te proberen te sturen.

## Valkuil: datamigraties op `building_blocks`

De trigger `trg_prevent_partner_publish_building_blocks` laat alleen admins en
de service-rol de velden `status`, `is_published` en `is_active` wijzigen. Een
migratie draait via de CLI zonder auth-context, dus ook een `UPDATE` uit een
migratie wordt geweigerd ("Partners cannot change publish/status fields").
Gebeurd op 17 september 2026 bij de merge van de wizard-PR: de eerste van drie
migraties faalde, de CLI stopte, en de twee erna zijn ook niet toegepast.

Zet in zo'n migratie de trigger tijdelijk uit en meteen weer aan:

```sql
ALTER TABLE public.building_blocks DISABLE TRIGGER trg_prevent_partner_publish_building_blocks;
UPDATE public.building_blocks SET status = 'published', is_published = true WHERE id = '...';
ALTER TABLE public.building_blocks ENABLE TRIGGER trg_prevent_partner_publish_building_blocks;
```

## Valkuil: cron-jobs, `verify_jwt` en de wachttijd van pg_net

Elke cron-job die een edge function aanroept (`net.http_post` in
`cron.job.command`) moet de anon key **twee keer** meesturen: als `apikey`
én als `Authorization: Bearer …`. Onder Lovable Cloud stond `verify_jwt` bij
elke functie uit en volstond `apikey`; in het eigen project bepaalt
`supabase/config.toml` dat per functie, en de CLI-standaard voor functies
die er niet in staan is `true`. De gateway weigert een aanroep zonder
Authorization-header dan met 401 "Missing authorization header". Zo
draaiden cron-watchdog, critical-selftest, flag-missing-partner-invoices,
auto-close-past-execution, auto-close-monitor, send-arrival-reminder en
map-sync-blocks van 8 tot 21 september 2026 geen enkele keer, en de watchdog
kon dat niet melden omdat hij zelf ook geweigerd werd. Migratie
`20260921113000_cron-bearer-en-timeout.sql` vult bij elke job aan wat
ontbreekt. De jobs zijn in de loop van de tijd op vier manieren geschreven:
een JSON-literal met alleen `apikey` (de jobs uit deze repo), Lovable-stijl
met alleen `Authorization` (de jobs die Lovable rechtstreeks in de database
zette), `jsonb_build_object(...)` en zonder headers. De eerste versie van de
migratie kende alleen de eerste vorm en had een controleblok dat de hele
migratie liet falen zodra één job niet klopte; daardoor mislukte de deploy
van 21 september en bleef ook de rest kapot. Nu geeft een onbekende vorm een
`WARNING` met de jobnaam, en meldt de watchdog zo'n job de volgende ochtend.
Een nieuwe job schrijf je zo:

```sql
select cron.schedule('mijn-taak-daily', '0 6 * * *', $cron$
  insert into public.cron_dispatch_log (jobname, request_id)
  select 'mijn-taak-daily', net.http_post(
    timeout_milliseconds := 120000,
    url := 'https://utshmnyrjzwtrpttxdlw.supabase.co/functions/v1/mijn-taak',
    headers := '{"Content-Type":"application/json","apikey":"<anon key>","Authorization":"Bearer <anon key>"}'::jsonb,
    body := '{"triggeredBy":"cron"}'::jsonb
  );
$cron$);
```

De anon key is de publieke sleutel uit `.env` (`VITE_SUPABASE_PUBLISHABLE_KEY`),
geen geheim. Zet `timeout_milliseconds` altijd op 120000: de standaard van
pg_net is 5 seconden, en een functie die langer doet (check-pending-items,
send-guest-details-reminder) werd daardoor elke dag als "fout" gemeld terwijl
hij gewoon doorliep.

Een functie die de Authorization-header zelf bekijkt, moet de anon key als
Bearer-token herkennen als systeemverkeer: `isAnonBearer()` uit
`_shared/jwt-role.ts` (zie `auto-close-past-execution` en `map-sync-blocks`).
Vergelijk niet met `SUPABASE_ANON_KEY` uit de omgeving van de functie: die
waarde wijkt sinds de verhuizing af van de anon key die de cron meestuurt.

Let op: CI draait de Deno-tests met `--no-check`. Een verkeerde functienaam
in een edge function valt dus pas op bij het draaien (de commissiecontrole
stond van 6 tot 21 september op een `ReferenceError`). Laat een test de code
echt uitvoeren, zoals `_shared/commissionReconciliationData.test.ts` met een
nep-client doet, of draai `deno check` op de functie voordat je pusht.
