## Wat is er nu mis bij BV-2603-0003

Alle 10 activiteiten hebben in de database zowel `customer_accepted_at` als `customer_approved_at` gevuld — de klant heeft het hele programma akkoord. Het programma staat op `akkoord_ontvangen`. Toch:

**Activiteiten-tab (admin):**
- De kolom "Offerte status" toont per item de waarde van `item_quote_status` (`in_afstemming` / `offerte_verstuurd`). Dat label leeft in een eigen wereldje en zegt niets meer over wat de klant feitelijk heeft gedaan.
- Het groene vinkje "Klant akkoord" staat er wel naast, maar de hoofdchip overstemt dat. Resultaat: het lijkt alsof we nog op partner of klant wachten, terwijl dat voor 10 van de 10 items niet zo is.
- Er bestaan nu drie parallelle status-werelden in de UI: `status` (operationeel), `item_quote_status` (offerteworkflow), en kleine icon-tooltips ("Wacht op klant", "Wacht op klantakkoord nieuwe prijs"). Elk vertelt een ander stukje verhaal en ze contradicteren elkaar.

**Financiën-tab (Prijscontrole):**
- Items zoals "Strand BBQ" (quoted €1.300, override €30 × 29 personen = €870) en de twee Overtochten (quoted €503,58, override €570,60) blijven hier staan — terwijl de klant via de klantportal al akkoord heeft gegeven op de nieuwe prijs van de admin. Die akkoord-actie zou stilzwijgend `quoted_price` moeten ophogen naar het overgenomen overridebedrag, maar gebeurt niet. Daardoor moet de admin alsnog handmatig "Synchroniseer" klikken op iets wat allang afgehandeld is.
- Items waarvan `admin_price_override × people [× days] == quoted_price` worden correct genegeerd (Strandspektakel, Italiaanse shared dining, …).

## Doel

Eén taal door de hele applicatie, gebaseerd op wat de klant feitelijk heeft gedaan. `item_quote_status` is een interne workflow-stap die op de admin-tafel niet meer thuishoort als prominente kolom — de afgeleide status uit feiten is altijd betrouwbaarder. En zodra de klant een nieuwe admin-prijs accepteert, wordt dat ook in `quoted_price` vastgelegd zodat de Prijscontrole automatisch leegloopt.

## Plan

### 1. Eén item-status-helper als bron van waarheid

Nieuwe helper `deriveItemDisplayStatus(item, program)` in `src/lib/itemStatus.ts`. Output is één van vijf waarden, gedeeld door admin + klant + partner:

| key | label klant | label admin | wanneer |
|---|---|---|---|
| `wacht_op_partner` | Wacht op aanbieder | Wacht op aanbieder | `status=pending` |
| `wacht_op_klant` | Akkoord nodig | Wacht op klant | partner heeft gereageerd (`confirmed`/`alternative`) maar `customer_accepted_at` is leeg |
| `prijs_gewijzigd` | Nieuwe prijs — akkoord nodig | Wacht op klant (nieuwe prijs) | `customer_accepted_at` leeg + open admin-prijswijziging |
| `geaccepteerd` | Akkoord | Klant akkoord | `customer_accepted_at` gevuld én item niet uitgevoerd/geannuleerd |
| `uitgevoerd` / `geannuleerd` | idem | idem | terminale toestanden |

`item_quote_status` blijft in de database als interne workflow-vlag (gebruikt door `send-quote-offer`, `approve-quote-item`), maar wordt nooit meer als zichtbare label getoond. Constanten `itemQuoteStatusConfig` en `customerItemQuoteStatusLabels` verdwijnen uit de UI-laag; één gedeelde `displayItemStatusConfig` in plaats daarvan.

### 2. Activiteiten-tab opschonen

