

# Agenda-export via .ics bestand (Outlook / Google / Apple)

## Samenvatting

Een "Toevoegen aan agenda" functie voor zowel partners als klanten, met per-activiteit en alles-in-een export. Dankzij een vaste UID per activiteit worden items bij herhaalde export overschreven in plaats van verdubbeld.

## Duplicate-preventie

Elk event krijgt een deterministische UID: `bureauvlieland-{item.id}@bureauvlieland.nl`. Kalender-apps (Outlook, Google, Apple) gebruiken deze UID om bestaande events te herkennen en bij te werken in plaats van duplicaten aan te maken.

---

## Nieuwe bestanden

### `src/lib/calendarExport.ts`

Puur client-side .ics generatie zonder extra dependencies.

**Functies:**
- `generateIcsEvent(item, dates, numberOfPeople)` -- genereert een VEVENT-blok met:
  - `UID`: `bureauvlieland-{item.id}@bureauvlieland.nl` (voorkomt duplicaten)
  - `DTSTART` / `DTEND`: datum + tijd (of hele dag als geen tijd bekend)
  - `SUMMARY`: activiteitnaam
  - `DESCRIPTION`: aanbieder + aantal personen
  - `LOCATION`: Vlieland (standaard)
- `downloadSingleEvent(item, dates, numberOfPeople)` -- download .ics voor 1 activiteit
- `downloadAllEvents(items, dates, numberOfPeople, programName)` -- download .ics met alle activiteiten in 1 bestand

Download via tijdelijke Blob URL + `<a>` element.

---

## Bestaande bestanden die worden aangepast

### Partner portaal: `src/components/partner-portal/PartnerUpcomingActivities.tsx`

- **Per activiteit**: klein kalender-icoontje (CalendarPlus) rechts van elk item, met `stopPropagation` zodat het niet de detail-sheet opent
- **Alles exporteren**: "Exporteer naar agenda" knop in de CardHeader naast de titel

### Klant portaal: `src/components/customer-portal/CustomerProgramItem.tsx`

- **Per activiteit**: "Agenda" knopje in de actie-rij van elk programma-item

### Klant portaal: `src/components/customer-portal/DesktopProgramView.tsx`

- **Alles exporteren**: "Alles naar agenda" knop bovenaan het programma-overzicht

### Klant portaal: `src/components/customer-portal/MobileProgramView.tsx`

- **Alles exporteren**: "Alles naar agenda" knop bovenaan het programma-overzicht

---

## Technische details

### .ics formaat voorbeeld

```text
BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Bureau Vlieland//Programma//NL
METHOD:PUBLISH
BEGIN:VEVENT
UID:bureauvlieland-abc123@bureauvlieland.nl
DTSTART:20260315T100000
DTEND:20260315T120000
SUMMARY:Blokartenles
DESCRIPTION:Aanbieder: VOC Vlieland\n20 personen
LOCATION:Vlieland
END:VEVENT
END:VCALENDAR
```

### Overzicht wijzigingen

| Bestand | Wijziging |
|---------|-----------|
| `src/lib/calendarExport.ts` | Nieuw -- .ics generatie met deterministische UID |
| `src/components/partner-portal/PartnerUpcomingActivities.tsx` | Kalender-icoon per item + "Exporteer" knop |
| `src/components/customer-portal/CustomerProgramItem.tsx` | "Agenda" knop per item |
| `src/components/customer-portal/DesktopProgramView.tsx` | "Alles naar agenda" knop |
| `src/components/customer-portal/MobileProgramView.tsx` | "Alles naar agenda" knop |

Geen database-wijzigingen, geen nieuwe dependencies nodig.

