

## Plan: Drie verbeteringen klantportaal

### 1. "Bekijk details" opent de collapsible in plaats van de side-sheet

**Probleem:** De "Bekijk details" knop bij logiesoffertes opent een side-sheet (AccommodationQuoteDetailSheet), terwijl bij programma-items details inline uitklappen. Dit is inconsistent.

**Oplossing:** De "Bekijk details" knop toggled de collapsible open/dicht. Alle informatie die nu in de side-sheet staat (extra's, kamerconfiguratie, voorwaarden, beschrijving, externe offerte-link, partner opmerkingen) wordt verplaatst naar de CollapsibleContent in `AccommodationQuoteItem.tsx`. De `AccommodationQuoteDetailSheet` wordt niet meer aangeroepen vanuit de klantweergave.

**Wat er in de collapsible komt:**
- Beschrijving
- Extra's (via `useQuoteExtras` hook, inclusief prijzen per extra)
- Kamerconfiguratie met prijzen
- Inbegrepen items (als badges)
- Voorwaarden
- Externe offerte-link
- Partner opmerkingen
- Totaalprijs inclusief extra's

**Bestanden:**
- `AccommodationQuoteItem.tsx` -- collapsible content uitbreiden met alle detail-informatie, "Bekijk details" toggled nu de collapsible, `useQuoteExtras` hook toevoegen
- `AccommodationSection.tsx` -- `AccommodationQuoteDetailSheet` import en rendering verwijderen, `onViewDetails` callback aanpassen

---

### 2. "Aanvragen verstuurd naar aanbieders" niet tonen bij maatwerkvoorstel

**Probleem:** Bij een maatwerkvoorstel (quote mode, status `offerte_verstuurd`) toont de ActionRequiredCard "Aanvragen verstuurd naar aanbieders" terwijl er nog geen akkoord is gegeven. De aanvragen zijn in werkelijkheid nog niet verstuurd -- dat gebeurt pas na akkoord.

**Oplossing:** In `ActionRequiredCard.tsx` wordt de "pending items" logica (prioriteit 3) overgeslagen wanneer het programma in quote-mode staat en de status `offerte_verstuurd` is. Er worden twee nieuwe props toegevoegd: `programType` en `quoteStatus`.

Voor maatwerkvoorstellen met status `offerte_verstuurd` wordt in plaats daarvan ofwel geen actiekaart getoond (de ProgramIntroCard behandelt dit al), ofwel een specifieke tekst zoals "Bekijk het voorstel en geef akkoord om de reserveringen te starten".

**Bestanden:**
- `ActionRequiredCard.tsx` -- props uitbreiden met `programType` en `quoteStatus`, conditionele logica aanpassen
- `DesktopProgramView.tsx` -- extra props doorgeven aan ActionRequiredCard
- `MobileProgramView.tsx` -- idem

---

### 3. Foto's van logiespartners

**Observatie:** Er zijn momenteel geen afbeeldingen opgeslagen bij logiespartners in de database. Het `partners` tabel-schema bevat geen `image_url` of vergelijkbaar veld.

**Voorstel:** Een `image_url` kolom toevoegen aan de `partners` tabel zodat accommodatiepartners een profielfoto of gebouwfoto kunnen instellen. Dit kan later via het admin- of partnerportaal worden beheerd.

Op korte termijn tonen we het BedDouble-icoon als placeholder (zoals nu), met de mogelijkheid om later een afbeelding weer te geven zodra die beschikbaar is in de database.

**Database-migratie:** `ALTER TABLE partners ADD COLUMN image_url text;`

**Bestanden:**
- Database-migratie voor `image_url` kolom
- `AccommodationQuoteItem.tsx` -- toon afbeelding als `quote.partner?.image_url` beschikbaar is, anders fallback naar icoon
- Partner type definities updaten

---

### Technische details

**AccommodationQuoteItem.tsx - uitgebreide collapsible:**

De collapsible content wordt uitgebreid met de volledige offerte-informatie:
- `useQuoteExtras(quote.id)` hook wordt aangeroepen voor extra's
- Prijsopbouw: verblijf + extra's + totaal
- Kamerconfiguratie met prijzen per nacht
- Inbegrepen items als badges
- Voorwaarden en beschrijving
- Externe offerte-link (indien aanwezig)
- Partner opmerkingen

De "Bekijk details" knop wordt vervangen door het aanroepen van `setIsOpen(!isOpen)` op de collapsible.

**ActionRequiredCard.tsx - quote-mode check:**

```text
// In getAction():
// Priority 3: Pending items - maar NIET bij maatwerkvoorstel dat wacht op akkoord
if (statusSummary.pending > 0 && !isQuoteAwaitingApproval) {
  // ... bestaande logica
}
```

### Bestanden die wijzigen

| Bestand | Wijziging |
|---------|-----------|
| `src/components/customer-portal/AccommodationQuoteItem.tsx` | Collapsible uitbreiden met alle details, useQuoteExtras integreren, "Bekijk details" toggled collapsible, optionele partner-afbeelding |
| `src/components/customer-portal/AccommodationSection.tsx` | AccommodationQuoteDetailSheet verwijderen, onViewDetails vereenvoudigen |
| `src/components/customer-portal/ActionRequiredCard.tsx` | Props uitbreiden, quote-mode check toevoegen |
| `src/components/customer-portal/DesktopProgramView.tsx` | Extra props doorgeven aan ActionRequiredCard |
| `src/components/customer-portal/MobileProgramView.tsx` | Idem |
| Database-migratie | `image_url` kolom toevoegen aan partners |
