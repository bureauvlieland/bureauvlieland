## Probleem

Wanneer een onderdeel al door de partner is bevestigd (`status = "confirmed"`, `quoted_price` gevuld) en Bureau Vlieland past daarna de prijs aan via `admin_price_override`, ziet de partner wél de amber-banner *"Bureau Vlieland heeft de prijs aangepast. Bevestig de nieuwe prijs of pas hem aan via je reactie"*, maar er is **geen reactieknop**: `canRespond` staat alleen open voor `pending`, `alternative` en `counter_proposed`. De enige beschikbare knop is "Markeer als uitgevoerd". De partner kan dus niets doen.

Daarnaast wordt `partner_price_change_acknowledged_at` nu alleen automatisch gezet door de edge function `update-partner-item-status` zodra de partner een nieuwe `quoted_price` indient — dat kan niet vanuit een al bevestigd item.

## Oplossing

Een dedicated mini-flow "Reageren op prijswijziging" voor confirmed items met een open admin-prijswijziging. Twee acties:

1. **Akkoord met nieuwe prijs** → `quoted_price` wordt overschreven met het admin-totaal (override × effectivePeople voor per-person, of override zelf voor fixed) en `partner_price_change_acknowledged_at = now()`. Status blijft `confirmed`. Een notitie kan optioneel worden meegegeven.
2. **Tegenvoorstel doen** → opent dezelfde response-form als nu bij counter_proposed: partner geeft eigen `quoted_price` + toelichting op. Status blijft `confirmed`, alleen prijs en `partner_price_change_acknowledged_at` worden bijgewerkt. Optioneel: het item kan terug naar `in_afstemming` gaan zodat klant en bureau het zien.

## Wijzigingen

### 1. `src/components/partner-portal/PartnerItemSheet.tsx`
- Nieuwe afgeleide variabele `hasOpenAdminPriceChange` (al berekend op regel 441-444 — extraheren naar één const bovenin).
- Nieuwe variabele `canAcknowledgePriceChange = hasOpenAdminPriceChange && item.status === "confirmed" && !item.executed_at`.
- Nieuwe sectie onder de amber-banner met twee knoppen:
  - `Bevestig nieuwe prijs (€XXX,XX)` — primaire knop.
  - `Eigen prijs voorstellen` — secundaire knop, opent een mini-form (alleen prijsveld + toelichting), submit hergebruikt onderstaande edge function.
- `handleMarkExecuted` blokkeren zolang `canAcknowledgePriceChange` true is, zodat een partner niet per ongeluk uitvoert vóór akkoord op de nieuwe prijs.

### 2. `supabase/functions/update-partner-item-status/index.ts`
- Nieuwe action `acknowledge_price_change` toevoegen die:
  - `quoted_price` zet op het meegestuurde nieuwe totaal (of `admin_price_override × effectivePeople` als de partner gewoon "akkoord" klikt).
  - `partner_price_change_acknowledged_at = now()`.
  - `quoted_at = now()` ververst (zodat de admin-page ziet dat de partner heeft gereageerd).
  - Optionele `quoted_notes` opslaat.
  - Status onveranderd laat (`confirmed`).
  - Logt in `email_log` / `program_communications` zodat het zichtbaar is in het project-dossier.
- Bestaande logica voor `partner_price_change_acknowledged_at` (regels 294 / 308) blijft werken voor de pending-flow.

### 3. Notificatie naar Bureau Vlieland
- Nieuwe edge function `notify-bureau-price-acknowledged` (klein) die een interne mail stuurt naar `hallo@bureauvlieland.nl` met onderwerp *"Partner heeft prijswijziging beantwoord — {block_name} ({reference})"* en de inhoud (akkoord vs tegenvoorstel + bedrag + notitie). Triggered vanuit de UI na succesvolle acknowledge-call.

### 4. Klantportaal-doorwerking
- Geen extra werk nodig: `quoted_price` wordt opnieuw geschreven, dus `getDisplayLineTotal` toont automatisch de juiste waarde, en `hasOpenAdminPriceChange` op klantzijde wordt false zodra `quoted_at` weer voorbij `admin_price_override_updated_at` ligt — exact dezelfde tijdstempel-vergelijking.

### 5. QA
- Bestaande Vitest-suite uitbreiden met een case "partner accepteert nieuwe admin-prijs → quoted_price = admin_total, ack >= override_updated_at, hasOpenAdminPriceChange = false".

## Impact

- Partner kan eindelijk reageren op prijswijzigingen zonder dat een admin het item terug op pending hoeft te zetten.
- Klant ziet automatisch de bijgewerkte prijs in het portaal zodra de partner akkoord geeft.
- Geen schemawijzigingen nodig — alle benodigde velden bestaan al.