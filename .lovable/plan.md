# Tussenstatus toevoegen op programma-onderdelen

## Probleem
In de admin programma-detail (kolom **Offerte-status** per onderdeel) gaat een item nu rechtstreeks van **Concept** → **In afstemming**. Maar "In afstemming" suggereert dat de partner al benaderd is, terwijl in werkelijkheid de offerte alleen naar de klant is verstuurd en we wachten op klant-akkoord. Pas ná klant-akkoord wordt de partner benaderd.

We hebben dus een tussenstatus nodig: **Offerte verstuurd** (= wacht op klant-akkoord).

## Oplossing
Een vierde waarde toevoegen aan `ItemQuoteStatus`: `"offerte_verstuurd"`, gepositioneerd tussen `concept` en `in_afstemming`.

### Status-flow (na deze wijziging)

```text
concept            → admin werkt aan voorstel
offerte_verstuurd  → offerte naar klant, wacht op klant-akkoord     ← NIEUW
in_afstemming      → klant akkoord, aanvraag bij partner loopt
bevestigd          → partner heeft bevestigd
```

## Wijzigingen

### 1. Type & labels — `src/types/programRequest.ts`
- `ItemQuoteStatus` uitbreiden met `"offerte_verstuurd"`.
- `itemQuoteStatusConfig.offerte_verstuurd`: label "Offerte verstuurd", blauw (zelfde tint als project-level `offerte_verstuurd`), icon `Send`.
- `customerItemQuoteStatusLabels.offerte_verstuurd`: "Onder voorbehoud" (klant ziet geen interne term).

### 2. Edge function `send-quote-offer` (regel 283-288)
Bij versturen van de offerte: items met status `concept` of `in_afstemming` zetten op **`offerte_verstuurd`** (i.p.v. direct op `in_afstemming` zoals nu).

### 3. Edge function `accept-quote-proposal` (regel 365-370)
Bij klant-akkoord op het hele voorstel: items met status `concept`, `offerte_verstuurd` of `in_afstemming` zetten op `in_afstemming`. Dit is het moment waarop we daadwerkelijk naar partners gaan.

### 4. Edge function `approve-quote-item` (regel 175, 233, 367)
De checks `["in_afstemming", "bevestigd"].includes(...)` uitbreiden met `"offerte_verstuurd"`, zodat per-item klant-akkoord ook werkt vóórdat de partner-aanvraag uitstaat.

### 5. Lifecycle — `src/lib/lifecycle.ts` (regel 301)
`offerte_verstuurd` net als `concept`/`in_afstemming` behandelen (nog niet bevestigd door partner).

### 6. Admin UI — `AdminItemQuoteStatusSelect`
De nieuwe optie tonen in de dropdown tussen Concept en In afstemming. Bestaande items met item_quote_status `null` of legacy waarden blijven werken.

### 7. Klant-portal
Geen wijziging in gedrag — `customerItemQuoteStatusLabels` mapt naar "Onder voorbehoud", consistent met de eerder doorgevoerde "less is more"-aanpak (geen badge bij `pending` items).

## Niet nodig
- Geen DB-migratie: kolom is `text`, geen enum.
- Geen wijziging op project-level `quote_status` (`offerte_verstuurd` bestaat daar al).
- Geen backfill: bestaande items met `in_afstemming` blijven correct (project staat dan al op `akkoord_ontvangen`).
