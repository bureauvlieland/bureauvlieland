## Probleem
In `src/components/admin/PurchaseInvoicesCard.tsx` worden bedragen geformatteerd met alleen `minimumFractionDigits: 2`. `Intl.NumberFormat` valt dan terug op `maximumFractionDigits: 3`, waardoor bedragen met meer dan 2 decimalen (zoals werkelijke totalen na BTW-optelling) als 3 decimalen verschijnen — bijv. `€2.041,009`, `€268,805`, `€780,004`.

De bedragen zijn al **incl. BTW** (`amount_incl_vat`) — dat klopt en blijft zo (conform de core-rule "alle weergave incl. BTW").

## Wijziging
Beide `toLocaleString`-aanroepen aanvullen met `maximumFractionDigits: 2`:

- Regel 94 (totaal): `stats.totalAmount.toLocaleString("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })`
- Regel 132 (per factuur): idem.

## Optioneel
Snelle grep door `src/` op `minimumFractionDigits: 2` zonder `maximumFractionDigits` om dezelfde bug elders te corrigeren (bijv. financiële overzichten). Doe ik mee als je dat wilt.

## Scope
Alleen presentatie. Geen DB-, hook-, of business-logica.
