
## Analyse

Er spelen hier eigenlijk 2 verschillende problemen door elkaar:

1. **De kostenspecificatie mengt bevestigde bedragen en voorlopige “ca.” bedragen**
   - In `PriceSummaryCard.tsx` worden voorlopige orderregels wel getoond, maar het totaal onderaan telt alleen de **bevestigde** regels mee.
   - Daardoor klopt het visueel niet met de optelsom van de bedragen die je als gebruiker op het scherm ziet.

2. **Het bedrag `€599` in de rechterkolom is een losse, verouderde berekening**
   - Dat komt uit `useProgramStatus.ts`.
   - Daar wordt `totalCost` nu berekend als som van `quoted_price` + geselecteerd logies, **zonder** fees/heffingen en **zonder** consistente per-persoon-vermenigvuldiging.
   - In de sidebar wordt dat ook nog afgerond op hele euro’s, dus `€598,95` wordt `€599`.
   - Concreet: dat bedrag is nu geen bruikbaar “totaal”, maar feitelijk een ruwe tussensom van bevestigde itemprijzen. Daarom is het verwarrend en kan het inderdaad weg.

Daarnaast zie ik nog een derde bron van inconsistentie op dezelfde pagina:
- In `DesktopProgramView.tsx` en `MobileProgramView.tsx` worden dagtotalen met `quoted_price` berekend zonder dezelfde centrale prijslogica. Dat kan bij per-persoon-items ook fout lopen.

## Plan

### 1. Eén centrale prijsberekening maken voor het klantportaal
Een gedeelde helper maken voor:
- regeltotaal per item
- confirmed bedrag
- preliminary bedrag
- per-persoon-vermenigvuldiging
- btw-opbouw
- fees/heffingen/logies
- totaal bevestigd
- totaal indicatief

Doel: alle customer-portal schermen gebruiken exact dezelfde bron voor bedragen.

### 2. `PriceSummaryCard` corrigeren zodat de getoonde regels en totalen logisch op elkaar aansluiten
In de kostenspecificatie:
- per orderregel altijd het juiste regeltotaal tonen
- confirmed en preliminary regels apart blijven onderscheiden
- onderaan niet meer één misleidend totaal tonen als er nog voorlopige regels zichtbaar zijn

Voorgestelde richting:
- **Bevestigd totaal incl. BTW** = alleen bevestigde regels + fees/heffingen/logies
- **Indicatief totaal incl. BTW** = bevestigde + voorlopige regels waarvoor al een voorlopige prijs bekend is
- als er nog regels zonder prijs zijn, dat expliciet blijven melden

Zo klopt de optelsom van de zichtbare orderregels eindelijk met wat de gebruiker onderaan verwacht.

### 3. Het losse bedrag in de rechterkolom verwijderen
De “Totaal (incl. BTW) €599”-kaart in `ProgramSidebar.tsx` verwijderen.

Omdat dezelfde `totalCost` ook in de mobiele sticky status gebruikt wordt, neem ik die meteen mee zodat er nergens nog een tweede, afwijkend totaal in de customer portal staat.

### 4. Overige totalen op dezelfde pagina gelijk trekken
Ook de dagtotalen / prijs-samenvattingen in:
- `DesktopProgramView.tsx`
- `MobileProgramView.tsx`
laten rekenen via dezelfde helper, zodat per-persoon-items daar ook niet opnieuw fout of afwijkend worden verwerkt.

## Betrokken bestanden

- `src/components/customer-portal/PriceSummaryCard.tsx`
- `src/hooks/useProgramStatus.ts`
- `src/components/customer-portal/ProgramSidebar.tsx`
- `src/components/customer-portal/MobileStickyStatus.tsx`
- `src/components/customer-portal/DesktopProgramView.tsx`
- `src/components/customer-portal/MobileProgramView.tsx`
- plus waarschijnlijk een nieuwe gedeelde helper, bijvoorbeeld in `src/lib/` of `src/components/customer-portal/`

## Verwacht resultaat

Na deze aanpassing:
- worden per-persoon-bedragen overal consequent vermenigvuldigd
- zijn bevestigde en voorlopige totalen duidelijk gescheiden
- klopt de optelsom van de zichtbare orderregels
- verdwijnt het onverklaarbare `€599`-bedrag uit de rechterkolom
- gebruiken alle customer-portal totalen dezelfde rekenlogica
