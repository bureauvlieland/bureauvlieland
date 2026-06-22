## Probleem
Een admin-chatbericht bestemd voor de klant landt in de partner-chatthread van hetzelfde project. De partner ziet daar nu een bericht over een wadloopexcursie/zeehondenexcursie dat aan de klant gericht was.

## Root cause
`src/components/admin/ProjectChatSheet.tsx` (de "Chat met klant"-sheet) zoekt de bestaande conversatie met **alleen** een filter op `request_id`:

```ts
.from("chat_conversations")
.select("id")
.eq("request_id", requestId)
.order("last_message_at", { ascending: false })
.limit(1)
```

Per project kunnen meerdere conversaties bestaan: één per partner (`source = 'partner_portal'`, `source_partner_id = <partner>`) én één voor de klant (`source = 'customer_portal'`, `source_token = <customer_token>`). Doordat het `source`-filter ontbreekt, pakt de admin-sheet de meest recent geüpdatete conversatie — vaak een partner-thread — en plakt het klantbericht daarin. De partner ziet het direct via realtime.

De partnerkant (`useProjectChat`) filtert wel correct op `source = 'partner_portal' + source_partner_id`, dus daar zit het lek niet.

## Fix

### `src/components/admin/ProjectChatSheet.tsx`
Beperk zowel het zoeken als het aanmaken van de klant-conversatie strikt tot de klant-bron:

1. **Zoekquery** uitbreiden:
   ```ts
   .eq("request_id", requestId)
   .eq("source", "customer_portal")
   .is("source_partner_id", null)
   .is("accommodation_id", null)
   ```
2. Bij `insert` blijft `source: "customer_portal"`; expliciet `source_partner_id: null` en `accommodation_id: null` zetten zodat het schema-niveau eenduidig is.

### Datasanering (één migratie)
Bestaande "kruisbestuiving" opruimen zodat de partner-portal-thread weer schoon is:

1. **Detecteren:** chat_messages met `sender_type = 'admin'` in conversaties met `source = 'partner_portal'` die binnen X minuten gevolgd/voorafgegaan zijn door geen partner-reactie en inhoudelijk verwijzen naar klant-context. Te risicovol om automatisch te verwijderen → in plaats daarvan:
2. **Pragmatisch:** voor het specifieke project (`BV-2606-0011`, request van van der Velden Interieur) het foute admin-bericht handmatig identificeren en alleen díe `chat_messages.id` verplaatsen naar de juiste customer-portal conversatie (of soft-deleten). Geen brede automatische opschoning — risico te groot.
3. Voor dit ene geval lever ik een gerichte `UPDATE` op `chat_messages` (verplaatsen naar customer-portal conv) als één losse migratie nadat ik beide conversatie-ids heb opgezocht via een `read_query`. Als er nog geen customer-portal conv bestaat voor dat request, maak die dan eerst aan met `source_token` uit `program_requests.customer_token`.

### Toekomstige bescherming
Geen schema-constraint (één conv per project per source kan niet hard afgedwongen worden zonder partial unique index op `source + source_partner_id + accommodation_id`). Wel toevoegen als kleine extra zekerheid:

- **Partial unique index** op `chat_conversations (request_id, source) WHERE source = 'customer_portal' AND status <> 'closed' AND accommodation_id IS NULL`. Dit voorkomt per ongeluk twee actieve customer-portal-threads voor hetzelfde project.

## Verificatie
1. Open een willekeurig project waar al een partner-chat loopt → klik admin "Chat met klant" → controleer dat een **nieuwe** conversatie wordt aangemaakt (`source = customer_portal`) en niet de partner-thread.
2. Stuur een admin-bericht → controleer dat het **niet** verschijnt in `useProjectChat` van die partner (via partner-portal preview/impersonate).
3. Controleer dat het bestaande foute bericht uit de partner-thread verdwenen is.

## Out of scope
- Geen UI-wijzigingen aan de partner-chat zelf.
- Geen retroactieve scan van alle projecten (te veel false-positives); alleen het gerapporteerde project wordt opgeschoond. Wil je een bredere scan, dan apart aanvragen.
