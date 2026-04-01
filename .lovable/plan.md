

## Plan: In-app notificatie bij nieuw chatbericht

### Probleem
De admin krijgt wel een e-mailnotificatie bij nieuwe chatberichten, maar als hij actief in het adminportaal werkt (niet op de chatpagina) ziet hij geen melding verschijnen.

### Oplossing
Een globale Supabase Realtime listener toevoegen in `AdminLayout.tsx` die luistert naar nieuwe `chat_messages` van type `visitor`. Bij een nieuw bericht verschijnt een toast-notificatie met de naam van de afzender en een preview van het bericht.

### Wijzigingen

| Bestand | Actie |
|---|---|
| `src/components/admin/AdminLayout.tsx` | Realtime subscription toevoegen op `chat_messages` INSERT; bij `sender_type === "visitor"` een toast tonen met afzendernaam + berichtpreview; klikbaar naar `/admin/chat` |

### Details
- Subscription op `postgres_changes` → `INSERT` op `chat_messages`
- Filteren op `sender_type === "visitor"` (geen notificatie voor eigen berichten)
- Toast met `sender_name` en eerste ~80 tekens van het bericht
- Geen dubbele notificatie als admin al op de chatpagina zit (check `location.pathname`)
- Eén bestand, ~15 regels toevoegen

