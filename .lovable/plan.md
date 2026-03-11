

# Partner-afwijzing logiesaanvraag: e-mail en communicatie-log toevoegen

## Probleem
Wanneer een partner een logiesaanvraag afwijst (zonder alternatieve datums), gebeurt er alleen een database-update. Er wordt:
- Geen e-mail verstuurd naar de admin
- Geen entry in het communicatie-logboek aangemaakt
- Alleen een admin_todo aangemaakt bij alternatieve datums, niet bij een gewone afwijzing

Bij alternatieve datums wordt wél een `project_communications` entry aangemaakt en een admin_todo. Bij gewone afwijzing ontbreekt dit allebei.

## Oplossing

### 1. `src/pages/PartnerAccommodation.tsx` — handleQuoteDecline uitbreiden
Na de bestaande `if (hasAlternativeDates)` blok, een `else` blok toevoegen dat:
- Een **admin_todo** aanmaakt met hoge prioriteit (`auto_type: "accommodation_quote_declined"`)
- Een **project_communications** entry aanmaakt (type `note`, direction `inbound`) zodat de afwijzing in de communicatie-tijdlijn verschijnt

### 2. `src/pages/PartnerDashboard.tsx` — zelfde wijziging
Dezelfde logica toepassen in de `handleQuoteDecline` van het PartnerDashboard (duplicaat van dezelfde functie).

### Bestanden
- `src/pages/PartnerAccommodation.tsx` — else-blok toevoegen na hasAlternativeDates check
- `src/pages/PartnerDashboard.tsx` — idem

### Geen e-mail nodig
Een admin-notificatie e-mail is niet nodig — de admin_todo en communicatie-log zijn voldoende. De admin ziet de afwijzing in de tijdlijn en in de takenlijst.

