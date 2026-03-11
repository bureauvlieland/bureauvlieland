

# Klantreis vereenvoudigen: van 4 stappen naar 1 keuze

## Probleem

De huidige flow heeft **vier schermen** voordat een klant iets nuttigs doet:

```text
Huidige flow (te veel stappen):
Hero → "Laten/Zelf regelen" → Personen + datums → "Erwin/Template/Handmatig" → inhoud

Dat zijn twee keuzeschermen die overlap hebben.
```

## Nieuwe flow

```text
Nieuwe flow (direct naar actie):
Hero → 3 visuele kaarten direct zichtbaar → klant kiest → track verzamelt basics zelf → inhoud
```

De `ConfiguratorWizard` (met "Laten regelen / Zelf regelen" track-keuze en aparte personen/datums stap) wordt **volledig overgeslagen**. De `EntryChoice` wordt het eerste en enige keuzescherm, direct onder de hero, met visueel rijke foto-kaarten (zoals de huidige "Laten/Zelf regelen" kaarten).

### Wat elke track doet met basisgegevens

| Track | Basisgegevens |
|---|---|
| **Erwin (AI)** | Verzamelt al personen + datums in eigen stappen — geen wijziging nodig |
| **Voorbeeldprogramma** | Inline personen + datums picker boven de template-lijst |
| **Zelf kiezen** | Inline personen + datums in de cart-sidebar (bestaand) |

## Technische wijzigingen

### 1. `EntryChoice.tsx` — visueel upgrade
- Vervang de huidige list-style kaarten door grote foto-kaarten (2 + 1 grid) met gradient overlay, vergelijkbaar met de huidige "Laten/Zelf regelen" kaarten
- Gebruik bestaande assets (erwin-profile, team-beach, dunes-group)

### 2. `ProgrammaSamenstellen.tsx` — wizard verwijderen
- Verwijder de `"basics"` fase volledig
- Start direct in `"entry_choice"` fase (tenzij cart items aanwezig → `"manual"`)
- Verwijder `ConfiguratorWizard` import en alle wizard-gerelateerde handlers
- De hero tekst wordt altijd de welkomst-variant

### 3. `TemplateSelector.tsx` — inline basics
- Voeg een compacte personen + datums picker toe bovenaan de template-lijst
- Zodat de klant niet eerst een apart formulier hoeft in te vullen

### 4. Cart sidebar — al bestaand
- De handmatige track heeft al personen/datums in de `ConfiguratorCart` sidebar — geen wijziging nodig

## Bestanden

| Actie | Bestand |
|---|---|
| Wijzig | `src/components/configurator/EntryChoice.tsx` — foto-kaarten layout |
| Wijzig | `src/pages/ProgrammaSamenstellen.tsx` — wizard verwijderen, direct entry_choice |
| Wijzig | `src/components/configurator/TemplateSelector.tsx` — inline basics picker |

`ConfiguratorWizard.tsx` blijft bestaan (wordt nog gebruikt door admin tooling / MaatwerkIntakeForm flow) maar wordt niet meer geïmporteerd op de klantpagina.

