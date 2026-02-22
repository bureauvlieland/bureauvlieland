
# Live Chat: Klant- en Partnerportaal

## Wat wordt het?

Een chat-widget (floating button rechtsonder) op het klantportaal en partnerportaal waarmee bezoekers direct een bericht kunnen sturen naar Bureau Vlieland. Als admin reageer je via een chatvenster in de admin-omgeving. Wordt er niet binnen ~2 minuten gereageerd, dan verschijnt automatisch de melding "We kijken of er iemand beschikbaar is" en kan de bezoeker een bericht achterlaten (inclusief naam/email als die nog niet bekend is). Je ontvangt een e-mailnotificatie bij elk nieuw gesprek.

---

## Gebruikerservaring

### Klant / Partner ziet:
1. Floating chat-icoon rechtsonder (bijv. blauw rondje met chat-icoontje)
2. Klik opent een compact chatvenster
3. Kan direct typen en versturen
4. Als admin online is: realtime antwoorden
5. Als admin niet reageert binnen 2 minuten: "We kijken of er iemand beschikbaar is. Laat gerust een bericht achter, dan nemen we zo snel mogelijk contact op."
6. Klantportaal: naam/email al bekend via programma-data, automatisch ingevuld
7. Partnerportaal: naam/email bekend via ingelogde partner

### Admin ziet:
1. Nieuw menu-item "Chat" in de admin-sidebar
2. Lijst van actieve en recente gesprekken (links)
3. Chatvenster (rechts) met realtime berichten
4. Badge/indicator bij nieuwe ongelezen berichten
5. Online/offline toggle om beschikbaarheid aan te geven

---

## Technisch overzicht

### Database (3 nieuwe tabellen)

**`chat_conversations`**
- `id` (uuid, PK)
- `source` (text: 'customer_portal' | 'partner_portal')
- `source_token` (text, nullable) -- customer_token voor klanten
- `source_partner_id` (text, nullable) -- partner id
- `visitor_name` (text)
- `visitor_email` (text)
- `request_id` (uuid, nullable) -- link naar programma
- `status` (text: 'active' | 'waiting' | 'closed')
- `last_message_at` (timestamptz)
- `created_at`, `updated_at`

**`chat_messages`**
- `id` (uuid, PK)
- `conversation_id` (uuid, FK)
- `sender_type` (text: 'visitor' | 'admin')
- `sender_name` (text)
- `content` (text)
- `read_at` (timestamptz, nullable)
- `created_at` (timestamptz)

**`chat_admin_presence`**
- `id` (uuid, PK)
- `user_id` (uuid, FK naar auth.users)
- `is_online` (boolean)
- `last_seen_at` (timestamptz)

RLS-policies:
- Berichten leesbaar/schrijfbaar via conversation source_token of source_partner_id (voor bezoekers)
- Admins hebben volledige toegang
- Realtime enabled op `chat_messages` en `chat_admin_presence`

### Frontend componenten

| Component | Locatie | Beschrijving |
|-----------|---------|--------------|
| `ChatWidget` | Floating component | Bubble + chatvenster, getoond op klant- en partnerportaal |
| `ChatWindow` | Onderdeel van widget | Berichtenlijst, invoerveld, "offline" fallback |
| `AdminChatPage` | `/admin/chat` | Gesprekkenlijst + chatvenster voor admin |
| `AdminChatSidebar` | Admin layout | Badge met ongelezen count |

### Realtime
- Supabase Realtime op `chat_messages` voor live updates
- Supabase Realtime op `chat_admin_presence` voor online-status

### E-mail notificatie
- Nieuwe edge function `notify-new-chat` die een e-mail stuurt naar hallo@bureauvlieland.nl bij het eerste bericht in een nieuw gesprek (of na 2 minuten zonder admin-reactie)
- Gebruikt bestaande Mailjet/Resend integratie

### Waar wordt de widget getoond?
- `CustomerProgram.tsx` -- klantportaal (alle views)
- `PartnerLayout.tsx` -- partnerportaal (alle pagina's)
- Niet op de publieke website of admin-omgeving

---

## Stappenplan

1. Database-migratie: 3 tabellen + RLS + realtime publicatie
2. `ChatWidget` component bouwen (floating bubble + chatvenster)
3. `useChat` hook voor berichten ophalen/versturen via Supabase realtime
4. Widget integreren in `CustomerProgram.tsx` en `PartnerLayout.tsx`
5. `AdminChatPage` bouwen met gesprekkenlijst + chatvenster
6. Admin-sidebar uitbreiden met chat-link + ongelezen-badge
7. Admin online/offline presence tracking
8. Edge function `notify-new-chat` voor e-mail notificaties
9. "Offline" fallback-flow in widget (bericht achterlaten)
