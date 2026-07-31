## Wat er nu misgaat (geverifieerd in de database)

Zeezicht Vlieland heeft 3 inkoopfacturen. Twee daarvan zijn **logies**-facturen, en logies wordt niet overal op dezelfde manier meegerekend:

| Factuur | Werkelijkheid | Werklijst (Commissie Beheer) | Werkbank-taak |
|---|---|---|---|
| 202602844 (BV-2604-0004) | gekoppeld aan programma-onderdeel | correct | geen |
| 202502225 (€ 5.464,70) | hoort bij logies LOG-2603-0002 (Salure) — daar staat het factuurnummer ook op | correct gematcht | **onterechte taak "niet gekoppeld"** |
| 202502217 (€ 2.680,19) | hoort bij logies LOG-2602-0002 (Artcadia) — maar dat factuurnummer staat daar níet op | **dubbel geteld**: logies-regel "Ontbrekend" (€ 267,29) én losse factuurregel (€ 268,02) | geen |

Oorzaken:
1. De taakgenerator (`flag-missing-partner-invoices`) en de taakopschoner (`reconcile-admin-todos`) kijken **alleen naar programma-onderdelen**, terwijl de werklijst (`get-commission-reconciliation`) óók logies-offertes meeneemt. Zelfde rekenmodule, andere invoer → andere uitkomst. Een logies-factuur is daar per definitie "niet gekoppeld", en de taak kan ook nooit vanzelf sluiten.
2. Bij het registreren van een inkoopfactuur op een logies wordt het factuurnummer niet altijd op de logies-offerte vastgelegd; alleen dat nummer maakt de match. Bij 202502217 ontbreekt dat, waardoor dezelfde euro's twee keer in de werklijst staan.

## Aanpak: één gedeelde invoer voor alle drie de plekken

**1. Gedeelde dataloader**
Een nieuwe gedeelde module haalt precies één keer op wat de reconciliatie nodig heeft: programma-onderdelen, logies-offertes, inkoopfacturen, allocaties, projecten en partners. Werklijst, taakgenerator en taakopschoner gaan alle drie via die loader. Daarmee is de werklijst per definitie leidend en kunnen taken niet meer afwijken.

**2. Taken kloppen weer**
- "Inkoopfactuur niet gekoppeld" ontstaat alleen nog als de factuur ook echt aan geen enkel programma-onderdeel én geen enkele logies-offerte hangt.
- De opschoner sluit zo'n taak zodra de koppeling er is (via onderdeel, allocatie, of factuurnummer op de logies-offerte) of de factuur commissievrij is.
- De bestaande onterechte taak voor 202502225 wordt bij de eerstvolgende opschoonronde automatisch gesloten; ik sluit hem ook direct.

**3. Koppelen wordt echt vastgelegd (geen dubbeltellingen meer)**
- Bij het registreren/koppelen van een inkoopfactuur op een logies wordt het factuurnummer en -bedrag voortaan op de logies-offerte gezet, zodat verkoop en inkoop op één regel samenkomen.
- Op een "losse inkoopfactuur"-regel in de werklijst komt een actie **"Koppel aan logies/onderdeel"**, met suggesties van openstaande regels van dezelfde partner (zelfde project of vergelijkbaar bedrag).
- De werklijst waarschuwt zichtbaar wanneer een losse factuur waarschijnlijk hoort bij een regel die als "Ontbrekend" staat, zodat het niet stilzwijgend dubbel geteld wordt.

**4. Data rechtzetten**
Factuur 202502217 wordt gekoppeld aan LOG-2602-0002 (Artcadia / Katalys). Daarna toont de werklijst voor Zeezicht 3 regels in plaats van 4, zonder "Ontbrekend" en zonder losse factuur. Ik controleer dezelfde situatie bij alle andere partners en rapporteer wat ik aantref voordat ik daar iets aanpas.

**5. Overzicht Inkoopfacturen consistent**
Bij een logies-factuur toont de kolom Project voortaan de logies-referentie (LOG-…) naast/in plaats van de programma-referentie, zodat het overzicht en de werklijst dezelfde herkomst laten zien.

**6. Tests die de waarheid bewaken**
- Contract-test: taakgenerator en werklijst produceren voor dezelfde invoer identieke statussen (inclusief logies).
- Test: sluitcriteria van de opschoner spiegelen exact de aanmaakcriteria.
- Test: een factuur die aan een logies-offerte hangt levert nooit tegelijk een "Ontbrekend"- én een "losse factuur"-regel op.

## Technische details

- Nieuw: `supabase/functions/_shared/commissionReconciliationData.ts` met `loadReconciliationInputs(supabase, { partnerId? })`.
- Aangepast: `get-commission-reconciliation`, `flag-missing-partner-invoices`, `reconcile-admin-todos` gebruiken die loader; `invoiceIsLinked` krijgt de logies-factuurnummers mee via dezelfde `linkedInvoiceNumbers`-index.
- `accommodation_quotes.invoiced_number` / `invoiced_amount` worden gevuld bij registratie en bij de nieuwe koppelactie (edge function + UI-dialoog in `CommissionWorklist.tsx`).
- Datacorrectie via losse data-update, geen schemawijziging nodig.
