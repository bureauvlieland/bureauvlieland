# Naar productie

> Verhuizing naar een eigen Supabase-project: zie [migratie-supabase.md](migratie-supabase.md).

Er zijn twee helften, en ze gaan op verschillende manieren live.

## Frontend — vanzelf, via Netlify

Alles onder `src/` en `public/`. Een merge naar `main` bouwt en publiceert
automatisch op bureauvlieland.nl. Elke pull request krijgt een eigen preview
(`https://deploy-preview-<nummer>--bureauvlieland.netlify.app`). Hier hoef je
niets voor te doen.

## Backend — nu nog via Lovable

Alles onder `supabase/`: de edge functions (`supabase/functions/`), de
databasemigraties (`supabase/migrations/`) en `supabase/config.toml`.

**Sinds 8 september 2026 draait de backend in een eigen Supabase-project
(`utshmnyrjzwtrpttxdlw`); zie `docs/migratie-supabase.md`. De tekst hieronder
beschrijft de oude situatie onder Lovable Cloud (`blhspuifehausilnzwio`) en
geldt niet meer; deployen gaat nu via `.github/workflows/deploy-supabase.yml`.**

Oude situatie: het project draaide onder Lovable Cloud, niet onder een eigen
Supabase-account. Dat betekende:

- er is geen supabase.com-dashboard en geen personal access token voor dit
  project, dus de Supabase CLI en de GitHub-workflow kunnen er niet bij;
- Lovable is de enige route om edge functions en migraties uit te rollen;
- de database, de bestanden in de buckets, de gebruikersaccounts en de secrets
  staan in Lovable's account. Zolang het Lovable-abonnement loopt is dat geen
  probleem, maar het is de reden om op termijn naar een eigen project te gaan
  (zie onderaan).

### Zo rol je backend-wijzigingen nu uit

1. Merge de pull request naar `main`. Lovable is aan deze repo gekoppeld en
   haalt `main` binnen.
2. Open het project in Lovable en controleer dat de laatste commit van GitHub
   is gesynchroniseerd.
3. Vraag Lovable expliciet om de edge functions opnieuw te deployen, bijvoorbeeld
   "deploy alle edge functions opnieuw" of met de naam van de gewijzigde functie.
   Reken er niet op dat dit vanzelf gebeurt bij een sync vanuit GitHub.
4. Migraties: Lovable past nieuwe bestanden in `supabase/migrations/` toe bij
   het deployen; controleer in Lovable of de migratie is gelopen.

### Controleren of de nieuwe backend draait

Open in de admin een gescande inkoopfactuur en klap "Wat heeft de scanner
gelezen?" open. Staat er een veld `customer_reference` in de JSON, dan draait de
scanner van september 2026 of later. Een tweede check: stuur een logiesofferte
door naar een klant die niet bestaat — de foutmelding hoort dan een reden te
noemen in plaats van "non-2xx".

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
elke merge naar `main`. Hij is gebouwd voor de situatie waarin het project onder
een eigen Supabase-account draait, en **staat daarom uit** (repository-variabele
`SUPABASE_DEPLOY_ENABLED` ontbreekt). Zet hem pas aan ná een verhuizing naar een
eigen project; daarvoor werkt hij niet.

Na zo'n verhuizing is het inrichten:

1. Personal access token op <https://supabase.com/dashboard/account/tokens>.
2. GitHub: *Settings → Secrets and variables → Actions → Secrets* →
   `SUPABASE_ACCESS_TOKEN`.
3. Voor migraties ook `SUPABASE_DB_PASSWORD` (Supabase → Project Settings →
   Database). Zonder dit geheim worden alleen functies gedeployed.
4. Variabele `SUPABASE_DEPLOY_ENABLED` = `true`.
5. `project_id` in `supabase/config.toml` en de `VITE_SUPABASE_*`-waarden in
   `.env` omzetten naar het nieuwe project.

Handmatig draaien kan dan via *Actions → Deploy Supabase → Run workflow*, met
een lijst functies en een schakelaar om migraties over te slaan. Vanaf een eigen
machine werkt ook `npx supabase login`, `npx supabase link --project-ref <ref>`,
`npx supabase functions deploy [naam]` en `npx supabase db push`.

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

## Naar een eigen Supabase-project

De reden om dit te doen is eigendom, niet gemak: database, bestanden,
gebruikersaccounts en secrets van jou in plaats van via Lovable. Het is een
verhuizing van enkele dagen die zorgvuldig moet, met als lastigste deel de
gebruikersaccounts (wachtwoorden moeten versleuteld mee). Wat er precies bij
komt kijken staat in een apart plan zodra daartoe besloten is; begin er niet
aan zonder dat plan.

## Volgorde bij een release die beide raakt

Een migratie die een kolom toevoegt, en een frontend die die kolom leest:
merge ze samen en deploy de backend direct daarna via Lovable. Netlify is
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
`20260921113000_cron-bearer-en-timeout.sql` heeft alle jobs hersteld; een
nieuwe job schrijf je zo:

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
