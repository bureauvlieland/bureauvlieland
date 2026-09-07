# Naar productie

Er zijn twee helften, en ze gaan op verschillende manieren live.

## Frontend — vanzelf, via Netlify

Alles onder `src/` en `public/`. Een merge naar `main` bouwt en publiceert
automatisch op bureauvlieland.nl. Elke pull request krijgt een eigen preview
(`https://deploy-preview-<nummer>--bureauvlieland.netlify.app`). Hier hoef je
niets voor te doen.

## Backend — via de workflow "Deploy Supabase"

Alles onder `supabase/`: de edge functions (`supabase/functions/`), de
databasemigraties (`supabase/migrations/`) en `supabase/config.toml`.

Dit ging vroeger vanzelf omdat Lovable het deed. Dat mechanisme is met de
overstap verdwenen. Zonder de workflow hieronder bereikt een wijziging in een
edge function of een migratie productie **nooit**, hoe groen CI ook is — de
code staat dan wel op `main`, maar Supabase draait nog de vorige versie.

De workflow `.github/workflows/deploy-supabase.yml` doet het nu: bij elke merge
naar `main` die iets onder `supabase/` raakt, deployt hij alle edge functions
en past hij de migraties toe. Hij draait pas als hij aanstaat (zie hieronder);
tot die tijd slaat hij zichzelf over in plaats van te falen.

### Eenmalig inrichten

1. **Personal access token** aanmaken op
   <https://supabase.com/dashboard/account/tokens>. Geef hem een herkenbare
   naam ("GitHub deploy bureauvlieland").
2. In GitHub: *Settings → Secrets and variables → Actions → Secrets* →
   `SUPABASE_ACCESS_TOKEN` met die token.
3. Voor migraties ook `SUPABASE_DB_PASSWORD`: het databasewachtwoord uit
   *Supabase Dashboard → Project Settings → Database*. Zonder dit geheim worden
   alleen de functies gedeployed en slaat de workflow migraties over met een
   waarschuwing.
4. Zet de workflow aan: *Settings → Secrets and variables → Actions →
   Variables* → `SUPABASE_DEPLOY_ENABLED` = `true`.

Het project-ref (`blhspuifehausilnzwio`) hoeft niet geheim te zijn; hij staat
in `supabase/config.toml` en de workflow leest hem daar.

### Handmatig draaien

Onder *Actions → Deploy Supabase → Run workflow* kun je hem ook met de hand
starten, bijvoorbeeld om één functie opnieuw te deployen:

- **functions**: `notify-accommodation-quote scan-purchase-invoice` (leeg = alle)
- **skip_migrations**: aanvinken als je alleen functies wilt

### Zonder GitHub, vanaf je eigen machine

Als noodgreep werkt de Supabase CLI ook lokaal:

```bash
npx supabase login                       # eenmalig, opent de browser
npx supabase link --project-ref blhspuifehausilnzwio
npx supabase functions deploy            # alle functies
npx supabase functions deploy <naam>     # één functie
npx supabase db push                     # migraties
```

### Wat de workflow bewust níet doet

- Hij verwijdert geen functies die niet meer op schijf staan. Een functie die
  je uit de repo haalt, blijft op Supabase bestaan tot je hem daar weghaalt
  (`npx supabase functions delete <naam>`). Let op: `temp-invoice-pdf-audit`
  staat nog op schijf en wordt dus mee-gedeployed zolang hij er staat.
- Hij zet geen secrets (`MAILJET_API_KEY` en dergelijke). Die staan in
  *Supabase Dashboard → Edge Functions → Secrets* en blijven daar.
- Hij draait niet op pull requests. Een edge-function-wijziging is dus pas te
  testen tegen de echte database na de merge — of lokaal met `supabase functions
  serve`.

## Volgorde bij een release die beide raakt

Een migratie die een kolom toevoegt, en een frontend die die kolom leest:
merge ze samen. Netlify en de Supabase-workflow starten dan allebei op dezelfde
commit. Netlify is meestal eerder klaar; de paar minuten waarin de frontend
een kolom leest die er nog niet is, vang je op door de frontend tegen een
ontbrekende kolom bestand te maken — niet door de volgorde te proberen te sturen.
