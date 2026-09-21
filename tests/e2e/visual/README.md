# Visuele regressie (fase 5, borging)

Eén pagina per paginasoort van de publieke site, op desktop (1440) en
telefoon (390), vergeleken met de referentie in `__snapshots__/`. Draait in
CI (job "Visuele regressie") tegen de preview-build. Wijkt een pagina meer
dan 1% van de pixels af, faalt de job en staan de verschillen in het
artefact `visuele-regressie` (verwacht, werkelijk en het verschil naast
elkaar in `playwright-report/index.html`).

## Referenties vernieuwen na een bedoelde wijziging

De referenties zijn gemaakt met precies de Chromium die CI gebruikt (de
headless shell van de vastgepinde Playwright-versie, op Linux). Lokaal
gemaakte schermafbeeldingen wijken daar vrijwel altijd iets van af; maak
nieuwe referenties daarom in CI:

1. GitHub → Actions → "Visuele referenties vernieuwen" → Run workflow → kies
   de branch van de pull request.
2. De workflow maakt alle referenties opnieuw, commit alleen de veranderde
   bestanden op die branch ("Visuele referenties vernieuwd") en start CI
   opnieuw.
3. Controleer in de pull request welke pagina's veranderd zijn. Klopt dat
   met de bedoeling van de wijziging, dan is de pull request klaar.

Dat kan ook vanuit een Claude-sessie (de workflow starten via de
GitHub-tools). Conflicteren de referenties na een merge van main, haal main
binnen en draai de workflow opnieuw. Weigert de workflow te pushen (403),
dan staan de workflow-rechten van de repository op alleen-lezen: Settings →
Actions → General → Workflow permissions → "Read and write permissions".

## Lokaal draaien

```bash
bunx playwright install chromium          # eenmalig, dezelfde versie als CI
bunx vite build --mode preview            # /ontwerp bestaat alleen buiten productie
bunx playwright test -c playwright.visual.config.ts
```

Op Ubuntu met de door Playwright gedownloade Chromium komt dit overeen met
CI. Op een Mac wijkt de tekstweergave af: gebruik daar de CI-artefacten om
te beoordelen en maak nieuwe referenties via de workflow hierboven.

## Wat de referenties wel en niet toetsen

- Opmaak, typografie, kleur en afstanden van elke paginasoort. De
  lettertypes komen van de site zelf (`public/fonts`), dus ze zijn altijd
  geladen; de test controleert dat ook.
- Foto's zijn een effen vlak (het logo en svg's niet): een andere foto is
  geen regressie en houdt de referentiebestanden klein.
- De twee lange catalogi (bouwstenen, activiteiten) zijn afgeknipt op
  8000 px (`maxHoogte`): daaronder herhaalt de lijst zichzelf en de
  voettekst staat al op de kortere pagina's.
- De boekmodule (`map-proxy`) zit niet in de opnames: de agenda en "Direct
  boekbaar" blijven in de test onzichtbaar, zodat de referentie niet met de
  echte agenda meebeweegt.

## Vaste data

De tests spelen Supabase-antwoorden af uit `fixtures/<pagina>.har`, met de
klok vastgezet op 21 september 2026. Alle andere externe verzoeken
(analytics, kaarten) worden geblokkeerd. Verandert een pagina welke data
zij ophaalt (nieuwe query, ander pad), neem de fixtures dan opnieuw op:

```bash
UPDATE_FIXTURES=1 bunx playwright test -c playwright.visual.config.ts --project=desktop --workers=1
node tests/e2e/visual/opschonen.mjs
```

De eerste regel schrijft de HAR-bestanden (alleen desktop, één tegelijk),
de tweede haalt mislukte en dubbele verzoeken eruit. Daarna de referenties
vernieuwen via de workflow.

## Een pagina toevoegen

Voeg een regel toe aan `PAGES` in `paginas.spec.ts` (naam, pad en eventueel
een tekst om op te wachten), neem de fixture op zoals hierboven en laat de
workflow de referentie maken. Zie ook de checklist voor een nieuwe pagina
in `docs/design-systeem.md`.
