## Plan

1. **Workflow-regel centraal vastzetten**
   - Pas `deriveItemDisplayStatus` aan zodat de projectfase meeweegt.
   - In fase `offerte_verstuurd` geldt: onderdelen die nog geen `customer_approved_at` hebben tonen **Wacht op klant-akkoord / Akkoord nodig**, ook als hun technische itemstatus nog `pending` is.
   - Pas ná klantgoedkeuring mogen onderdelen naar **wacht op aanbieder** of **klaar om naar partner**.

2. **Customer portal corrigeren**
   - Geef `quote_status` door aan de centrale status-afleiding in `CustomerProgramItem`.
   - Het label in de screenshot wordt dan **Akkoord nodig** in plaats van **Wacht op aanbieder** zolang de klant nog moet goedkeuren.
   - De tooltip wordt expliciet: eerst klantgoedkeuring, daarna vraagt Bureau Vlieland beschikbaarheid bij de aanbieder.

3. **Admin/weergaves gelijk trekken**
   - Laat adminstatussen dezelfde context gebruiken, zodat admin, klant en partner dezelfde workflow volgen.
   - Houd het aparte verzendlabel zoals **Nog naar partner** alleen als operationele verzendactie, niet als vervanging van de primaire status.

4. **Regressietests uitbreiden**
   - Voeg tests toe voor precies dit scenario:
     - `quote_status='offerte_verstuurd'`, item `status='pending'`, geen `customer_approved_at` → `wacht_op_klant`.
     - dezelfde situatie mét `customer_approved_at` → `klant_akkoord_wacht_partner` of bureau-variant.
     - projectfase `akkoord_ontvangen` blijft de bestaande logica volgen.
   - Zo breekt dit niet opnieuw bij toekomstige uitbreidingen.

## Technisch

- Wijzigingen in hoofdzaak in `src/lib/itemStatus.ts`, `CustomerProgramItem.tsx`, `AdminRequestDetail.tsx` en `itemStatus.test.ts`.
- Geen databasewijziging nodig; dit is status-afleiding/UI-logica op bestaande velden.