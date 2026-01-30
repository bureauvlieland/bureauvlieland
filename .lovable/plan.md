
# Plan: Automatische redirect naar klantpagina na logiesaanvraag

## Samenvatting
Na het succesvol indienen van een logiesaanvraag wordt de klant automatisch doorgestuurd naar hun persoonlijke klantpagina (`/mijn-programma/:token`). Vanuit die pagina kan de klant direct doorgaan met het samenstellen van hun programma door activiteiten toe te voegen.

## Wat er nu gebeurt
1. Klant doorloopt de programma wizard en kiest "Ja, regel logies voor mij"
2. Klant vult de logies wizard in en verstuurt de aanvraag
3. Klant ziet een bevestigingspagina met alleen een link terug naar de configurator
4. Die link brengt de klant terug naar het BEGIN van de wizard (ongewenst)

## Wat er gaat veranderen
1. Na het succesvol indienen van een logiesaanvraag wordt de klant **automatisch doorgestuurd** naar `/mijn-programma/:token`
2. Dit gebeurt voor ALLE gebruikers, niet alleen voor degenen die al activiteiten in hun winkelwagen hadden
3. De success pagina toont kort de bevestiging en stuurt na 2 seconden automatisch door

## Voordelen
- Gestroomlijnde ervaring: klant hoeft niet opnieuw te beginnen
- Unified portal: logies en activiteiten op één plek
- Duidelijke volgende stap: "Voeg activiteiten toe aan je programma"

## Technische aanpassingen

### 1. AccommodationWizard.tsx - Success handler
- Haal de linked_program token op na succesvolle insert
- Voer ALTIJD een redirect uit naar `/mijn-programma/:token` na 2 seconden
- Verwijder de afhankelijkheid van cartHandoff voor de redirect beslissing

### 2. AccommodationWizard.tsx - Success state UI
- Update de success pagina tekst voor de nieuwe flow
- Voeg een duidelijke indicator toe dat de klant wordt doorgestuurd
- Behoud de handmatige link als fallback

### 3. Verwijderen van onnodige "terug" link
- De "Terug naar programma" link op `/logies-aanvragen` die naar de wizard wijst is niet meer nodig na succesvolle indiening

## Flow na implementatie

```text
┌──────────────────┐
│ Logies Wizard    │
│ (5 stappen)      │
└────────┬─────────┘
         │ Submit
         ▼
┌──────────────────┐
│ Success pagina   │
│ "Aanvraag        │
│  ontvangen!"     │
│                  │
│ [redirect 2s]    │
└────────┬─────────┘
         │
         ▼
┌──────────────────────────────┐
│ /mijn-programma/:token       │
│                              │
│ ┌──────────────────────────┐ │
│ │ Logies: In behandeling   │ │
│ └──────────────────────────┘ │
│                              │
│ ┌──────────────────────────┐ │
│ │ + Activiteit toevoegen   │ │
│ └──────────────────────────┘ │
└──────────────────────────────┘
```
