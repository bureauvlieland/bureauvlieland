# Werkwijze: van idee naar productie

## De route

```
Jij beschrijft wat je wilt
        ↓
wijziging op een aparte branch
        ↓
CI draait automatisch          ← tests, build, typecheck, lint
        ↓
Netlify bouwt een preview      ← eigen URL, de echte site
        ↓
jij kijkt en keurt goed
        ↓
"Merge" in GitHub
        ↓
automatisch live
```

Het verschil met voorheen: er zit een moment tussen waarop je de wijziging
kunt zien voordat een klant hem ziet, en niets komt op `main` zonder dat de
poorten groen staan.

## De poorten in CI

| Poort | Wat het bewaakt | Type |
|---|---|---|
| Frontend-tests (Vitest) | Bestaand gedrag blijft werken | moet slagen |
| Edge function-tests (Deno) | Idem, aan de serverkant | moet slagen |
| Productiebuild | De site is nog te bouwen | moet slagen |
| Typecheck `tsconfig.app.json` | Geen typefouten | moet op 0 blijven |
| Lint | Plafond, mag alleen omlaag | zie hieronder |
| Strict-mode | Plafond, mag alleen omlaag | zie hieronder |

### Plafonds in plaats van "eerst alles opruimen"

Er stonden bij het dichtzetten van de poorten 1230 lint-problemen en 26
strict-mode fouten open. Die eerst allemaal oplossen zou de invoering
maandenlang uitstellen.

In plaats daarvan staan ze als plafond in `.github/quality-baselines.env`.
Een wijziging die eroverheen gaat, faalt. Een wijziging die eronder duikt,
krijgt een melding met het verzoek het plafond te verlagen. Zo groeit de
schuld niet, en slinkt hij bij elke opruimactie zichtbaar.

## Previews

Elke pull request krijgt van Netlify een eigen URL met de volledige site erop.
Die previews:

- draaien onder mode `preview`, zodat fouten daaruit in Sentry apart staan van
  productiefouten;
- krijgen een `robots.txt` die indexeren verbiedt, zodat ze nooit als dubbele
  content naast `bureauvlieland.nl` verschijnen;
- praten met dezelfde Supabase-omgeving als productie. **Let op:** wat je in
  een preview aanmaakt of wijzigt, staat echt in de database.

## Deploy

Netlify bouwt met de opdracht in `netlify.toml`, niet met `npm run build`.
Reden: het `prebuild`-script gebruikt `bunx`, en welke lockfile Netlify oppikt
staat niet vast (deze repo heeft er drie). Voeg je een stap toe aan `prebuild`
in `package.json`, voeg hem dan ook toe in `netlify.toml`.

De 301-redirects van de oude website staan in `public/_redirects`. Vite
kopieert dat bestand naar `dist/`, Netlify leest het daar. Dat bestand is de
enige plek waar redirects horen.

## Wat er per ongeluk niet meer kan

- Rechtstreeks naar `main` pushen (branch protection)
- Een build-brekende wijziging samenvoegen
- Een typefout introduceren in code die vandaag schoon is
- Meer lint- of strict-fouten toevoegen dan er al waren

## Eén bewuste keuze in de deploy

`netlify.toml` draait vóór de build de sitemap-generator. Die haalt de
activiteiten- en programmapagina's uit Supabase.

Die generator faalde voorheen stil: was Supabase onbereikbaar, dan schreef hij
een sitemap zonder die ~50 pagina's, slaagde de build, en ging het live. Dat is
nu omgedraaid — bij een onbereikbare bron **faalt de deploy**, en blijft de
bestaande `public/sitemap.xml` ongemoeid.

Dat betekent dat een storing bij Supabase je deploy kan blokkeren. Dat is de
bedoeling: een mislukte deploy zie je meteen en draai je opnieuw, een stilletjes
gehalveerde sitemap merk je pas weken later aan je vindbaarheid.

Werk je lokaal zonder netwerk, gebruik dan `SITEMAP_ALLOW_STALE=1`.
