## Plan

Ik pak dit in twee lagen aan: eerst de oorzaak structureel oplossen, daarna factuur 6 herstellen.

### 1. Oorzaak vastleggen
De huidige fout komt door drie dingen die samen misgaan:

- De verwerking gebeurt nu in losse stappen vanuit de UI: eerst een inkoopfactuur opslaan, daarna extra projecten, daarna verkoopfactuurregels, daarna inbox op verwerkt zetten. Als stap 2/3/4 faalt, blijft er halve data achter.
- Een gesplitste factuur wordt nu deels als meerdere inkoopfacturen behandeld, terwijl het boekhoudkundig één leveranciersfactuur is.
- Kosten die alleen als inkoop-allocatie zijn opgeslagen verschijnen niet automatisch op verkoopfacturen; daarvoor moeten `program_item_billing_lines` worden aangemaakt en moet het programma-onderdeel op werkelijke kosten worden gezet.

### 2. Nieuwe verwerking: één factuurheader, meerdere projectkoppelingen
Ik verander de verwerking zodat één leveranciersfactuur ook echt één inkoopfactuur blijft.

- Eén rij in `partner_purchase_invoices` voor het volledige factuurtotaal.
- Project-/onderdeelverdeling via `partner_purchase_invoice_allocations`.
- Gekoppelde projecten worden afgeleid uit de allocaties.
- Doorsturen naar Snelstart gebruikt de volledige factuur-PDF en het volledige factuurbedrag.
- In de Snelstart-mail komt een korte markering met de gekoppelde projectreferenties en bedragen.

### 3. Atomisch opslaan: geen halve verwerking meer
Ik verplaats de definitieve registratie naar één databasefunctie die alles in één transactie doet:

- inkoopfactuur aanmaken of bijwerken;
- allocaties opslaan;
- optioneel verkoopfactuurregels per gekoppeld programma-onderdeel vervangen;
- `use_actual_costs` inschakelen voor onderdelen waar de factuurregels leidend zijn;
- inbox-item op verwerkt zetten;
- bij fout: alles terugdraaien, zodat er geen halve factuur meer in de inbox/inkooplijst achterblijft.

### 4. UI aanpassen voor gesplitste facturen
In de invoer/verwerkingsdialoog pas ik de tekst en logica aan:

- “Extra projecten” wordt “Gekoppelde projecten / projectverdeling”.
- Er worden geen losse extra inkoopfacturen meer aangemaakt voor dezelfde PDF.
- Bij meerdere projecten toont de inkoopfactuurlijst “Meerdere projecten” met de betrokken referenties.
- Bij het kopiëren naar verkoopfactuurregels worden alle geselecteerde projectonderdelen verwerkt, niet alleen één hoofdproject.

### 5. Doorsturen naar Snelstart geschikt maken voor meerdere projecten
Ik pas de boekhouding-forwarding aan zodat die ook werkt als de factuur geen enkelvoudig `request_id` heeft.

- Geen harde afhankelijkheid meer van één project.
- Projectinformatie wordt uit allocaties opgehaald.
- De e-mail noemt bijvoorbeeld: `BV-2603-0003 Salure`, `BV-2602-0002 Artcadia / Katalys`.

### 6. Factuur 6 herstellen
Na de structurele fix corrigeer ik de bestaande data van factuur 6:

- De bestaande inkoopfactuur wordt opgehoogd naar het volledige factuurtotaal uit de scan: €2.543,65 incl. BTW.
- De bestaande Salure-verdeling blijft gekoppeld aan BV-2603-0003.
- Ik voeg de ontbrekende Artcadia/Katalys-verdeling toe aan BV-2602-0002.
- Voor beide projectonderdelen maak ik verkoopfactuurregels aan op basis van de toegewezen kosten.
- Beide onderdelen krijgen `werkelijke kosten leidend`.
- Het inbox-item wordt gekoppeld aan de inkoopfactuur en op verwerkt gezet.

### 7. Controle
Ik controleer daarna concreet:

- factuur 6 staat niet meer als nieuw in de inbox;
- factuur 6 staat één keer als volledige inkoopfactuur in de lijst;
- Salure én Artcadia/Katalys staan als gekoppelde projecten bij die factuur;
- de verkoopfactuurvoorbereiding van beide projecten neemt de juiste regels mee;
- Snelstart-forwarding blijft de volledige PDF/factuur doorsturen.