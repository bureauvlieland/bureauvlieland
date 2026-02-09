
# Afgewezen logiespartners notificeren

## Probleem
Wanneer een klant een logiesofferte kiest (`select-accommodation-quote`), worden andere openstaande offertes op `rejected` gezet (regel 130-141), maar de bijbehorende partners ontvangen hierover **geen notificatie**. Dit is onprofessioneel -- partners wachten dan onnodig op een reactie.

## Wijzigingen

### 1. Edge Function: `select-accommodation-quote/index.ts`
Na het afwijzen van de andere offertes (regel 130-141), de afgewezen partners ophalen en per partner een e-mail sturen:

- **Ophalen afgewezen offertes**: Query de zojuist ge-update quotes met status `rejected` voor deze `request_id`, inclusief partnergegevens (`partner:partners(name, email)`)
- **Per afgewezen partner een e-mail versturen** met:
  - Klantnaam en periode
  - Naam van de accommodatie waarvoor ze een offerte hadden gedaan
  - Een vriendelijke tekst dat de klant voor een andere optie heeft gekozen
  - Geen financiele details van de gekozen offerte (privacy)
- **E-mail loggen** via de bestaande `logEmail()` utility met nieuw type

### 2. E-mail template constanten
Toevoegen aan de bestaande constanten:

- **`email-templates.ts`**: Nieuw `TemplateIds.ACCOMMODATION_REJECTED_PARTNER` toevoegen
- **`email-logger.ts`**: Nieuw `EmailTypes.ACCOMMODATION_REJECTED_PARTNER` toevoegen

Dit maakt het template ook beheerbaar via de admin e-mail templates pagina.

### 3. Partner Portal weergave
De partner ziet al een status "Niet gekozen" badge in het overzicht (`PartnerAccommodationRequestCard.tsx`). Geen aanvullende UI-wijziging nodig.

## Technisch detail

### E-mail inhoud (fallback HTML)
```
Onderwerp: Logiesaanvraag [klantnaam] - niet gekozen

Beste [partnernaam],

Wij laten u weten dat de klant [klantnaam] voor de periode
[aankomst] - [vertrek] voor een andere accommodatie heeft gekozen.

Uw offerte voor [accommodatienaam] wordt hiermee afgesloten.

Bedankt voor het uitbrengen van uw offerte. Wij hopen u bij een
volgende aanvraag weer te mogen benaderen.

Met vriendelijke groet,
Bureau Vlieland
```

### Bestanden die worden gewijzigd
- `supabase/functions/select-accommodation-quote/index.ts` -- e-mails versturen naar afgewezen partners
- `supabase/functions/_shared/email-templates.ts` -- nieuw template ID
- `supabase/functions/_shared/email-logger.ts` -- nieuw email type
