## Wat er aan de hand is

Beide schermen gebruiken dezelfde functie `deriveItemDisplayStatus`, maar met verschillende context.

- Op de projectkaart (Activiteiten-tab) wordt de projectfase (`quote_status = offerte_verstuurd`) meegegeven. Daardoor komt er correct **"Wacht op klant-goedkeuring"** uit.
- In de Werkbank (`ProjectDetailPanel`, tab Programma) en in de Weekplanning wordt die projectfase **niet** meegegeven. De afleiding valt dan terug op de itemstatus `pending` en toont **"Wacht op aanbieder"**.

Dus: het label in het projectdetail klopt, dat in de Werkbank/weekplanning niet.

## Wat ik ga doen

1. **Werkbank – ProjectDetailPanel**
   - `quote_status`, `number_of_people` en `selected_dates` van het project meeophalen (of doorgeven vanuit het al aanwezige project-object).
   - Die meegeven aan de statusafleiding, samen met `audience: "admin"`, zodat het label identiek is aan de projectkaart.

2. **Weekplanning (`WeekPlanningView`)**
   - `quote_status` toevoegen aan de `program_requests`-query.
   - Bij beide plekken waar een item-status wordt afgeleid de projectfase + aantal personen/dagen meegeven.

3. **Regressietest**
   - Test toevoegen in `src/lib/__tests__/itemStatus.test.ts`: een `pending` item in fase `offerte_verstuurd` zonder klant-akkoord levert voor audience `admin` altijd `wacht_op_klant` op — zodat een view die de fase vergeet, opvalt.

## Technisch detail

Geen wijziging aan `deriveItemDisplayStatus` zelf; alleen de aanroepende views leveren nu de volledige context. Dit is puur presentatie: er verandert niets aan onderliggende data, mails of workflow.

## Nog even checken

De partnerportaal-views (`PartnerProjectItemRow`, `PartnerItemSheet`) geven de projectfase ook niet mee. Daar zou het label voor de partner wijzigen van "Reactie gevraagd" naar "Voorstel verstuurd" bij nog niet goedgekeurde items. Dat is inhoudelijk juister, maar raakt wel wat partners zien — ik laat die standaard ongemoeid tenzij je zegt dat ik ze mag meenemen.
