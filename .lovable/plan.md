## Probleem

Op het admin-detailpaneel van een aanvraag in `in_afstemming` staat overal **"Wacht op aanbieder"** — ook bij regels waar de aanbieder al bevestigd of een tegenvoorstel heeft gedaan. Naast die badge verschijnt nog een tweede, tegenstrijdig pilletje **"Partner: pending"** of **"Partner: bevestigd"**, dat niet in de legenda staat. Strandyoga (waar de partner een afwijkende prijs heeft doorgegeven) krijgt daardoor ook "Wacht op aanbieder" terwijl de partner juist al gereageerd heeft mét een andere prijs.

## Oorzaak

1. In `src/lib/itemStatus.ts` is recent een regel toegevoegd die tijdens `quote_status = concept | in_afstemming` ALLE items naar `wacht_op_partner` forceert, zodat de klant geen "Akkoord nodig" ziet vóór de offerte verstuurd is. Die maskering is alleen bedoeld voor het klantportaal, maar wordt nu ook in de admin-view toegepast (`AdminRequestDetail.tsx` geeft `quoteStatus` mee). Daardoor verbergt admin de echte itemstatus.
2. In `AdminRequestDetail.tsx` (regels 2354–2395) staan, naast de nieuwe `ItemDisplayStatusBadge`, nog de oude pillen `Partner: pending` / `Partner: bevestigd`. Die zijn na de unificatie van statussen overbodig en spreken de hoofdbadge tegen.
3. De legenda "Wat betekenen de statussen?" verwijst niet naar deze oude pillen — en zou dat ook niet moeten, omdat ze weg gaan.
4. Een partner-prijswijziging (Strandyoga: €190 i.p.v. berekende €600) heeft nu geen eigen status. Dat is een aparte attentie die nu alleen als waarschuwingstekst onderin de prijs-kolom zichtbaar is.

## Oplossing

### 1. Pre-offerte-maskering alleen voor de klant
- `deriveItemDisplayStatus` (in `src/lib/itemStatus.ts`) krijgt een `audience: "admin" | "customer" | "partner"` in `DeriveContext` (default `"customer"` voor backwards-compat).
- De `concept`/`in_afstemming`-tak die alles naar `wacht_op_partner` zet, draait alleen voor `audience === "customer"`. Admin en partner zien de feitelijke itemstatus.
- Alle bestaande aanroepen vanuit `audience="admin"` views (admin-detail, werkbank, bureau-execution, planning, partner-overzichten) krijgen expliciet `audience` mee. Klant-portaal en stepper blijven zonder audience (= customer-default).

### 2. Dubbele "Partner:"-pillen verwijderen
- In `AdminRequestDetail.tsx` regels 2354–2395 verdwijnen de pillen `Partner: pending` en `Partner: bevestigd`.
- De **"Verstuurd"** / **"Nog naar partner"** chip blijft (geeft verzendfase aan, geen statusduplicaat).
- De **"Status overrulen"**-knop blijft zichtbaar zolang `item.status === "pending"` (los van het pilletje).

### 3. Eigen status voor partner-prijswijziging
- In `itemStatus.ts` komt er een check: als `item.status === "confirmed"` en de partner-prijs (`partner_quoted_price` / `quoted_price`) afwijkt van de berekende basisprijs, wordt status **`prijs_gewijzigd`** met label "Aanbieder stelde nieuwe prijs voor". Hiermee zien admin én klant in één oogopslag dat dit onderdeel een prijsattentie heeft.
- De bestaande `prijs_gewijzigd`-tak (na klant-akkoord) blijft bestaan; we onderscheiden in de tooltip "door Bureau Vlieland" vs "door aanbieder".

### 4. Legenda bijwerken
- "Wat betekenen de statussen?" toont nu alle daadwerkelijk gebruikte badges: Wacht op aanbieder, Wacht op klant-akkoord, Nieuwe prijs van aanbieder, Klant akkoord (3 varianten samengevat), Geannuleerd, Niet beschikbaar. De oude `Partner: …` regels worden verwijderd (bestonden niet in de legenda en gaan ook uit de tabel).

## Technische details

- Bestanden:
  - `src/lib/itemStatus.ts` — `audience` toevoegen, pre-offerte-tak conditioneel, prijs-mismatch detectie + nieuwe tooltip-variant.
  - `src/components/shared/ItemDisplayStatusBadge.tsx` — tooltip-tekst voor `prijs_gewijzigd` afhankelijk van bron (admin override vs partner).
  - `src/pages/admin/AdminRequestDetail.tsx` — pillen weghalen, `audience="admin"` doorgeven, legenda uitbreiden.
  - Overige `deriveItemDisplayStatus(…)`-aanroepers in admin/werkbank/planning views: `audience="admin"` doorgeven.
- Tests: `src/lib/__tests__/itemStatus.test.ts` uitbreiden met (a) admin ziet `wacht_op_klant` voor confirmed item in `in_afstemming`, (b) confirmed item met afwijkende partnerprijs ⇒ `prijs_gewijzigd`, (c) customer-view blijft `wacht_op_partner` tonen tijdens `in_afstemming`.
- Geen DB- of edge-functie wijzigingen.
