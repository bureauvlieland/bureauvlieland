

# Agenda-export toevoegen aan Admin Projectdetail

## Wat wordt er aangepast

De admin "Activiteiten" tab op de projectdetailpagina (`AdminRequestDetail.tsx`) krijgt een "Exporteer naar agenda" knop, zodat admins het volledige programma als .ics bestand kunnen downloaden naar hun eigen agenda.

## Wijzigingen

### `src/pages/admin/AdminRequestDetail.tsx`

1. Import toevoegen: `CalendarPlus` icoon uit lucide-react en `downloadAllEvents` uit `@/lib/calendarExport`
2. In de knoppenbalk van de "Activiteiten" CardHeader (naast "Template toepassen", "Opslaan als template", etc.) een nieuwe knop toevoegen: **"Exporteer naar agenda"**
3. De knop exporteert alle actieve items (met `day_index >= 0`) als .ics bestand, met de klantnaam als bestandsnaam

De bestaande `calendarExport.ts` utility wordt hergebruikt -- er zijn geen nieuwe bestanden of dependencies nodig.

## Technisch detail

De knop wordt toegevoegd rond regel 929-948, in de `flex items-center gap-2` container:

```tsx
<Button
  variant="outline"
  onClick={() => {
    const activeItems = items.filter(i => i.day_index >= 0);
    downloadAllEvents(
      activeItems.map(i => ({
        id: i.id,
        block_name: i.block_name,
        provider_name: i.provider_name,
        day_index: i.day_index,
        confirmed_time: i.confirmed_time,
        proposed_time: i.proposed_time,
        preferred_time: i.preferred_time,
        duration: i.duration,
      })),
      request.selected_dates as string[],
      request.number_of_people,
      request.customer_name || "programma"
    );
  }}
>
  <CalendarPlus className="h-4 w-4 mr-2" />
  Exporteer naar agenda
</Button>
```

| Bestand | Wijziging |
|---------|-----------|
| `src/pages/admin/AdminRequestDetail.tsx` | CalendarPlus import + "Exporteer naar agenda" knop in activiteiten header |

Geen database-wijzigingen, geen nieuwe bestanden.
