# Admin item-status syncen met klant-portal bij prijswijziging

## Probleem
Bij **BV-2603-0003 → Italiaanse shared dining**:
- **Klant-portal**: "Akkoord nodig — nieuwe prijs (wacht op klant)"
- **Admin**: dropdown staat op *In afstemming* (= wacht op partner) en de status-badge toont *Wacht op partner*

Oorzaak: toen de admin de prijs aanpaste na klant-akkoord, werd `item_quote_status` op `"in_afstemming"` gezet (logica uit periode vóór de nieuwe `offerte_verstuurd` tussenstatus). Daardoor leest de admin-kolom "wacht op partner", terwijl de klant juist nog akkoord moet geven op de nieuwe prijs.

Daarnaast ontbreekt in de admin tabel-rij een zichtbaar signaal "open prijswijziging — wacht op klant".

## Wijzigingen

### 1. `src/pages/admin/AdminRequestDetail.tsx` — `handleItemPriceUpdate` (regel 945)
Bij betekenisvolle prijswijziging waarbij de klant opnieuw akkoord moet geven: zet `item_quote_status` op `"offerte_verstuurd"` in plaats van `"in_afstemming"`. De status `offerte_verstuurd` = "wacht op klant-akkoord" (nieuwe semantiek uit vorige iteratie).

### 2. Visuele indicator in quote-mode tabel (regel 1762-1781)
Naast `hasCustomerApproval` (groen vinkje) en `showWaitingForCustomer` (klok) ook een tooltip/icoon tonen wanneer `hasOpenAdminPriceChange(item, ...)` true is — bijv. een oranje `AlertCircle` met tooltip *"Wacht op klantakkoord nieuwe prijs"*. Dit geldt voor zowel de quote-mode kolom (regel 1762) als de classic-mode kolom (regel 1887).

### 3. Eenmalige data-correctie (BV-2603-0003)
Voor het concrete item `0466f3fa-4b33-4923-9dbd-b8703ae75006`:
- `item_quote_status` van `in_afstemming` → `offerte_verstuurd`
- `status` blijft `confirmed` (partnerprijs is bevestigd; wachten is op klant)

Optioneel breder herstel: alle items waar `customer_approved_at IS NULL` AND `item_quote_status = 'in_afstemming'` AND er een open admin price change is (`admin_price_override_updated_at > partner_price_change_acknowledged_at`) en `status = 'confirmed'` — zelfde update.

## Niet nodig
- Geen wijziging aan de klant-portal (toont al correct).
- Geen wijziging aan edge functions: `approve-quote-item` accepteert sinds vorige iteratie ook `offerte_verstuurd` als geldige uitgangswaarde.
