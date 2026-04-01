

## Plan: Partners notificeren bij project-verwijdering

### Probleem
Bij het verwijderen van een project via de admin worden partners met openstaande aanvragen niet geïnformeerd. Zij houden een openstaande aanvraag in hun portaal zonder te weten dat deze niet meer relevant is.

### Oplossing
Bij het verwijderen van een project de openstaande program_items op status `"cancelled"` zetten en de betreffende partners per e-mail informeren.

### Aanpak

**1. Admin delete-flow uitbreiden** (`src/pages/admin/AdminProjects.tsx`)
- Na het updaten van `program_requests.status` naar `"deleted"`:
  - Alle `program_items` met status `pending`/`sent`/`accepted` ophalen
  - Hun status naar `"cancelled"` zetten
  - Voor elke unieke partner een notificatie-e-mail versturen via een edge function

**2. Edge function voor partner-notificatie** (`supabase/functions/notify-partner-cancellation/index.ts`)
- Ontvangt: `partner_email`, `partner_name`, `program_ref`, `item_names[]`
- Stuurt een kort e-mail: "De aanvraag {program_ref} is komen te vervallen. De volgende onderdelen zijn geannuleerd: ..."
- Geen klantgegevens in de mail (conform privacy-regels)
- Logt de communicatie in `project_communications`

**3. Accommodation-quotes ook afhandelen**
- Bij het verwijderen met gekoppelde logiesaanvraag: openstaande quotes (`pending`/`submitted`) op `rejected` zetten en logiespartners informeren (hergebruik bestaande logica uit `cancel-program-request`)

### Wijzigingen

| Bestand | Actie |
|---|---|
| `src/pages/admin/AdminProjects.tsx` | Na delete: items cancellen + edge function aanroepen |
| `supabase/functions/notify-partner-cancellation/index.ts` | Nieuwe edge function: partners mailen bij verwijdering |

Twee bestanden.

