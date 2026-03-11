

# Enkele reizen + afvaarten kiezen in configurator

## Huidige situatie
- Er is alleen `boot-retour` (retour). De user wil **twee enkele reizen**: heenreis dag 1, terugreis laatste dag.
- De `FerryScheduleCard` en `useFerryDepartures` hook bestaan al en tonen afvaarten via de Doeksen API.

## Plan

### 1. Twee nieuwe building blocks aanmaken (database migratie)

| ID | Naam | Richting |
|---|---|---|
| `boot-enkel-heen` | Overtocht Harlingen → Vlieland | H → V |
| `boot-enkel-terug` | Overtocht Vlieland → Harlingen | V → H |

Kopieer gegevens van `boot-retour` (categorie `vervoer`, provider, etc). Voeg metadata toe: `price_extras: { portFrom: "H", portTo: "V" }` zodat de frontend weet welke route op te vragen.

### 2. Default-logica aanpassen (`ProgrammaSamenstellen.tsx`)

Vervang `DEFAULT_BLOCK_IDS = ["boot-retour", "fiets-huur"]` door:
- `boot-enkel-heen` op **dag 0**
- `boot-enkel-terug` op **laatste dag** (`selectedDates.length - 1`)
- `fiets-huur` op **dag 0**

Bij eendaagse programma's komen beide op dag 0.

### 3. Afvaarten-kiezer op ferry-kaarten (`ProgramBuilderView.tsx`)

Wanneer een cart-item een ferry-block is (`boot-enkel-heen` of `boot-enkel-terug`), toon onder de kaart een uitklapbaar paneel met:
- De afvaarten voor die dag (via `useFerryDepartures` met de juiste route en datum)
- Selecteerbare rijen — klik zet de `preferredTime` op het cart-item
- Geselecteerde afvaart wordt getoond op de kaart

Nieuw component: `FerryDeparturePicker` — een compacte versie van `FerryScheduleCard` met selectie-functionaliteit.

### 4. Cart context: `updateItem` wordt gebruikt

De bestaande `updateItem(blockId, { preferredTime })` methode in CartContext wordt gebruikt om de gekozen afvaart op te slaan. De `preferredTime` wordt meegestuurd bij de aanvraag.

## Bestanden

| Actie | Bestand |
|---|---|
| DB migratie | Twee nieuwe building blocks insert |
| Wijzig | `src/pages/ProgrammaSamenstellen.tsx` — nieuwe default block IDs + dag-toewijzing |
| Nieuw | `src/components/configurator/FerryDeparturePicker.tsx` — afvaarten met selectie |
| Wijzig | `src/components/configurator/ProgramBuilderView.tsx` — toon picker bij ferry-items |

