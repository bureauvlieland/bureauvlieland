
# Fix: Klantportaal communicatie voor maatwerk-programma's (quote mode)

## Probleem
Bij maatwerk-programma's (admin-aangemaakt, program_type = "quote") toont het klantportaal ten onrechte de melding "Aanvragen verstuurd naar aanbieders", terwijl het programma nog in de voorbereidingsfase zit (quote_status = "concept" of "in_afstemming"). Partners mogen pas worden benaderd nadat de klant akkoord geeft.

De gewenste flow is:
1. Admin maakt programma en voegt onderdelen toe (concept/in_afstemming)
2. Admin stuurt offerte naar klant (offerte_verstuurd)
3. Klant bekijkt, past eventueel aan, en geeft akkoord
4. Pas dan worden partners benaderd

## Oorzaak
Drie componenten houden onvoldoende rekening met de pre-approval status van quote-programma's:

1. **ActionRequiredCard**: Checkt alleen op `offerte_verstuurd` om de "Aanvragen verstuurd" melding te onderdrukken, maar niet op `concept` en `in_afstemming`
2. **ProgramIntroCard**: Heeft geen state voor concept/in_afstemming, waardoor de default self-service tekst ("Wij hebben de aanvragen verstuurd") wordt getoond
3. **StatusSummary (checklist)**: Toont "Wachten op aanbieders" terwijl de aanbieders nog niet benaderd zijn

## Wijzigingen

### 1. ActionRequiredCard.tsx
- Verbreed de `isQuoteAwaitingApproval` check naar alle pre-approval statussen: `concept`, `in_afstemming`, en `offerte_verstuurd`
- Voor concept/in_afstemming: toon een neutrale melding "Uw programma wordt voorbereid" in plaats van de "Aanvragen verstuurd" melding

### 2. ProgramIntroCard.tsx
- Voeg een nieuw blok toe voor quote programs in concept/in_afstemming status
- Tekst: "Bureau Vlieland stelt uw programma samen. U ontvangt een bericht zodra het voorstel klaar is om te bekijken."
- Dit vervangt de huidige fall-through naar de self-service tekst

### 3. StatusSummary.tsx (checklist variant)
- Accepteer een `isPreApproval` prop
- Bij pre-approval: toon "In voorbereiding" in plaats van "Wachten op aanbieders" bij de programma-status

### 4. DesktopProgramView.tsx en MobileProgramView.tsx
- Geef de `isPreApproval` waarde door aan StatusSummary (checklist variant)

## Technische details

Geen database-wijzigingen nodig. Alleen frontend-aanpassingen in 5 bestanden:

- `src/components/customer-portal/ActionRequiredCard.tsx` - pre-approval check verbreden + nieuw action type
- `src/components/customer-portal/ProgramIntroCard.tsx` - nieuw blok voor concept/in_afstemming
- `src/components/customer-portal/StatusSummary.tsx` - isPreApproval prop toevoegen
- `src/components/customer-portal/DesktopProgramView.tsx` - isPreApproval doorgeven aan StatusSummary
- `src/components/customer-portal/MobileProgramView.tsx` - isPreApproval doorgeven aan StatusSummary
