# Sync-dialog: per onderdeel kunnen kiezen + ook ongewijzigde items tonen

## Probleem
`SyncBuildingBlocksDialog` toont alleen onderdelen waarbij minimaal één veld verschilt van de bouwsteen. Overtocht en Fietshuur hebben in jouw project al `admin_price_override = bouwsteenprijs`, dus er is geen "diff" → ze worden volledig verborgen. Daardoor lijkt het of je ze niet kunt synchroniseren / herzien. Daarnaast kun je nu alleen op veld-niveau (alle items tegelijk) kiezen, niet per onderdeel.

## Oplossing — `src/components/admin/SyncBuildingBlocksDialog.tsx`

### 1. Toon álle gekoppelde onderdelen
- `loadDiffs()` blijft items met `block_id` ophalen, maar pusht ze óók naar `diffs` als er geen verschillen zijn (changes-array mag leeg zijn).
- Voor elk veld in `SYNC_FIELDS` voegen we altijd een rij toe met `oldValue`, `newValue` en een nieuwe `isChanged` boolean. Ongewijzigde rijen krijgen een subtiele "ongewijzigd"-stijl (muted, geen pijl-highlight) zodat het verschil tussen "wijzigen" en "forceer overschrijven" zichtbaar blijft.

### 2. Per-item selectie
- State uitbreiden met `selectedItemIds: Set<string>`. Default: alle items mét changes aangevinkt; items zonder changes default uit.
- Bij elk item-card een `<Checkbox>` linksboven naast de naam toevoegen.
- Knoppen "Alles aan" / "Alleen wijzigingen" boven de lijst voor snelle bulk-selectie.

### 3. Sync-logica respecteert beide selecties
- `handleSync` itereert alleen over items in `selectedItemIds`.
- Per geselecteerd item worden alle aangevinkte velden geschreven (`updateData[...] = block.<veld>`), óók als er geen diff was — dat geeft je een expliciete "forceer overschrijven" flow voor bv. een prijs die wel correct lijkt maar je wilt herbevestigen.
- Bestaande beveiliging blijft: prijs-veld wordt overgeslagen voor items met `quoted_price` (partner-bevestigde prijs).

### 4. Footer-teller
- "Synchroniseer N onderdelen" gebruikt `selectedItemIds.size` (gefilterd op items waar tenminste één aangevinkt veld een effect heeft, om confuse 0-update te voorkomen).
- Lege staat "Alle onderdelen zijn al up-to-date" vervalt; in plaats daarvan een neutrale samenvatting bovenaan: "X van Y onderdelen heeft wijzigingen t.o.v. de bouwstenen".

## Niet in scope
- Geen extra velden (lijst Prijs/Prijstype/Naam/Categorie/Duur/Locatie/Externe URL is dekkend voor Overtocht & Fietshuur).
- Geen wijziging in de partner-prijs-bescherming en geen DB-migratie.
