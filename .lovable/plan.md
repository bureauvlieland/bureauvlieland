

# Plan: Derde dag herstellen en code robuuster maken

## Probleem
De `selected_dates` van deze aanvraag bevat `["2026-09-25", "2026-09-27"]` (2 items), maar er zijn activiteiten op `day_index` 0, 1 en 2 (3 dagen). De DayTabs-component toont alleen tabs voor het aantal items in `selectedDates`, waardoor dag 3 (index 2) onzichtbaar is.

## Oorzaak
Ergens bij het aanmaken of bewerken van de aanvraag is 26 september niet meegekomen in het dates-array. Dit kan gebeuren als datums individueel worden geselecteerd in plaats van als bereik.

## Oplossing (twee stappen)

### 1. Data reparatie (eenmalig)
De ontbrekende datum toevoegen aan de database voor deze specifieke aanvraag:
- `selected_dates` wijzigen van `["2026-09-25", "2026-09-27"]` naar `["2026-09-25", "2026-09-26", "2026-09-27"]`

### 2. Code robuuster maken (preventief)
In `CustomerProgram.tsx` een veiligheidscontrole toevoegen: als er items bestaan met een `day_index` die hoger is dan het aantal `selectedDates`, worden placeholder-datums gegenereerd zodat die items altijd zichtbaar blijven. Dit voorkomt dat activiteiten onzichtbaar verdwijnen bij toekomstige data-inconsistenties.

**Bestand:** `src/pages/CustomerProgram.tsx`
- Na het parsen van `selectedDates`, controleren of de hoogste `day_index` uit de items het array overschrijdt
- Zo ja: extra datums toevoegen (berekend als opvolgende dagen na de laatste bekende datum)

Dit is een kleine defensieve aanpassing van circa 10 regels code.

