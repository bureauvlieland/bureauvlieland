

# Plan: Afbeeldingen altijd tonen in voorbeeldprogramma-tijdlijn

## Probleem
De afbeeldingen in de tijdlijnblokken zijn momenteel verborgen op mobiel (`hidden sm:block`). Ze verschijnen alleen op schermen breder dan 640px.

## Oplossing
Afbeeldingen altijd tonen, ook op mobiel, door de `hidden sm:block` class te verwijderen en de thumbnail compact te houden op kleine schermen.

## Technische aanpassing

**Bestand:** `src/components/programmas/ProgramTimeline.tsx`

- Verwijder `hidden sm:block` van de afbeelding-container (regel 82)
- Maak de thumbnail iets kleiner op mobiel: `w-20 sm:w-24 md:w-32`
- Zorg dat de afbeelding altijd zichtbaar is op alle schermformaten

Dit is een eenvoudige CSS-aanpassing van 1 regel.
