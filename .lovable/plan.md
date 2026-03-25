

## Plan: Verplichte afvaartkeuze met "Weet ik nog niet" optie

### Probleem
Klanten kunnen het formulier versturen zonder een afvaarttijd te kiezen. Een harde verplichting om een specifieke tijd te kiezen is niet altijd realistisch — klanten weten dit soms nog niet.

### Oplossing
Maak het veld verplicht, maar voeg een extra keuze-knop toe: **"Weet ik nog niet"**. Zo moet de klant actief een keuze maken (specifieke tijd óf "weet ik nog niet"), maar wordt niemand geblokkeerd.

### Aanpassingen

**1. `src/components/configurator/FerryDeparturePicker.tsx`**
- Voeg onder de lijst met afvaarten een extra knop toe: "Weet ik nog niet" die `onSelect("flexibel")` aanroept
- Style als dezelfde keuze-knop, met vraagteken-icoon
- Voeg optionele `hasError` prop toe — als `true`, toon rode rand om het hele blok

**2. `src/components/configurator/ProgramBuilderView.tsx`**
- Bij klik op "Offerte aanvragen": check of ferry-blokken (`boot-enkel-heen`, `boot-enkel-terug`) een `preferredTime` hebben (inclusief `"flexibel"` als geldige waarde)
- Zo niet: toon toast "Selecteer een afvaarttijd of kies 'Weet ik nog niet'" en blokkeer submit
- Markeer betreffende ferry-picker met `hasError={true}`

### Geen database-wijzigingen nodig
De waarde `"flexibel"` wordt opgeslagen als gewone string in `preferredTime` — de admin ziet dit als tekst bij de overtocht.

