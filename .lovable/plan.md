

## Plan: Statusmeldingen klantportaal opschonen en klanterkenning toevoegen

### Problemen

1. **`calculateStatusSummary` telt verkeerd**: `total` sluit `self_arranged` uit maar **niet** `cancelled`. Daardoor telt een geannuleerd item mee in het totaal. Ook ontbreekt `counter_proposed` in de telling.

2. **"Verstuurd naar X aanbieders"**: Tekst in `ActionRequiredCard` toont `statusSummary.pending` als aantal aanbieders, maar dat is het aantal *items* met status `pending` — niet het aantal unieke partners. Dit klopt dus niet.

3. **"Uw programma is bevestigd"**: Wordt getoond zodra `quoteStatus === "akkoord_ontvangen"`, maar er kunnen nog items wachten op partnerbevestiging. Dit is verwarrend naast de melding "Wachten op aanbieders".

4. **Geen klant-akkoord info in StatusSummary (screenshot 1)**: De klant ziet "3/8 bevestigd" maar weet niet hoeveel items zij zelf nog moeten akkoorderen.

### Oplossing

**A. `calculateStatusSummary` fixen** (`src/types/programRequest.ts`)
- `total` = items die niet `self_arranged` EN niet `cancelled` zijn
- `counter_proposed` toevoegen aan de return-waarden
- `progress` baseren op `confirmed` + items met `customer_accepted_at` voor een realistischer beeld

**B. StatusSummary checklist: klant-akkoord regel toevoegen** (`src/components/customer-portal/StatusSummary.tsx`)
- Nieuwe prop `customerApprovedCount` en `customerApprovableCount`
- Onder "Programma" een extra regel: "X van Y onderdelen geaccordeerd" (alleen tonen als `quoteStatus === "offerte_verstuurd"` of `"akkoord_ontvangen"`)

**C. ActionRequiredCard teksten corrigeren** (`src/components/customer-portal/ActionRequiredCard.tsx`)
- "Verstuurd naar aanbieders" → generieke tekst zonder aantallen, bijv. "Uw aanvragen zijn verstuurd naar de aanbieders. Zodra zij reageren ontvangt u een e-mail."
- De groene "bevestigd" melding alleen tonen als `allConfirmed` is EN alle items door de klant zijn geaccordeerd
- `counter_proposed` items niet meetellen als `pending`

**D. ProgramIntroCard afstemmen** (`src/components/customer-portal/ProgramIntroCard.tsx`)
- "Uw programma is bevestigd" alleen tonen als ook `allConfirmed` waar is — anders tonen dat er nog items in behandeling zijn

**E. Splash-pagina tellingen** (`src/components/customer-portal/CustomerPortalSplash.tsx`)
- `getProgramStatus` corrigeren: `counter_proposed` meenemen in de check voor "Klaar voor akkoord"

### Wijzigingen

| Bestand | Actie |
|---|---|
| `src/types/programRequest.ts` | `calculateStatusSummary` fixen: cancelled uitsluiten van total, counter_proposed toevoegen |
| `src/components/customer-portal/StatusSummary.tsx` | Klant-akkoord regel toevoegen in checklist variant |
| `src/components/customer-portal/ActionRequiredCard.tsx` | Teksten corrigeren: geen hardcoded aantallen aanbieders, counter_proposed meenemen |
| `src/components/customer-portal/ProgramIntroCard.tsx` | "Bevestigd" melding alleen bij daadwerkelijk alles bevestigd |
| `src/components/customer-portal/CustomerPortalSplash.tsx` | `getProgramStatus` counter_proposed meenemen |

Vijf bestanden, voornamelijk logica- en tekstwijzigingen.

