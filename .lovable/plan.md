
# Configurator redesign: "Laten regelen" vs "Zelf regelen"

## Concept

De huidige configurator dwingt iedereen door hetzelfde traject: wizard -> bouwstenen kiezen -> aanvraag versturen. Dit wordt opgesplitst in twee duidelijke tracks, al in de allereerste stap van de wizard:

```text
+------------------------------------------+
|     Waar mogen we u mee helpen?           |
+------------------------------------------+
|                                           |
|  +----------------+  +----------------+  |
|  |                |  |                |  |
|  |  LATEN REGELEN |  |  ZELF REGELEN  |  |
|  |                |  |                |  |
|  |  Bureau        |  |  Stel zelf uw  |  |
|  |  Vlieland      |  |  programma     |  |
|  |  stelt een     |  |  samen uit     |  |
|  |  programma     |  |  losse         |  |
|  |  op maat voor  |  |  activiteiten  |  |
|  |  u samen       |  |                |  |
|  +----------------+  +----------------+  |
|                                           |
+------------------------------------------+
```

### Track 1: "Laten regelen" (maatwerk aanvraag)
Een kort, laagdrempelig traject:
1. Keuze "Laten regelen"
2. Korte intake: type (zakelijk/prive), groepsgrootte, datum(s), eventueel voorbeeldprogramma bekijken
3. Contactgegevens + wensen/opmerkingen
4. Klaar -- Bureau Vlieland neemt het over

Dit combineert de huidige wizard-stappen met het offerte-formulier tot een vloeiend geheel, zonder dat de klant zelf bouwstenen hoeft te kiezen.

### Track 2: "Zelf regelen" (huidige configurator)
De bestaande bouwstenen-configurator, maar:
- Wizard ingekort: alleen groepsgrootte + datum
- Direct naar de bouwstenen-grid
- "Losse activiteiten" positionering
- Communicatie als "zelf samenstellen"

---

## Technische aanpak

### 1. ConfiguratorWizard.tsx -- Nieuwe stap 1: Track-keuze

Stap 1 wordt vervangen. In plaats van drie opties (Zakelijk / Prive / Los) komen er twee grote kaarten:

| Optie | Titel | Beschrijving |
|---|---|---|
| `laten_regelen` | Laten regelen | "Bureau Vlieland stelt een programma op maat voor u samen. U vertelt ons wat u zoekt, wij doen de rest." |
| `zelf_regelen` | Zelf regelen | "Stel zelf uw programma samen uit ons aanbod van activiteiten, catering en vervoer." |

**Bij "Laten regelen":**
- Stap 2: Type (zakelijk/prive) + groepsgrootte + datum(s) -- gecombineerd op 1 scherm
- Stap 3: Voorbeeldprogramma's tonen (optioneel, ter inspiratie -- niet om te laden in cart)
- Stap 4: Contactgegevens + wensen -- vergelijkbaar met het huidige offerte-formulier maar geintegreerd in de wizard
- Submit creëert een `program_request` met `program_type` = het gekozen type, zonder items (of met template-referentie)

**Bij "Zelf regelen":**
- Stap 2: Groepsgrootte + datum(s) (compacter, zonder type-keuze)
- Direct door naar de bouwstenen-grid (bestaande flow)

### 2. Nieuw component: MaatwerkIntakeForm.tsx

Een inline formulier (binnen de wizard) voor het "Laten regelen" track:
- Naam, email, telefoon (verplicht)
- Bedrijf (optioneel)
- Wensen/omschrijving (vrij tekstveld)
- Logies gewenst? (ja/nee toggle, alleen bij meerdaags)
- Submit-knop: "Aanvraag versturen"

Bij submit:
- Creëert een `program_request` record in de database (zelfde tabel als nu)
- Roept de bestaande `send-program-request` edge function aan (met lege blocks-array)
- Toont succesbericht met link naar klantportaal

### 3. TemplateSelector.tsx -- Aanpassing voor "Laten regelen"

In het "Laten regelen" track worden templates getoond als **inspiratie**, niet om in een cart te laden. De "Gebruik" knop wordt vervangen door "Dit spreekt mij aan" -- dit slaat de template-naam op als notitie bij de aanvraag, maar laadt niets in een cart.

### 4. ProgrammaSamenstellen.tsx -- Routing-logica

De pagina krijgt logica om te schakelen tussen tracks:
- Bij `laten_regelen`: de wizard loopt door tot en met het intake-formulier, de bouwstenen-grid wordt nooit getoond
- Bij `zelf_regelen`: bestaande flow, wizard eindigt bij de bouwstenen-grid

### 5. Hero-tekst en HowItWorksBlock aanpassen

- Hero bij "Laten regelen": "Wij regelen uw programma op Vlieland"
- Hero bij "Zelf regelen": "Stel zelf uw programma samen"
- HowItWorksBlock wordt contextafhankelijk (of verwijderd in het "Laten regelen" track)

### 6. Database

Geen schema-wijzigingen nodig. Het bestaande `program_requests` tabel ondersteunt al aanvragen zonder items. Het `program_type` veld kan het type vastleggen, en `general_notes` vangt wensen op. Eventueel kan `program_description` de geselecteerde template-inspiratie bevatten.

---

## Bestanden die worden aangemaakt of aangepast

| Bestand | Actie |
|---|---|
| `src/components/configurator/ConfiguratorWizard.tsx` | Stap 1 vervangen door track-keuze, flow splitsen |
| `src/components/configurator/MaatwerkIntakeForm.tsx` | **Nieuw** -- inline intake-formulier voor "Laten regelen" |
| `src/components/configurator/TemplateSelector.tsx` | "Gebruik" knop aanpassen voor inspiratie-modus |
| `src/pages/ProgrammaSamenstellen.tsx` | Track-routing, hero-tekst per track |
| `src/components/configurator/HowItWorksBlock.tsx` | Optioneel verbergen bij "Laten regelen" |

## Wat NIET verandert

- De bouwstenen-grid, cart, AddToCartDialog, RequestFormModal -- deze blijven intact voor het "Zelf regelen" track
- Database schema -- geen migraties nodig
- Edge functions -- bestaande `send-program-request` wordt hergebruikt
- Het offerte-formulier op `/offerte` -- blijft bestaan als alternatief