In `AdminRequestDetail.tsx`:
- Kolom "Offerte status" (de `AdminItemQuoteStatusSelect`-dropdown) wordt vervangen door één compacte chip op basis van `deriveItemDisplayStatus`. Dezelfde chip die de klant ziet.
- De losse `Klant akkoord` / `Wacht op klant` / `Wacht op klantakkoord nieuwe prijs` icoontjes verdwijnen — die info zit nu in de chip zelf.
- De handmatige `item_quote_status`-dropdown blijft beschikbaar, maar verhuist naar het `AdminEditActivitySheet` onder een uitklap "Geavanceerd / interne workflow", voor edge cases waar de admin alsnog wil ingrijpen.

### 3. Klant-akkoord op nieuwe prijs persisteren

De kern van het Prijscontrole-probleem: wanneer de klant een onderdeel accordeert via `approve-quote-item` of via het integrale "Akkoord met nieuwe prijs"-pad terwijl er een open admin-prijswijziging ligt, moeten we tegelijk:
- `quoted_price` overschrijven met `getDisplayLineTotal(item, effectivePeople, days)` — d.w.z. het effectieve totaal zoals de klant het op het scherm zag (`admin_price_override × multipliers`).
- `partner_price_change_acknowledged_at = now()` zetten zodat `hasOpenAdminPriceChange` netjes naar `false` valt (zowel voor `total`-prijzen als voor `per_person` / `per_person_per_day`-prijzen).

Aanpassen in:
- `supabase/functions/approve-quote-item/index.ts` — de update-payload uitbreiden voor items waar `hasOpenAdminPriceChange` true is op het moment van akkoord.
- `src/lib/customerQuoteApproval.ts` (en de bulk "akkoord op heel programma"-flow) — analoge logica voor het integrale akkoord.

Hierdoor verdwijnt het hele item uit de Prijscontrole zodra de klant akkoord heeft gegeven, ongeacht of de prijs `total` of `per_person`/`p.p.p.d.` was.

### 4. Prijscontrole resterend gedrag

Na stap 3 blijft de Prijscontrole alleen items tonen waar de admin een nieuwe override zette die de klant nog niet heeft gezien (`!customer_accepted_at since override`). Dat is precies wat de admin daar verwacht. De huidige "Synchroniseer"-knop blijft als noodvoorziening voor legacy-rijen.

### 5. Eenmalige opschoning BV-2603-0003

Voor de items die nu in `in_afstemming` staan terwijl `customer_accepted_at` allang gevuld is: `item_quote_status` zetten op `bevestigd`. Pure interne hygiëne; UI gebruikt na stap 1 toch de afgeleide status.

Voor de 4 items waar admin een latere override deed terwijl klant al akkoord was (Strand BBQ, beide Overtochten 30/29 personen, Italiaanse shared dining was al synced): we passen retroactief stap 3 toe — `quoted_price` bijwerken naar `getDisplayLineTotal(...)` en `partner_price_change_acknowledged_at = now()`. Daarmee verdwijnen ze direct uit de Prijscontrole, in lijn met de bedoeling.

### 6. Consistentiecheck overige views

Dezelfde `deriveItemDisplayStatus` aansluiten op:
- `CustomerProgramItem.tsx` — vervangt de huidige inline overrideLabel-logica.
- `AdminQuotePreview.tsx` en `FinancialOverviewCard.tsx` voor zover ze item-statussen tonen.
- Partner-portal items blijven hun eigen `status` houden (partner ziet geen klant-akkoord-info).

## Resultaat

- Eén kolom, één label per activiteit, identiek voor admin en klant.
- De admin-pagina van BV-2603-0003 toont 10× "Klant akkoord" in groen — gelijk aan wat de klant op de klantpagina ziet.
- De Prijscontrole-sectie is leeg: alle items waarvoor de klant al akkoord heeft gegeven (ook op p.p.-bedragen) zijn automatisch gesynced naar `quoted_price`.
- Toekomstige projecten erven dit gedrag automatisch: zodra een klant een nieuwe prijs accordeert, is dat het nieuwe `quoted_price` zonder dat de admin nog ergens hoeft te klikken.

## Buiten scope

- Wijzigingen aan de offerteworkflow zelf (concept → offerte_verstuurd → akkoord_ontvangen op programmaniveau) blijven ongemoeid.
- Logies-tab krijgt geen aanpassing in deze ronde.
