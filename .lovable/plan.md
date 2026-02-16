

## Communicatie verbeteren: aanvragen zijn verstuurd naar aanbieders

Bij self-service programma's worden de aanvragen direct verstuurd naar de partners na indiening. De klant ziet nu "Wachten op bevestiging" maar het is niet heel duidelijk dat de aanvragen daadwerkelijk al verstuurd zijn. We verbeteren dit op twee plekken:

### Wijzigingen

**1. ActionRequiredCard - Duidelijkere pending-melding**

De huidige tekst bij pending items:
> "Nog X activiteiten wachten op reactie van de aanbieder. U ontvangt een e-mail zodra zij reageren."

Wordt vervangen door:
> **Titel:** "Aanvragen verstuurd naar aanbieders"
> **Beschrijving:** "Uw programma is ingediend en de aanvragen zijn verstuurd naar X aanbieder(s). Zodra zij reageren ontvangt u hiervan een e-mail."

Dit maakt expliciet duidelijk dat de aanvragen al onderweg zijn.

**2. ProgramOverviewCard - Subtitel voor self-service**

De huidige subtitel:
> "Wij stemmen activiteiten, logies en planning op elkaar af zodat alles klopt."

Wordt vervangen door een contextbewuste tekst die ook benoemt dat aanbieders worden benaderd:
> "Uw aanvragen zijn verstuurd naar de aanbieders. Wij stemmen alles op elkaar af."

Dit wordt alleen getoond wanneer er daadwerkelijk pending items zijn (via een nieuwe prop `hasPendingItems`). Wanneer alles bevestigd is, blijft de huidige tekst staan.

### Technische aanpassingen

- `src/components/customer-portal/ActionRequiredCard.tsx`: Titel en beschrijving van het "pending" blok aanpassen
- `src/components/customer-portal/ProgramOverviewCard.tsx`: Subtitel dynamisch maken op basis van pending status (nieuwe optionele prop `hasPendingItems`)
- `src/components/customer-portal/DesktopProgramView.tsx`: Prop `hasPendingItems` doorgeven
- `src/components/customer-portal/MobileProgramView.tsx`: Prop `hasPendingItems` doorgeven

