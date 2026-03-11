

# Klantportaal: flow en statussen corrigeren

## Analyse van de problemen

Er zijn 5 samenhangende issues:

### 1. Onjuiste melding "Aanvragen verstuurd naar aanbieders"
De `ActionRequiredCard` en `ProgramIntroCard` tonen altijd "aanvragen verstuurd" als er pending items zijn. Maar bij een nieuw ingediend programma heeft de admin nog niets naar partners gestuurd. Het veld `program_published_at` bestaat al in de database en wordt gezet wanneer de admin het programma publiceert — dit is het juiste signaal.

**Oplossing**: `program_published_at` doorgeven aan `ActionRequiredCard` en `ProgramIntroCard`. Als `program_published_at` null is:
- ActionRequiredCard: "Uw aanvraag wordt beoordeeld" / "Bureau Vlieland bekijkt uw programma en bereidt de aanvragen voor."
- ProgramIntroCard: "Uw programma is ontvangen. Bureau Vlieland beoordeelt uw aanvraag en neemt indien nodig contact op."

Als `program_published_at` gezet is → huidige tekst "Aanvragen verstuurd naar aanbieders" is dan correct.

### 2. Klant kan programma niet meer wijzigen na indienen
Na het indienen van een aanvraag moet de klant het programma alleen kunnen bekijken, niet bewerken. Momenteel ziet de klant knoppen: "Toevoegen", "Tijd wijzigen", "Verwijderen".

**Oplossing**: Een `readOnly` prop toevoegen aan `CustomerProgramItem`. Als `program_published_at` null is (admin nog niet gepubliceerd = klant heeft net ingediend), is het programma read-only. De "Toevoegen" knop in `DesktopProgramView`/`MobileProgramView` wordt ook verborgen. Pas na publicatie (wanneer admin items naar partners stuurt) kan de klant eventueel wijzigingen doen.

### 3. Leeg programma-onderdeel
Een item zonder naam (Bureau Vlieland) verschijnt in de lijst. Dit is waarschijnlijk een item met `block_name` leeg in de database. De code filtert al op `status !== "cancelled"` maar niet op ontbrekende naam.

**Oplossing**: Items zonder `block_name` uitfilteren in de weergave, of als fallback "Nog te bepalen" tonen.

### 4. "Dag X - Datum" per item is overbodig
In `CustomerProgramItem` (regel 143-148) wordt per item "Dag 1 • 24 mrt" getoond, terwijl de `DayTabs` component al de dag en datum toont als tab-header.

**Oplossing**: De dag/datum-indicator per item verbergen wanneer `DayTabs` actief is (multi-day view). Alleen tonen op single-day view als er meerdere dagen zijn (wat niet voorkomt).

### 5. Status-labels heroverwegen
Huidige status "Aangevraagd" bij pending items impliceert dat er een aanvraag naar de partner is gegaan. Vóór publicatie moet dit "In behandeling" zijn.

**Oplossing**: De `overrideLabel` logica in `CustomerProgramItem` (regel 117) aanpassen. Als `program_published_at` null is → label "In behandeling". Als gepubliceerd → "Aangevraagd" (huidige label).

## Wijzigingen

| Bestand | Actie |
|---------|-------|
| `ActionRequiredCard.tsx` | Nieuwe prop `programPublishedAt`. Pre-publication: "Uw aanvraag wordt beoordeeld" (neutral variant) |
| `ProgramIntroCard.tsx` | Nieuwe prop `programPublishedAt`. Pre-publication: aangepaste tekst, geen bewerkopties |
| `CustomerProgramItem.tsx` | Nieuwe prop `readOnly`. Verbergt "Tijd wijzigen", "Verwijderen". Prop `hideDay` om dag/datum meta te verbergen in multi-day tabs |
| `DesktopProgramView.tsx` | Prop `programPublishedAt` doorgeven; "Toevoegen" knop verbergen pre-publicatie; `hideDay={true}` bij multi-day DayTabs; items zonder `block_name` filteren |
| `MobileProgramView.tsx` | Zelfde aanpassingen als desktop |

