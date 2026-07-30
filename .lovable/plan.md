## Doel

Eén voorspelbare regel voor de geldigheid van een offerte: **standaard één maand vóór aankomst**. Ligt die datum al (bijna) in het verleden omdat de aankomst binnen een maand valt, dan doet het systeem een haalbaar voorstel dat duidelijk als "korte termijn" gemarkeerd is en dat u met één klik aanpast.

## Waarom dit nu misgaat

De geldigheidsdatum wordt op vier plekken los van elkaar bepaald, met drie verschillende regels:

| Plek | Huidige default |
| --- | --- |
| Nieuw programma aanmaken (wizard) | 2 weken vóór eerste programmadatum, anders vandaag + 14 dagen |
| Offerte-preview (Bekijk & verstuur) | 2 weken vóór eerste datum, anders morgen |
| Offerte versturen (dialoog) | bestaande datum, anders vandaag + 14 dagen — kijkt níet naar de aankomstdatum |
| Handmatig wijzigen op de projectkaart | vrije keuze, geen suggestie |

Daardoor krijgt dezelfde offerte een andere einddatum afhankelijk van waar u hem verstuurt.

## De nieuwe regel

Eén centrale rekenregel, hardcoded op één maand:

```text
voorstel = eerste programmadatum - 1 maand

als voorstel >= vandaag + 7 dagen   -> gebruik voorstel        (normaal)
anders                              -> korte termijn:
                                       midden tussen vandaag en aankomst,
                                       met minimaal vandaag + 3 dagen
                                       en maximaal aankomst - 1 dag
geen programmadatum bekend          -> vandaag + 14 dagen      (terugval)
```

Het voorstel valt nooit ná de aankomst en nooit in het verleden. De admin kan de datum altijd overschrijven; zodra u zelf een datum kiest, laat het systeem die staan.

## Wat u gaat zien

- Overal dezelfde voorgestelde datum, met een korte toelichting onder de datumkiezer: *"Standaard: één maand vóór aankomst (28 augustus)."*
- Bij een aanvraag binnen een maand een oranje "korte termijn"-melding: *"Aankomst is over 12 dagen — voorstel: 4 dagen geldig. Pas aan indien nodig."*
- In de offerte-verzenddialoog wordt de datum nu óók op de aankomst gebaseerd in plaats van blind vandaag + 14 dagen.
- Op de projectkaart bij "Geldig tot" een knopje **Standaard** dat de datum terugzet naar één maand vóór aankomst.
- In de datumkiezers zijn datums vóór morgen en ná de aankomstdatum niet meer selecteerbaar.

## Technische aanpak

1. **Nieuw bestand `src/lib/quoteValidity.ts`** — pure functies, geen I/O:
   - `QUOTE_VALIDITY_LEAD_DAYS` (één maand vóór aankomst) en `MIN_SHORT_TERM_DAYS` als constanten.
   - `suggestQuoteValidUntil({ arrivalDate, today })` → `{ date, mode: "standard" | "short_term" | "fallback", daysUntilArrival, daysValid }`.
   - `describeQuoteValidity(result)` → Nederlandse toelichting voor de UI.
   - Helper `isQuoteExpired(validUntil, today)` zodat de bestaande verlopen-checks dezelfde datumvergelijking gebruiken (nu op sommige plekken inclusief tijdcomponent, wat op de dag zelf tot "verlopen" kan leiden).
2. **Aanroepen vervangen** in `src/pages/admin/AdminProgramNew.tsx`, `src/pages/admin/AdminQuotePreview.tsx`, `src/components/admin/AdminSendQuoteDialog.tsx` en de "Geldig tot"-popover in `src/pages/admin/AdminRequestDetail.tsx`; per plek de toelichting/korte-termijn-melding tonen en de kalender begrenzen (`disabled` op verleden en na aankomst).
3. **Vitest-suite `src/lib/__tests__/quoteValidity.test.ts`**: normale termijn, aankomst binnen een maand, aankomst over 2 dagen (minimum), geen datum bekend, meerdaags programma (eerste datum is anker), en dat het voorstel nooit ná aankomst of vóór morgen valt.

Geen databasewijziging nodig: `quote_valid_until` blijft zoals het is en bestaande offertes worden niet aangepast.
