
# Plan: Prijsberekening offerte-PDF corrigeren

## Probleem
De offerte-PDF vermenigvuldigt alle itemprijzen met het aantal personen (150), ongeacht of het totaalprijzen of per-persoon prijzen zijn. In dit project zijn alle items totaalprijzen (`price_type = 'total'`), waardoor het totaal ~150x te hoog uitvalt (EUR 11,6M in plaats van ~EUR 77.000).

## Oorzaak
In `AdminQuotePreview.tsx`:
- Het veld `price_type` wordt niet opgehaald uit de database
- De functie `calculateTotals()` vermenigvuldigt alles met `number_of_people`
- De kolomkop zegt altijd "Prijs p.p." ongeacht het prijstype

## Aanpak

### Bestand: `src/pages/admin/AdminQuotePreview.tsx`

**1. Interface uitbreiden**
- `price_type` toevoegen aan de `ProgramItem` interface

**2. `calculateTotals()` herschrijven**
- Per item checken of `price_type === 'per_person'`: zo ja, vermenigvuldigen met `number_of_people`
- Voor `total`, `per_hour`, `per_day`: de prijs ongewijzigd optellen
- Coordinatiefee blijft apart (is altijd een totaalprijs)

**3. Kolomkop dynamisch maken**
- "Prijs p.p." alleen tonen als er per-persoon items zijn
- Anders "Prijs totaal" tonen
- Of een generieke kop "Prijs" gebruiken en per regel het type aangeven

**4. Per-item weergave verbeteren**
- Bij `per_person` items: toon de prijs per persoon en optioneel het totaal
- Bij `total` items: toon de totaalprijs direct
- Voeg een subtiele label toe ("p.p." of "totaal") achter de prijs

### Berekening na fix
- Itemtotaal: EUR 77.434,40 (som van alle admin_price_override waarden)
- Coordinatiefee: EUR 500 (staffel 151+ personen)
- Subtotaal incl. BTW: EUR 77.934,40
- Subtotaal excl. BTW: EUR 64.408,60
- BTW (21%): EUR 13.525,80
- Totaal incl. BTW: EUR 77.934,40

### Bestanden
- `src/pages/admin/AdminQuotePreview.tsx` -- prijslogica en weergave corrigeren
