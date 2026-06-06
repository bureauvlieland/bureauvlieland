## Probleem

Bij verwerken van een verzamelfactuur over meerdere projecten in `AddPurchaseInvoiceDialog`:

1. **Verdeling klopt-niet bij splits.** Validatie vergelijkt `validAllocations` (toewijzingen primair project) met `headerIncl − extrasInclSum` op €0.01 nauwkeurig. Omdat `extrasInclSum` per regel ongerond wordt opgeteld (`aExcl + aExcl*rate/100`) en `validAllocations` apart wordt afgerond, lopen centen-verschillen op (€0.24 in de screenshot). Resultaat: opslaan blijft onmogelijk zonder handmatig sleutelen.

2. **"Overschrijven als factuurregels"-optie ontbreekt bij splits.** De checkbox `Direct overnemen als factuurregels` toont alleen wanneer er precies één allocatie is óf geen allocatie + één `itemId`. Bij split-scenario's met meerdere allocaties op het primaire project (en/of extra projecten) is hij nooit zichtbaar.

## Plan

### 1. Verdeling-validatie robuust maken (AddPurchaseInvoiceDialog.tsx, regels 602-648)

- **Rond extra-project totalen** op 2 decimalen (gebruik `calculateVatAmounts` uit `src/lib/vatCalculation.ts`) bij het opbouwen van `validExtras` en hun allocaties — zelfde regel als primaire kant.
- **Verruim tolerantie** in `Math.abs(... ) > 0.01` naar `0.01 * max(1, aantalRegels)` zodat opgetelde 1-cent afrondingen niet blokkeren; cap op €0.05.
- **Auto-rebalance** het kleine restverschil naar de laatste allocatie i.p.v. te weigeren (zoals al gebruikelijk in factuur-tools). Toon enkel een toast-waarschuwing als het verschil > tolerantie blijft.
- Pas dezelfde aanpak toe op de extra-project interne allocatie-check (regel 638-648).
- Foutmelding verfijnen zodat hij benoemt om welk project en bedrag het gaat én hoeveel er afwijkt.

### 2. Overschrijven-optie tonen bij splits

Voorwaarde voor `copyToBillingLines`-checkbox uitbreiden:
- Tonen zodra elk item dat een allocatie krijgt (zowel primair als per extra project) uniek is — d.w.z. zodra duidelijk is naar welk `item_id` de regels overgenomen kunnen worden.
- Bij splits: per project één klikkbare regel "Vervang factuurregels op programma-onderdeel X" (alleen voor projecten met precies één item-allocatie). Voor projecten met meerdere allocaties: optie verbergen + tooltip "Niet beschikbaar — meerdere onderdelen geraakt".
- Submit-flow uitbreiden zodat na elke `createInvoice.mutateAsync` (primair én extra) dezelfde `program_item_billing_lines` wipe-en-insert wordt uitgevoerd voor de gekozen items, met de bijbehorende lines.

### 3. Visuele verduidelijking

- Bovenaan splits-blok een live status: per project subtotaal incl. BTW + ✓/✗ icoon en kleur. Maakt direct zichtbaar waar de €0.24 zit voordat de gebruiker op opslaan klikt.

## Technische details

- Bestand: `src/components/admin/AddPurchaseInvoiceDialog.tsx`
- Helper: `calculateVatAmounts` uit `src/lib/vatCalculation.ts` overal toepassen bij split-berekeningen om dezelfde 2-decimalen rounding te garanderen.
- Geen DB-wijzigingen.
- Geen wijziging in `CollectiveInvoiceSheet` (apart pad voor Doeksen/Isla bagage).

## Buiten scope

- Wijzigingen aan inbox-matching/MatchedRegistrationBanner.
- Verzamelfactuur-sheet (`CollectiveInvoiceSheet`) — dat pad heeft eigen splitlogica per regel en kent dit probleem niet.
