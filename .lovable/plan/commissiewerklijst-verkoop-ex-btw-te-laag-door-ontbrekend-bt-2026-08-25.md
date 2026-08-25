# Commissiewerklijst: "Verkoop ex btw" te laag door ontbrekend btw-tarief

## Antwoord op je vraag
Nee, je geeft de marge niet weg. De kolom "Verkoop ex btw" wordt te laag berekend: alle 47 partneronderdelen missen hun btw-tarief (`vat_rate` is leeg), waardoor de werklijst standaard met 21% rekent. Catering, vervoer en rondvaarten zijn echter 9%. Daardoor lijkt de verkoop ex btw ~11% te laag en soms lager dan de inkoop — puur een weergavefout. De bouwstenen zelf hebben het juiste tarief wél; het is alleen nooit meegekopieerd naar de onderdelen.

Voorbeeld: Zeehondentocht € 425 incl. → werklijst toont € 351,24 (21%) terwijl het € 389,91 (9%) moet zijn; de inkoopfactuur van € 389,91 ex is dus niet "duurder dan de verkoop".

## Echte afwijkingen die overbleven na correctie (3 van 13 gekoppelde regels)
1. **Zeehondentocht, factuur 2026056** — inkoopfactuur geregistreerd met 21% btw (incl. € 471,79) terwijl het ex-bedrag exact 9% is (incl. moet € 425 zijn). Registratiefout in de factuur, bedrag ex klopt.
2. **Watertaxi De Bazuin, factuur 20260013** — verzamelfactuur RMD Trainingen (2 vaartochten à € 480/€ 470 + parkeren 8× = € 280) is aan één onderdeel van € 480 gekoppeld. Moet gesplitst/toegewezen worden over beide watertaxi-items; parkeren is geen programma-onderdeel (vraag: doorbelasten aan klant of als extra kost boeken?).
3. **Zaalhuur Fortuna (Gasunie10-4)** — partner factureerde € 660 ex terwijl onze verkoopprijs € 660 incl. is. Of de prijs op het onderdeel is destijds ex btw ingevoerd, of de partner heeft te veel gefactureerd. Jouw check nodig.

## Uitvoering
1. **Data-backfill (SQL)**: zet `vat_rate` op alle 47 partneronderdelen over vanuit de gekoppelde bouwsteen (via `block_id`).
2. **Factuurcorrecties (SQL)**: Zeehonden 2026056 naar 9% btw (incl. wordt € 425); Bazuin 20260013 toewijzen aan de twee watertaxi-items (480 + 470) via allocaties; parkeerregel € 280 apart afhandelen na jouw keuze; Fortuna-zaalhuur laten staan tot jouw beoordeling.
3. **Code, robuust maken** (`supabase/functions/_shared/commissionReconciliationData.ts`): bij het laden van de werklijst het btw-tarief van de bouwsteen ophalen als terugval wanneer het onderdeel zelf geen tarief heeft, zodat toekomstige onderdelen zonder tarief niet meer scheef tonen.
4. **Tests**: bestaande reconciliatie-tests uitbreiden met een geval "item zonder vat_rate valt terug op blok-tarief".

## Technische details
- Recon-logica: `exclVatFromIncl()` in `supabase/functions/_shared/commissionReconciliation.ts` (regel 283) valt terug op 21% bij null — blijft bestaan als laatste vangnet, maar krijgt via de loader vrijwel nooit meer null.
- Geen wijziging aan prijzen, offertes of facturen richting klant; alleen het btw-tarief-veld op onderdelen en de twee inkoopfactuur-registraties.
- Deploy van de gewijzigde edge function `get-commission-reconciliation` na de codewijziging.
