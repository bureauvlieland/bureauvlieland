## Doel
Facturen uit SnelStart exact kunnen registreren, ook wanneer een eindfactuur meerdere BTW-tarieven en per saldo negatieve BTW bevat, terwijl het project handmatig administratief kan worden afgerond als de interne projectsom afwijkt van de werkelijk gefactureerde som.

## Vastgestelde situatie
- Project **BV-2602-0003 (Lexence)** heeft in de database twee registraties, maar de eerste staat als `final`. De huidige berekening negeert daardoor de tweede factuur bij “Gefactureerd”.
- De geüploade aanbetalingsfactuur is **218168**: € 41.322,31 excl. + € 8.677,69 BTW = **€ 50.000,00 incl.** In de database staat deze abusievelijk als **218161**.
- Eindfactuur **218169** is € 16.022,81 excl. + **€ -76,10 BTW** = **€ 15.946,71 incl.** De BTW bestaat uit 0%, 9% en 21%; door verrekening van de volledig tegen 21% geboekte aanbetaling is het netto BTW-bedrag negatief.
- Het werkelijke totaal van beide facturen is **€ 65.946,71**. De interne projectcalculatie is € 79.400,60, waardoor na herstel nog € 13.453,89 administratief open blijft. Dat verschil moet niet met een fictieve factuur worden weggewerkt.

## Implementatie
1. **Factuurtelling herstellen**
   - Alle deel- en eindfacturen optellen als werkelijk gefactureerde bedragen; creditnota’s blijven aftrekposten.
   - Dezelfde regel toepassen in het facturatieoverzicht, projectdetail, preview en de database-trigger voor de voltooiingsstatus.
   - De conflicterende regel verwijderen waarbij een `final`-registratie eerdere deelfacturen vervangt.

2. **BTW-registratie geschikt maken voor SnelStart-facturen**
   - In het registratievenster een bewerkbare BTW-uitsplitsing per tarief toevoegen (0%, 9%, 21% en eventueel een ander tarief).
   - Negatieve grondslag en negatief BTW-bedrag per tarief toestaan, zolang het totale factuurbedrag positief en rekenkundig consistent is.
   - De uitsplitsing bij de factuur opslaan en later zichtbaar maken, zodat de registratie controleerbaar blijft.
   - Totalen excl. BTW, BTW en incl. BTW automatisch uit de BTW-regels berekenen; geen automatische 21%-overschrijving meer bij handmatige gemengde BTW.

3. **Handmatig administratief afronden**
   - “Markeer als afgerond” ook beschikbaar maken wanneer nog een berekend verschil openstaat.
   - Bij een verschil verplicht een reden laten invullen en duidelijk het openstaande bedrag tonen.
   - De handmatige override vastleggen in historie/audit en door automatische herberekening laten respecteren totdat het project expliciet wordt heropend.

4. **Gegevens van BV-2602-0003 herstellen**
   - Eerste factuur corrigeren naar nummer **218168** en type **Deelfactuur**.
   - Eindfactuur **218169** corrigeren naar type **Eindfactuur**, € 16.022,81 excl., € -76,10 BTW en € 15.946,71 incl.
   - BTW-specificatie vastleggen als: 0% (€ 314,76 / € 0,00), 9% (€ 28.123,26 / € 2.531,09), 21% (€ -12.415,21 / € -2.607,19).
   - Daarna blijft het reële calculatieverschil zichtbaar en kan het project met reden handmatig worden afgerond.

5. **Borging**
   - Tests toevoegen voor aanbetaling + netto eindfactuur, gemengde BTW met negatief nettobedrag, credits, handmatige afronding met reden en behoud van de override bij herberekening.
   - De facturatiekaart en statusovergangen controleren voor dit project en voor bestaande normale deel-/eindfacturen.