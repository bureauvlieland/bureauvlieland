

## Plan: 10% markup verwijderen uit MAP-prijzen

Twee bestanden aanpassen zodat klanten de originele MAP-prijs zien.

### Wijzigingen

**1. `src/components/map/MapActivityCard.tsx`**
- Verwijder `commissionMarkup` prop
- `displayPrice = activity.PricePerPerson` (was `× 1.10`)
- `childDisplayPrice = activity.PricePerChild` (was `× 1.10`)

**2. `src/components/map/MapBookingDialog.tsx`**
- Verwijder `commissionMarkup` prop
- `unitPrice = activity.PricePerPerson` direct
- `childUnitPrice = activity.PricePerChild` direct
- Totaalberekening zonder markup

Geen database- of edge function-wijzigingen nodig. De interne `commission_amount` in `map_bookings` blijft ongewijzigd.

