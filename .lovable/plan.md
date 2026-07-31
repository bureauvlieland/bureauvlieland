## Wat er nu misgaat

- **Commissie Beheer** heeft één statusdropdown (Verwacht / Te factureren / Gefactureerd / Betaald). Bij "Te factureren" krijg je de werklijst, bij "Verwacht" een compleet andere tabel uit een andere edge function — dus twee weergaven met dezelfde regels en verschillende bedragen.
- De werklijst neemt élk verkocht onderdeel mee (status `confirmed`, `accepted`, `executed`, `invoiced`, `completed`) zodra er commissie op zit. Projecten die nog moeten plaatsvinden staan dus tussen de te factureren regels — vandaar de 38 regels in jouw screenshot.
- Niet aanvinken haalt een regel niet uit beeld: de lijst filtert alleen op commissiestatus `invoiced`/`paid` en op `commission_exempt`. Er is geen archiveer-actie in de UI, dus regels blijven eeuwig staan.

## Wat ik ga bouwen

### 1. Eén lijst met filterchips (Commissie Beheer wordt de startpagina)

De statusdropdown verdwijnt. In plaats daarvan één werklijst met chips bovenaan:

`Te factureren` (default) · `Verwacht` · `Gefactureerd` · `Betaald` · `Commissievrij / gearchiveerd` · `Alles`

- Binnen "Te factureren" blijft de groepering per partner, met per groep het totaal en de Verkoop/Inkoop-grondslagknoppen zoals nu.
- De kop toont KPI's die bij de actieve chip horen (aantal regels, totaal commissie, zonder inkoopfactuur, verkoop ≠ inkoop).
- Het losse menu-item "Verwachte commissie" verdwijnt; die weergave wordt de chip "Verwacht". `/admin/commissies/verwacht` blijft werken en zet de chip meteen goed.
- Commissie Beheer wordt het eerste item in de financiële sectie van het admin-menu.

### 2. Verwacht vs. te factureren op projectstatus

Een regel is **te factureren** alleen als het werk daadwerkelijk gedaan is: onderdeel op `executed` / `invoiced` / `completed`, of het project is afgerond. Onderdelen die alleen `confirmed`/`accepted` zijn (project moet nog plaatsvinden) vallen onder **Verwacht**, ongeacht de datum. Logies-offertes volgen dezelfde regel via de projectstatus.

Losse inkoopfacturen zonder koppeling blijven altijd in "Te factureren" staan — daar is het werk al geleverd en gefactureerd.

Bij elke verwachte regel staat de uitvoerdatum met een subtiele "wordt factureerbaar na uitvoering"-hint, en per partnergroep zie ik zowel het verwachte als het factureerbare totaal.

### 3. Archiveren = definitief commissievrij

Per regel (en per selectie, in bulk) een actie **"Commissievrij markeren"**:

- Dialoog met verplichte reden (vrij tekstveld + suggesties: doorbelasting zonder commissie, interne post, dubbele factuur, afspraak met partner).
- Regel verdwijnt uit "Te factureren" en "Verwacht" en verschijnt onder de chip **Commissievrij / gearchiveerd**, met reden, wie het deed en wanneer.
- Daar staat ook **"Terugzetten"** om de regel weer factureerbaar te maken.
- Werkt voor alle drie de regeltypes: programma-onderdeel, logies-offerte en losse inkoopfactuur.
- Bijbehorende werkbank-taken (`commission_unlinked_invoice` / ontbrekende inkoopfactuur) sluiten automatisch en komen niet terug.

### 4. Voorkomen dat ze terugkomen

De taakgenerator en de opschoner gebruiken dezelfde loader, dus commissievrij gemarkeerde regels worden ook daar overgeslagen. Regels die nog "Verwacht" zijn genereren geen "inkoopfactuur ontbreekt"-taak meer — dat signaal hoort pas na uitvoering.

## Technisch

- **Migratie**: `commission_exempt_reason`, `commission_exempt_at`, `commission_exempt_by` toevoegen op `program_request_items` en `accommodation_quotes` (`partner_purchase_invoices` heeft `commission_exempt` + reden al). Plus een `commission_exempt` boolean op items/quotes. Admin-only policies; partner mag deze velden niet zetten (guard-trigger uitbreiden).
- **Gedeelde logica** in `supabase/functions/_shared/commissionReconciliation.ts`: nieuw veld `readiness: "expected" | "billable"` op `ReconRow`, plus `isBillableRow` (alleen billable) en `isExpectedRow`. Zo blijven werklijst, taakgenerator en opschoner één waarheid.
- **Loader** `_shared/commissionReconciliationData.ts`: itemstatus en projectafronding meenemen, en de exempt-velden van items/quotes meelezen.
- **Frontend**: `CommissionWorklist.tsx` krijgt de chips, de readiness-splitsing en de archiveer-acties; `AdminCommissions.tsx` wordt teruggebracht tot kop + KPI's + werklijst (de aparte "expected"-tabel en `get-admin-commissions`-fetch vervallen daar).
- **Nieuwe edge function** `set-commission-exempt` (admin-only) voor markeren/terugzetten inclusief `admin_activity_log`-registratie en het sluiten van de bijbehorende taken.
- **Tests** uitbreiden in `commissionReconciliation.test.ts`: readiness-classificatie (confirmed = verwacht, executed = factureerbaar, losse factuur = factureerbaar), en dat commissievrij gemarkeerde regels uit beide buckets én uit de taakgenerator verdwijnen.

Netto effect voor jou: één lijst, standaard alleen wat écht gefactureerd kan worden, en alles wat je niet wil meenemen kun je met reden wegzetten zonder dat het terugkomt.
