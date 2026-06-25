# Eén Berichtencentrum

Doel: e-mail (project_communications + email_log), klant/partner project-chat (chat_messages) en website live-chat (chat_conversations) bundelen in één scherm op `/admin/berichten`. `/admin/chat` vervalt. Het bell-icoon rechtsboven wordt een pure alert + sneltoegang, geen tweede UI.

## Inspiratie (best practice)
Front, Missive, Intercom, Gmail: drie-kolom layout (filters → threadlijst → conversatie), unified inbox met kanaal-iconen, ongelezen vs gelezen typografisch onderscheid (vet/punt), snooze + "mark done", zoeken over alle kanalen, keyboard shortcuts (`j/k`, `e`, `r`).

## Nieuwe layout `/admin/berichten`

```text
┌──────────────┬───────────────────────────┬─────────────────────────────┐
│ Filters      │ Threadlijst               │ Conversatiepaneel           │
│              │                           │                             │
│ • Inbox  12  │ ● Jan de Vries     2m     │ Onderwerp / project chip    │
│ • Ongelezen  │   BV-2606-0011 · Mail     │ ─────────────────────────── │
│ • Te beantw. │   "Kunnen we de tijd…"    │ [oudste → nieuwste, in-     │
│ • @Mij       │ ─────────────────────────│  line e-mails + chats +     │
│ • Snoozed    │ ○ Wadexcursie      1u    │  systeemmeldingen]          │
│ • Afgehand.  │   BV-2606-0009 · Chat    │                             │
│              │   "Akkoord op alt tijd"  │ ─────────────────────────── │
│ Kanalen      │ ─────────────────────────│ [Composer]                  │
│ □ E-mail     │ ● Live • Bezoeker  4m    │  E-mail │ Chat │ Notitie    │
│ □ Chat       │   Website · Live chat    │                             │
│ □ Live       │   "Ik wil graag info…"   │                             │
│              │                          │                             │
│ Projecten    │                          │                             │
│  (top 8)     │                          │                             │
└──────────────┴──────────────────────────┴─────────────────────────────┘
```

- **Linker rail**: smart-views (Inbox / Ongelezen / Te beantwoorden / @Mij / Snoozed / Afgehandeld) + kanaal-toggles + recente projecten.
- **Threadlijst**: één rij per *thread* (per project + contact óf per live-chat conversatie). Kanaal-icoon, projectref-chip, naam, snippet, tijd, ongelezen-dot. Vet = ongelezen, normaal = gelezen.
- **Conversatiepaneel**: chronologisch alle items van die thread — inbound/outbound e-mails (volledige body + bijlagen), chat-bubbels en interne notities door elkaar. Header met klant/partner, project-link, snelle acties (Beantwoorden, Markeer afgehandeld, Snooze, Open project).
- **Composer**: tabs *E-mail* (reply naar laatste inbound, met BCC/Cc), *Chat* (post in project-chat of live-chat) en *Notitie* (intern).

## Bell rechtsboven (vereenvoudigd)

- Wordt pure **alert**: rood badge-getal = nieuwe items sinds laatste bezoek aan `/admin/berichten`.
- Klik = direct naar `/admin/berichten` (geen dropdown-lijst meer; markeert items als "gezien").
- Optioneel houden we een mini-preview (laatste 3) maar geen lijst per kanaal — minder duplicate UI.

## Datamodel & state

- **Thread-key**: `project_id + counterparty` voor project-mail/chat; `conversation_id` voor live-chat; `email_thread_id` (Mailjet) als fallback voor losse mails.
- **Gelezen-status**: nieuw `message_reads` tabel (`user_id`, `thread_key`, `last_read_at`) — admin-side, zodat de bell en de threadlijst dezelfde "ongelezen" definitie gebruiken. Vervangt het huidige localStorage-`seenAt`.
- **Te beantwoorden**: inbound zonder `answered_at` (mail) + chat_messages waarbij laatste bericht van klant/partner is.
- **Snooze**: hergebruik bestaande `admin_todos.snooze_until` óf voeg `snoozed_until` toe op `message_reads`.

## Zoeken & filteren

- Globale zoekbalk bovenaan: full-text over `project_communications.content/subject`, `chat_messages.content`, `email_log.subject`, contactnaam, projectref. Server-side via Postgres `ilike` (later: tsvector).
- Filters combineerbaar: kanaal, periode, project, status (ongelezen/te-beantw/afgehandeld/snoozed), eigenaar.
- URL-state: `?view=unanswered&channel=email&q=…&thread=…` zodat de bell en deep-links werken.

## Routing & cleanup

- `/admin/chat` wordt redirect naar `/admin/berichten?channel=chat`. Sidebar-item "Chat" verdwijnt (één entry "Berichten" met badge).
- Bestaand `useAdminChat` blijft het Realtime/sendMessage-mechanisme — wordt geïmporteerd in het nieuwe conversatiepaneel voor chat-threads.
- `InboxToAnswer` en huidige tabs in `AdminMessages` vervallen ten gunste van de nieuwe smart-views.

## Realtime

- Supabase Realtime op `project_communications`, `chat_messages`, `chat_conversations` → invalidate threadlijst + conversatiepaneel + bell.
- Toast (optioneel, off by default) bij nieuw bericht buiten actieve thread.

## Toetsenbord-shortcuts

`j`/`k` thread navigeren, `Enter` openen, `e` markeer afgehandeld, `r` reply, `n` notitie, `/` focus zoekbalk.

## Implementatiestappen (technisch)

1. **DB**: migratie `message_reads` + GRANT + RLS (admin only).
2. **Lib** `src/lib/messageCenter.ts`: `loadThreads()`, `loadThread(threadKey)`, `markRead`, `markAnswered`, `snooze`, `search`. Verenigt de drie bronnen tot één `Thread`/`ThreadMessage` type.
3. **Hooks**: `useThreads(filters)`, `useThread(key)`, `useUnreadCount()` (vervangt `useAdminInbox` + losse query in `AdminMessages`).
4. **UI**:
   - `src/pages/admin/AdminMessages.tsx` herschreven naar drie-kolom layout (ResizablePanel).
   - `src/components/admin/messages/FiltersRail.tsx`, `ThreadList.tsx`, `ThreadView.tsx`, `Composer.tsx`, `SearchBar.tsx`.
   - `InboxBell.tsx` versimpeld tot badge + navigatie (behoudt mini-preview top 3).
5. **Routing**: `AdminChat` → redirect; sidebar update.
6. **Cleanup**: oude `InboxToAnswer.tsx` verwijderen, `useAdminInbox` vervangen door `useUnreadCount`.
7. **Verificatie**: Playwright-flow: nieuwe inbound e-mail + nieuwe chat → bell badge +2, threadlijst toont beide, reply via composer markeert afgehandeld, bell wordt 0.

## Out of scope (voor nu)
- Bulk-acties op meerdere threads.
- Tsvector / Postgres full-text (eerst `ilike`).
- AI-suggesties voor replies.
