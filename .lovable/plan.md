## Probleem
De **Inbox-dropdown** rechtsboven toont drie bronnen:
1. Inkomende e-mails (`project_communications` direction=inbound, niet beantwoord)
2. Berichten klant/partner (`chat_messages` uit projecten/logies — niet-website chats)
3. Live chat website (`chat_messages` uit website-widget conversaties)

Het **Berichtencentrum → Te beantwoorden** toont alleen bron 1 (inkomende e-mails uit `project_communications`). De chat-berichten van klanten/partners en de live website-chats ontbreken hier, waardoor de dropdown wel items toont en de pagina "Geen e-mails te beantwoorden".

## Oplossing
`InboxToAnswer` (Berichtencentrum → Te beantwoorden) wordt uitgebreid zodat dezelfde drie bronnen zichtbaar zijn als in de dropdown.

### Wijzigingen in `src/components/admin/InboxToAnswer.tsx`
- Naast `fetchInboundEmails` ook chat-berichten ophalen via dezelfde logica als `useAdminInbox` (split op `chat_conversations.source`: project/logies-chats vs. website live-chats).
- Drie secties onder elkaar binnen het bestaande "Te beantwoorden"-paneel:
  - **Inkomende e-mails** (huidige lijst, ongewijzigd qua rij-render en reply-flow)
  - **Berichten klant/partner** — per chat-bericht een rij met afzender + projectreferentie; klik opent het project op tab `communicatie` (zelfde route als dropdown gebruikt).
  - **Live chat (website)** — gegroepeerd per conversatie met ongelezen-teller; klik opent `/admin/berichten?conversation=…` (zelfde route als dropdown).
- Lege staat: alleen "Geen berichten te beantwoorden" tonen als álle drie de bronnen leeg zijn.
- Filter "Alles beantwoord" blijft alleen van toepassing op de e-mails-sectie; chat-secties hebben hun eigen unread-criterium (`read_at IS NULL` voor live, ontbrekend `replied_at`/laatste admin-reply voor project-chats — voor nu: alle niet-admin berichten van laatste 14 dagen, gelijk aan dropdown).

### Wijzigingen in `src/pages/admin/AdminMessages.tsx`
- Badge-teller op tab "Te beantwoorden": gebruik dezelfde totaaltelling als de dropdown (`useAdminInbox().data.totalUnread` of een gedeelde teller-query), zodat tab-badge en dropdown-badge altijd matchen.
- Tab-label blijft "Te beantwoorden" maar krijgt subtekst/uitleg "E-mails en berichten van klanten en partners" om te verduidelijken dat dit niet alleen e-mail is.

### Geen schemawijzigingen
Alle benodigde tabellen (`project_communications`, `chat_messages`, `chat_conversations`) worden al gebruikt door `useAdminInbox`; geen DB-migratie nodig.

## Resultaat
Dropdown en Berichtencentrum tonen exact dezelfde set items en hetzelfde aantal "nieuw".
