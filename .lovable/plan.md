# Verzorging altijd duidelijk voor de klant

## Hoe het nu bedacht is

Vorige release heeft "Verzorging" als expliciet veld toegevoegd:

- Klant geeft in de logieswizard een **voorkeur** op (`board_preference`).
- Logiespartner legt in de offerte de **definitieve verzorging** vast (`board_type` + vrije toelichting `board_notes`); het label staat in het formulier als "Verzorging *".
- Klantportaal, logiesportaal, admin-offertesheet en het verblijfsoverzicht-PDF tonen een badge "Verzorging: Logies & ontbijt".

## Waarom de klant het nu tóch niet ziet

Drie gaten, alle drie bevestigd:

1. **Geen enkele bestaande offerte heeft een waarde.** Van 101 offertes in de database (waarvan 7 gekozen) heeft er 0 een `board_type`. Badhotel Bruin uit de screenshot dus ook niet.
2. **Alle weergaven verbergen het blok bij een lege waarde.** Er staat dan niets — de klant ziet geen "onbekend", maar helemaal geen regel. Zo lijkt het alsof verzorging geen onderwerp is.
3. **Het sterretje bij "Verzorging *" is cosmetisch.** De submit-validatie in het partner-offerteformulier controleert alleen naam en prijs; een partner kan de verzorging leeg laten. Bovendien kan de admin de verzorging nergens zelf invullen of corrigeren — de admin-sheet toont het veld alleen.

## Wat we bouwen

### 1. Verplicht bij de partner
- Verzorging wordt een echte blokkerende eis bij het versturen van een offerte: geen keuze = melding "Kies de verzorging" en submit gaat niet door.
- Bij "Anders/in overleg" is de toelichting verplicht.

### 2. Admin kan verzorging vastleggen en corrigeren
- In de admin-offertesheet wordt Verzorging een bewerkbaar veld (keuzelijst + toelichting), met opslaan.
- Zo kunnen de lopende offertes (waaronder Badhotel Bruin) direct goedgezet worden zonder de partner opnieuw te bevragen.

### 3. Nooit meer stilte richting de klant
- Klantportaal (gekozen-kaart én offertelijst) toont de regel **altijd**:
  - bekend: `Verzorging: Logies & ontbijt` (+ toelichting);
  - onbekend: `Verzorging: nog niet bevestigd — wij checken dit bij de accommodatie`, met de bestaande "Nieuw bericht"-knop als directe actie.
- Dezelfde altijd-zichtbare regel in het losse logiesportaal en in het verblijfsoverzicht-PDF, zodat er geen kanaal is waar de klant het mist.
- In de prijsuitleg naast het totaal komt een korte verduidelijking: prijs incl. BTW, verzorging volgens de regel erboven.

### 4. Admin-signaal
- Een gekozen offerte zonder verzorging levert een werkbank-taak op ("Verzorging ontbreekt bij gekozen logies"), die automatisch sluit zodra de waarde is ingevuld.

## Technisch

- Geen migratie voor nieuwe kolommen nodig (`board_type`, `board_notes`, `board_preference` bestaan). Optionele datafix-migratie: `board_type = 'bed_breakfast'` waar `includes` "Ontbijt" bevat en `board_type` nog leeg is; de rest blijft leeg en gaat via de nieuwe admin-flow.
- Aanpassingen: `PartnerAccommodationQuoteSheet.tsx` (validatie in `handleSubmit` + inline foutmelding), `AdminAccommodationQuoteSheet.tsx` (bewerkbaar veld + update-mutatie), `AccommodationSection.tsx` en `AccommodationQuoteItem.tsx` (altijd tonen incl. fallback), `accommodation-portal/AccommodationQuoteCard.tsx` + `AccommodationQuoteDetailSheet.tsx`, `src/lib/stayOverviewPdf.ts`, en de todo-regel in `reconcile-admin-todos` (aanmaak- én sluit-criteria spiegelen).
- Tests: unit-tests op de validatiehelper (leeg / "other" zonder toelichting), op de fallback-tekst van `getBoardLabel`-weergave, en op de nieuwe todo-aanmaak/sluitregel.
