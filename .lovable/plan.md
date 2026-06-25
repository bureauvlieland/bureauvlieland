## Probleem

1. **Chat & live-chat tab toont "13"** — dat is het totaal aantal recente berichten/conversaties, niet ongelezen. Verwarrend tegenover "Te beantwoorden 13" (e-mails).
2. **Elke chat-rij toont "Actief"** — zegt niets. Geen visueel verschil tussen wél en niet ongelezen.
3. **Volgorde** is puur op `last_message_at`. Een beantwoorde, recent gesloten chat staat boven een onbeantwoorde uit vanmorgen.
4. **Te beantwoorden 13** = e-mails + chats + live-chat opgeteld. Logisch, maar e-mails per project groeperen komt in een volgende ronde (zoals jij aangaf).

## Oplossing

### A. Chat-tab badge telt alleen ongelezen
`AdminMessages.tsx` rekent nu `chatsCount + liveChatsCount` (ruw aantal). Vervangen door:
- `chatUnreadCount` = `unreadConversationIds.size` uit `useAdminChat` (conversaties met ongelezen visitor/customer/partner-berichten)
- `liveChatUnreadCount` = som van `unread_count` over `inboxData.liveChats`
- Tab-badge = som van beide. 0 = geen badge.

Zelfde fix in `useAdminInbox.totalUnread`, zodat de bel-dropdown rechtsboven hetzelfde getal toont.

### B. Chat-rij krijgt heldere ongelezen-markering
In `ChatConversationItem.tsx`:
- Vervang het generieke "Actief" badge door:
  - **Ongelezen**: rood pill met "● N nieuw" (count uit unread-map per conversatie).
  - **Geen unread + status=closed**: grijze "Gesloten" pill.
  - **Geen unread + status=waiting/active**: géén badge (rust).
- Ongelezen rijen krijgen `font-semibold` naam, lichte achtergrond (`bg-rose-50/40`) en een dot links.
- `useAdminChat` levert nu al `unreadConversationIds: Set<string>`; uitbreiden naar `unreadByConversation: Map<string, number>` (count per conversatie) zodat we het aantal kunnen tonen.

### C. Sortering: ongelezen bovenaan
In `ChatPanel.tsx` na `channelFiltered`: stabiel sorteren — eerst conversaties met `unreadByConversation.get(id) > 0` (op laatste bericht aflopend), daarna de rest. "Gesloten"-tab houdt huidige sortering.

### D. Inbox-tabbadge consistent
`unansweredCount` in `AdminMessages.tsx` blijft som van e-mail + chat-unread + live-chat-unread, maar gebruikt de nieuwe unread-tellers (B+A) zodat dropdown ↔ tab ↔ chat-tab altijd matchen.

### E. (Volgende ronde, niet nu) Te beantwoorden per project
Notitie in `.lovable/plan.md`: e-mails in `InboxToAnswer` groeperen per `request_id`/`accommodation_id` met collapsible project-cards. Skippen we nu.

## Bestanden

- `src/hooks/useAdminChat.ts` — `unreadByConversation` Map toevoegen aan return.
- `src/hooks/useAdminInbox.ts` — `totalUnread` baseren op echte unread (live-chat ✓ al, chats herrekenen via read_at i.p.v. lookback).
- `src/components/admin/chat/ChatConversationItem.tsx` — badge + styling per unread-state, accepteer `unreadCount` prop.
- `src/components/admin/ChatPanel.tsx` — sortering + prop doorgeven + tabbadge "Inbox" gebruikt unread-aantal (al zo).
- `src/pages/admin/AdminMessages.tsx` — tab-badge "Chat & live-chat" gebruikt nieuwe unread-tellers.

Geen DB-wijzigingen, geen edge-functions.
