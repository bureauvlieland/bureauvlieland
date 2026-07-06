
## Doel

Wanneer de admin de definitieve prijs van een onderdeel wijzigt **nadat de klant het programma al heeft goedgekeurd**, moet de klant alleen opnieuw akkoord geven bij een **substantiële prijsstijging**. Kleine correcties en elke prijsdaling verlopen stil en blokkeren de facturatie-flow niet.

## Regel

- Prijsdaling → geen klantactie, alleen "Prijs bijgewerkt" logregel in de tijdlijn.
- Prijsstijging **< drempel** (default **5%**) én absolute stijging **< € 25** → geen klantactie, "Prijs bijgewerkt" logregel.
- Prijsstijging boven **een van beide** drempels → klant moet opnieuw akkoord geven (status blijft `prijs_gewijzigd`).

Drempels worden instelbaar via `app_settings` zodat ze zonder code-wijziging aan te passen zijn.

## Wijzigingen

### 1. Instellingen (nieuw, met defaults 5% en €25)
- `app_settings`: twee nieuwe keys `price_change_reapproval_pct` (number, default 5) en `price_change_reapproval_abs_eur` (number, default 25), categorie *pricing*.
- `src/types/appSettings.ts` en `src/lib/appSettings.ts`: types + fallback + helpers `getPriceReapprovalThresholds(settings)`.
- Admin-instellingenpagina toont beide velden onder Prijzen (kort uitleg-tooltip).

### 2. Kern-logica in `src/lib/portalPricing.ts`
Nieuwe helper `priceChangeRequiresReapproval(item, programPeople, numberOfDays, thresholds)`:
- Retourneert `false` als `admin_price_override` gelijk of lager is dan `quoted_price` (effectief totaal).
- Retourneert `false` als de stijging zowel onder pct- als abs-drempel valt.
- Anders `true`.

`hasOpenAdminPriceChange()` blijft ongewijzigd (breed gebruikt voor "prijs gewijzigd sinds partner-ack"), maar wordt niet meer 1-op-1 gekoppeld aan klantactie.

### 3. Statusafleiding `src/lib/itemStatus.ts`
- `DeriveContext` krijgt optionele `priceReapprovalThresholds`.
- In het `hasAcceptance`-blok: alleen `"prijs_gewijzigd"` teruggeven wanneer `priceChangeRequiresReapproval(...)` true is. Anders val terug op de bestaande "geaccepteerd / klant_akkoord_wacht_partner / klant_akkoord_bureau".
- Tests in `src/lib/__tests__/itemStatus.test.ts` uitbreiden: kleine stijging → `geaccepteerd`, grote stijging → `prijs_gewijzigd`, prijsdaling → `geaccepteerd`.

### 4. Klantportaal `src/components/customer-portal/CustomerProgramItem.tsx`
- Gebruik dezelfde threshold-check voor `priceChangeNeedsAttention` en voor het tonen van de badge/knop "Nieuwe prijs goedkeuren".
- Onder drempel: geen amber banner, geen extra knop; wel een kleine subtiele micro-pill "Prijs bijgewerkt" (grijs, informatief) op dezelfde regel als het bedrag.
- App-settings via bestaande `useAppSettings` hook doorgeven vanuit `CustomerProgram.tsx` → `DesktopProgramView` / mobile view → item.

### 5. Bulk-actie "Alle X onderdelen goedkeuren"
- `DesktopProgramView.tsx` (regel 440) en mobile equivalent: `customerActionsCount` telt alleen items met echte klantactie (dus mét threshold-check). Zo verdwijnt de misleidende grote groene knop wanneer alle openstaande wijzigingen onder de drempel vallen.

### 6. Historie/logging
- Bij het opslaan van `admin_price_override` in `AdminRequestDetail.tsx`: voeg een `program_request_history`-entry toe met action `admin_price_updated` (bedrag oud → nieuw, %-verschil). Zo blijft de wijziging traceerbaar, ook zonder klantactie.

### 7. Buiten scope
- Bureau-onderdelen: dezelfde regel geldt (dat lost tegelijk het screenshot-geval "Overtocht" op).
- Wijziging van andere velden (tijd, personen, dag) blijft ongewijzigd — die behouden altijd hun bestaande approval-flow.
- Geen wijziging aan `partner_price_change_acknowledged_at`-mechaniek richting partners.

## Technische notitie

Effectief totaal wordt op dezelfde manier berekend als in `hasOpenAdminPriceChange` (per_person / per_person_per_day multipliers). Vergelijking gebeurt op `Math.max(adminTotal - quotedPrice, 0)` — dalingen tellen dus nooit mee als "stijging".

## Verificatie

- Unit tests uitbreiden voor `itemStatus` en `portalPricing`.
- Handmatige check in preview: bestaand project waar klant akkoord is → admin verhoogt met 2% → klant ziet "Prijs bijgewerkt" (grijs) en géén akkoordknop; verhoogt met 20% → klant ziet amber banner + knop.
