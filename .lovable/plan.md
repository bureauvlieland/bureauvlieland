# Inbox-belletje in admin topbar

Een belletje (Bell-icon) naast de Claudia-knop in de admin topbar dat aandacht vraagt voor nieuwe inkomende communicatie, zodat mails als die van vanmorgen niet meer langs je heen gaan.

## Wat telt mee in het belletje

Het belletje aggregeert drie bronnen — alles van de laatste 14 dagen dat nog niet "gezien" is:

1. **Inkomende e-mails** — `project_communications` waar `direction = 'inbound'` (Mailjet Parse replies op projecten/logies).
2. **Klant/partner chat** — `chat_messages` (logies + project chat) van sender_type ≠ admin, met `read_at IS NULL`.
3. **Live chat-widget** — `chat_conversations` met onbeantwoorde bezoekersberichten (dezelfde logica als `useAdminChat`).

Totaalbadge = som van alle drie. Rood puntje als > 0, met getal in een Badge (zoals Claudia nu).

## UI

Knop links van de Claudia-chip, zelfde stijl (rounded-full, border, kleine badge). Bell-icoon (`lucide-react`).

Klikken opent een **Popover** (shadcn) met drie secties:

```text
┌─ Inbox ─────────────────────────────┐
│  📧 Inkomende e-mails (3)           │
│   • Re: Update logiesaanvraag…      │
│     Klant Jansen · 06:55            │
│   • …                               │
│                                      │
│  💬 Berichten (2)                   │
│   • Partner Stortemelk — "We…"      │
│                                      │
│  🟢 Live chat (1)                   │
│   • Bezoeker — "Hoi, vraag over…"   │
│                                      │
│  ─────────────────────────────────  │
│  Bekijk alles → /admin/messages     │
└─────────────────────────────────────┘
```

Per regel: klik = direct naar de bron:
- E-mail → projectdetail tab "Communicatie" (`/admin/projecten/:id?tab=communicatie`) of logiesdetail.
- Chat-bericht → projectdetail chat-sheet of `/admin/accommodatie/:id`.
- Live chat → `/admin/chat?conversation=…`.

"Bekijk alles" linkt naar `/admin/messages` (bestaat al — `AdminMessages.tsx`).

## "Gezien" logica

Geen DB-migratie nodig in v1. We gebruiken een **`localStorage` watermark**: `admin_inbox_seen_at` = ISO timestamp van laatste keer dat popover geopend werd. Items met `created_at > seen_at` tellen als "nieuw" voor de badge. De popover laat altijd de laatste ~10 items per categorie zien, ongeacht gezien-status, met een visueel "nieuw"-stipje voor ongeleezen.

Voordeel: snel te bouwen, geen schema-wijziging, werkt per device (wat oké is — meestal één admin).

Als je later cross-device wilt: dan een kolom `last_inbox_seen_at` op `user_roles` of een nieuwe `admin_settings` tabel. Niet in deze iteratie.

## Realtime

Supabase Realtime channels op `project_communications`, `chat_messages` en `chat_conversations` om de badge live te updaten (net als `ClaudiaBadge`). React Query invalidatie + polling fallback elke 60s.

## Bestanden (technisch)

- **Nieuw**: `src/components/admin/InboxBell.tsx` — knop + popover + lijstrenderers.
- **Nieuw**: `src/hooks/useAdminInbox.ts` — query/realtime, retourneert `{ emails, chats, liveChats, totalUnread }`.
- **Edit**: `src/components/admin/AdminLayout.tsx` — render `<InboxBell />` direct vóór `<ClaudiaBadge />` (regel ~410).

Geen backend changes. Geen RLS changes (admin heeft al volledige toegang tot deze tabellen).

## Out of scope (voor deze iteratie)

- Mark-as-read per item (komt later als je het wilt).
- Browser/desktop push notificaties.
- Filteren per project of categorie binnen de popover (we tonen alleen "laatste 10 per type").
