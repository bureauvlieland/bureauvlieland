

## Plan: Bannertekst aanpassen + orphaned items fixen met partnermail

### 1. Bannertekst corrigeren (2 bestanden)

**`src/pages/admin/AdminRequestDetail.tsx` (regel 636)**
Huidige tekst: "Geen automatische partner-notificaties. Stem handmatig af en verstuur offerte wanneer gereed."
Nieuwe tekst: "Bureau Vlieland beheert de offerte en factureert centraal. Partners ontvangen wel automatische aanvraag- en statusmeldingen."

**`src/pages/admin/AdminProgramNew.tsx` (regel 250-253)**
Huidige tekst bevat "Geen automatische partner-notificaties."
Nieuwe tekst: "Bureau Vlieland stelt het programma samen, verstuurt de offerte en factureert centraal. Partners ontvangen automatisch aanvraag- en statusmeldingen."

### 2. Eenmalige edge function voor retroactieve fix

Een nieuwe edge function `fix-orphaned-cancellations` die:

1. Alle `program_request_items` ophaalt waar het programma status `cancelled` heeft maar het item niet
2. Per item de partner-email opzoekt in de `partners` tabel (dezelfde `enrichProviderEmails` logica)
3. Partners groepeert per project zodat elke partner een overzichtelijke annuleringsmail krijgt
4. Alle items op `cancelled` zet
5. Resultaat teruggeeft met hoeveel items zijn bijgewerkt en hoeveel partners gemaild

**Huidige data:** 13 orphaned items over 2 geannuleerde projecten (BV-2602-0008 en BV-2602-0001). Partners: Brouwerij Fortuna, Cafe Boven, Rederij Doeksen, Zeehondentochten Vlieland, Trattoria Oliva. Bureau Vlieland-items (`block_type: bureau`) worden wel geannuleerd maar krijgen geen mail.

**Stappen na implementatie:**
- Edge function deployen
- Eenmalig aanroepen via curl
- Resultaat verifiteren
- Optioneel: edge function weer verwijderen

### Samenvatting

| Wijziging | Bestand |
|---|---|
| Bannertekst aanpassen | `AdminRequestDetail.tsx`, `AdminProgramNew.tsx` |
| Eenmalige fix edge function | `supabase/functions/fix-orphaned-cancellations/index.ts` |

