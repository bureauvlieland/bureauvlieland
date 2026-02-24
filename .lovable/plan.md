
# Kopieer vanuit eerder programma + kleinere agenda-knop

## Wat wordt er gebouwd
Een nieuwe "Kopieer vanuit programma" functie op de admin aanvraag-detailpagina. Bij klikken opent een dialoog die automatisch vergelijkbare eerdere programma's suggereert op basis van:
- Aantal dagen (zelfde duur)
- Vergelijkbaar aantal personen (marge van +/- 30%)
- Eventuele overeenkomsten in program_type of program_description

Daarnaast wordt de "Exporteer naar agenda" knop compacter gemaakt (alleen icoon, of kleiner formaat).

## Hoe het werkt
1. Admin klikt op "Kopieer vanuit programma" naast de bestaande knoppen
2. Een dialoog opent met een lijst eerdere programma's, gesorteerd op relevantie (eerst programma's met zelfde duur + vergelijkbaar aantal personen)
3. Bij selectie toont het de activiteiten van dat programma als preview
4. Bij "Toepassen" worden alle items gekopieerd naar het huidige project (zelfde logica als template toepassen)

## Technisch overzicht

| Bestand | Wijziging |
|---|---|
| `src/components/admin/CopyFromProgramDialog.tsx` | Nieuw component: dialoog die vergelijkbare programma's ophaalt en laat selecteren |
| `src/pages/admin/AdminRequestDetail.tsx` | Nieuwe knop "Kopieer vanuit programma" + state; agenda-knop verkleinen naar `size="icon"` met tooltip |

### Nieuw: `CopyFromProgramDialog.tsx`
- Ontvangt `requestId`, `durationDays`, `numberOfPeople`, `programDescription` als props
- Query: haalt `program_requests` op die:
  - Niet het huidige project zijn
  - Niet geannuleerd zijn
  - Minimaal 1 item hebben (subquery of join-count)
  - Gesorteerd: eerst zelfde `duration_days` (berekend uit `selected_dates`), dan dichtst bij qua `number_of_people`
- Toont lijst met: klantnaam, referentienummer, datum, aantal personen, aantal activiteiten
- Bij selectie: haalt `program_request_items` op voor dat project en toont preview per dag
- Bij "Toepassen": kopieert items naar huidig project met `skip_partner_notification: true`, zelfde mapping als `ApplyTemplateDialog`

### Wijziging: `AdminRequestDetail.tsx`
- Import `CopyFromProgramDialog` + state `copyFromProgramOpen`
- Nieuwe knop na "Template toepassen": "Kopieer programma" met `Copy` icoon
- "Exporteer naar agenda" knop wordt `size="sm"` met alleen het icoon + tooltip voor uitleg

### Scoring/matching logica
De dialoog berekent een eenvoudige relevantie-score per programma:
- Zelfde aantal dagen: +2 punten
- Vergelijkbaar aantal personen (binnen 30%): +1 punt
- Zelfde program_type: +1 punt
- Resultaten gesorteerd op score (aflopend), max 20 programma's getoond
