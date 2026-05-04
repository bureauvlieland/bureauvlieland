# Fix: p.p.p.d.-totaal mist "× dagen"

## Probleem

In de prijs-popover en het label van een onderdeel (`AdminQuotePriceEditor`) wordt het totaal voor `per_person_per_day` berekend als `prijs × personen × 1 dag` in plaats van `× aantal dagen`. Bij €12 p.p.p.d. × 150 personen × 2 dagen verschijnt nu €1.800 i.p.v. €3.600.

Oorzaak: `AdminRequestDetail.tsx` geeft wel `numberOfPeople` en `priceType` mee aan `AdminQuotePriceEditor`, maar geen `numberOfDays`. De prop heeft een default van `1`.

## Oplossing

In `src/pages/admin/AdminRequestDetail.tsx` bij de `<AdminQuotePriceEditor>`-render (rond regel 1836) ook `numberOfDays` doorgeven, afgeleid van het aantal `selected_dates` van de aanvraag — exact zoals `hasOpenAdminPriceChange` daar al doet:

```tsx
numberOfDays={Array.isArray(request?.selected_dates) ? request!.selected_dates.length : 1}
```

Daarmee:

- klopt het "Totaal: € 3.600,00 (150 personen × 2 dagen)"-regeltje in de popover;
- klopt het zichtbare label/`overrideTotal` (€3.600 p.p.p.d.) onder het onderdeel;  
  
Dat klopt dus niet, want 3600 is het totaalbedrag en niet het bedrag pppd.   

- klopt de doorgehaalde context-prijs (`calculateTotal`) in dezelfde popover.

Geen verdere wijzigingen nodig — de logica in `AdminQuotePriceEditor` rekent al correct met `numberOfDays` zodra de prop is doorgegeven.

## Buiten scope

- Geen wijziging aan database, edge functions of andere prijscomponenten.