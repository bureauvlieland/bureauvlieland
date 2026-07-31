## Wat er misloopt

Twee velden zijn uit sync geraakt op onderdelen van BV-2602-0005:

```text
Fietshuur, Luncharrangement, Vrije tijd, 3-gangen diner,
Fietstocht met begeleiding (alle block_type = bureau):
  customer_approved_at = 2026-05-04 / 2026-06-16   ← akkoord staat er WEL
  customer_accepted_at = NULL                       ← ontbreekt
```

- Het **label** (`src/lib/itemStatus.ts`, `deriveItemDisplayStatus`) bepaalt akkoord uitsluitend op `customer_accepted_at`. Die is leeg → het onderdeel valt terug op `wacht_op_klant` → badge "Goedkeuring nodig" + groene goedkeurknop.
- De **actie** (`supabase/functions/approve-quote-item`) blokkeert op `customer_approved_at` → "Dit onderdeel is al geaccordeerd".

Zo ontstaat exact de klacht: knop zichtbaar, klikken lukt niet.

Omvang gemeten: **23 onderdelen over 4 projecten** hebben `customer_approved_at` gevuld en `customer_accepted_at` leeg (tussen 4 mei en 16 juni 2026 aangemaakt). Dat is een legacy-schrijfpad; de huidige `approve-quote-item` zet beide velden wél samen, maar de bulk-accept in `update-customer-program` (regel ~655) zet alléén `customer_accepted_at` — dus de drift kan nog in de andere richting ontstaan.

## Aanpak

**1. Weergave robuust maken (echte fix van het symptoom)**
In `src/lib/itemStatus.ts`: akkoord = `customer_accepted_at` **óf** `customer_approved_at`. Eén effectieve timestamp (`accepted ?? approved`) gebruiken voor de prijswijziging-vergelijking, zodat "Nieuwe prijs — akkoord nodig" blijft werken. Gevolg: deze onderdelen tonen "Door u goedgekeurd" met de bureau-uitleg, en de goedkeurknop verdwijnt.

**2. Knop/banner uit één bron**
In `src/components/customer-portal/CustomerProgramItem.tsx` en `useCustomerProgram.ts` de goedkeurknop en de teller "X onderdelen wachten op uw akkoord" laten volgen uit dezelfde afgeleide status, in plaats van uit een los veld. Dan kan de knop nooit meer verschijnen bij iets dat de backend weigert.

**3. Datafix (23 rijen)**
`customer_accepted_at = customer_approved_at` waar accepted leeg is en approved gevuld — en omgekeerd `customer_approved_at = customer_accepted_at` waar approved leeg is. Puur een sync van bestaande feiten, geen nieuwe goedkeuringen.

**4. Dichtspijkeren op databaseniveau**
Trigger `sync_customer_approval_timestamps` op `program_request_items` (BEFORE INSERT/UPDATE): als één van beide velden gezet wordt en de ander leeg is, wordt die gelijkgetrokken. Daarmee is de projectregel "beide velden altijd samen" niet langer afhankelijk van elke individuele edge function.

**5. Tests**
- `itemStatus.test.ts`: approved-zonder-accepted → `klant_akkoord_bureau` (bureau) / `geaccepteerd`; prijs-herakkoord blijft werken via de effectieve timestamp.
- Regressietest: geen enkel onderdeel kan tegelijk "goedkeurknop tonen" en door de backend geweigerd worden (`customer_approved_at` gevuld ⇒ nooit `wacht_op_klant`).

## Technische noot

Ik laat `customer_approved_at` de leidende bron in de backend-guard, zodat er geen dubbele goedkeurmails of dubbele partner-notificaties kunnen ontstaan; de frontend wordt alleen toleranter in het lezen.
