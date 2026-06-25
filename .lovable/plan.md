
# Berichtencentrum: slim archief + e-mail-threads

## Doel
1. Afgeronde / geannuleerde projecten verdwijnen uit het berichtencentrum, maar zodra er **na** afronding nog een chat of e-mail binnenkomt, komt het dossier weer terug bovenaan.
2. Admin kan handmatig hele gespreksdraden (chat én e-mail) archiveren met één klik. Nieuwe inkomende berichten heffen het archief automatisch op (Gmail-/Front-stijl).
3. Tab **"Te beantwoorden"** wordt hernoemd naar **"E-mail"** en krijgt dezelfde 2-koloms opzet als de chat-tab: links groepen per project/klant/partner, rechts de complete e-mail-thread + inline beantwoorden.

---

## 1. Slim archief (auto + handmatig)

### Auto-archief op project-niveau
- Nieuwe kolom `archived_at TIMESTAMPTZ` op `program_requests` en `accommodation_requests`.
- Trigger zet `archived_at = now()` zodra `completion_status` overgaat naar `ready_for_invoice`, `invoiced`, `completed`, `feedback_received` of `cancelled`. Reset naar `NULL` als de status terug verandert.
- Filter-regel in `useAdminInbox` / `useAdminChat`: een project is verborgen **alleen als** `archived_at IS NOT NULL` **én** er geen inkomende e-mail of chat-bericht is met `created_at > archived_at`. Komt er na archivering nog mail/chat binnen → automatisch weer zichtbaar, bovenaan.
- Trigger op `project_communications` (inbound) en `chat_messages` (niet-admin) reset `archived_at = NULL` op het gekoppelde project zodra zo'n bericht binnenkomt. Hierdoor blijft de filterlogica simpel en zonder per-query timestampvergelijking.

### Handmatig archiveren per draad
- `chat_conversations.archived_at TIMESTAMPTZ` — kolom + actie "Archiveer gesprek" in chat-header.
- `project_communications.archived_at TIMESTAMPTZ` per e-mail — actie "Archiveer thread" zet `archived_at = now()` op alle e-mails in die thread (zelfde project + contact_email).
- Nieuwe inkomende chat/e-mail valt automatisch buiten archief (`archived_at IS NULL` voor de nieuwe row) → draad komt terug.
- Optionele toggle "Toon gearchiveerd" in beide tabs (default uit).

---

## 2. E-mail tab herontwerp

### Naam & navigatie
- Tab "Te beantwoorden" → **"E-mail"**.
- Sidebar-badge telt **ongelezen / onbeantwoorde** e-mailthreads (niet losse berichten).

### Layout (spiegelt `ChatPanel`)
```text
┌────────────────────┬──────────────────────────────────────┐
│ 🔍 zoeken          │  Onderwerp / Klantnaam · BV-2606-001 │
│ ─ filters ─        │  ───────────────────────────────────│
│ ▾ BV-2606-0011  3● │  do 13:42  Klant → BV                 │
│   Familie Jansen   │  "Bedankt voor het programma..."     │
│ ▾ BV-2606-0007  1● │                                       │
│ ▾ Zonder project   │  wo 09:15  BV → Klant                 │
│   ─────────────    │  "Hierbij het voorstel..."           │
│ Gearchiveerd ▸     │                                       │
│                    │  [ Beantwoord ] [ Archiveer thread ] │
│                    │  ───────── composer ─────────────────│
└────────────────────┴──────────────────────────────────────┘
```

### Linkerkolom
- Groepering identiek aan chat: per project (programma/logies) met **referentienummer + klantnaam**, sortering = ongelezen/onbeantwoord eerst, daarna nieuwste e-mail.
- "Zonder project" bucket voor losse inbound mail die nog niet aan een dossier hangt (handmatig koppelen mogelijk via bestaande project-koppelactie).
- Rode pill `● N nieuw` voor onbeantwoorde threads; bold + lichte tint op ongelezen rijen.
- Filterchips: **Alles · Onbeantwoord · Gearchiveerd**. Globale zoekbalk over onderwerp + content + afzender.

### Rechterkolom (thread view)
- Volledige conversatie chronologisch (inbound + outbound uit `project_communications` + `email_log`), bubble-stijl met afzender/datum.
- Bijlagen tonen als kaartjes (al beschikbaar in `email_log.metadata`).
- Acties bovenin: "Naar project", "Archiveer thread", "Markeer als (on)beantwoord".
- Inline composer onderaan met dezelfde flow als `SendProjectEmailSheet` (Reply-To subaddressing blijft via Mailjet Parse webhook).
- Quoted reply: bestaande `buildQuotedBody` hergebruiken.

### Best practices die we meenemen
- **Sticky headers** per groep zoals al in chat.
- **Keyboard shortcuts**: `j/k` next/prev thread, `r` reply, `e` archive, `/` focus search.
- **Snelle markeer-acties** bij hover op een thread-rij (archive / mark unread) — geen modaal nodig.
- **Optimistic updates** voor markeer/archiveer zodat de lijst direct meebeweegt.
- **Realtime sync**: bestaande Supabase-kanalen op `project_communications` + `chat_messages` blijven; nieuwe row haalt thread automatisch terug.

---

## 3. Technische uitvoering (samenvatting)

1. **Migratie**
   - `program_requests.archived_at`, `accommodation_requests.archived_at`
   - `chat_conversations.archived_at`, `project_communications.archived_at`
   - Triggers: zet archived_at bij completion_status-overgang; reset bij nieuwe inbound chat/e-mail.
2. **Hooks**
   - `useAdminInbox` + `useAdminChat`: vervang harde `TERMINAL_COMPLETION_STATUSES`-filter door check op `archived_at` van project/conversation/e-mail.
   - Nieuwe `useEmailThreads` hook die `project_communications` groepeert per (project_id ?? contact_email) en thread-metadata teruggeeft (laatste bericht, unread count, archived).
3. **UI**
   - Nieuwe component `EmailPanel.tsx` (analoog aan `ChatPanel.tsx`) met 2-koloms layout, groepen, thread-detail en inline composer.
   - `AdminMessages.tsx`: tab "Te beantwoorden" → "E-mail", rendert `EmailPanel` i.p.v. `InboxToAnswer`. `InboxToAnswer` blijft voor de bell-dropdown.
   - Archive-knop in `ChatPanel` header voor handmatig chat-archief.
4. **Bell-dropdown** (`InboxBell`)
   - Telt op basis van dezelfde nieuwe filterlogica → na archivering verdwijnt het, bij nieuw bericht komt het terug.

---

## Out of scope (voorstel voor later)
- Volledige labelling/tagging van e-mails.
- Cross-project e-mail merge (zelfde afzender, verschillende projecten) — nu alleen per project gegroepeerd, "Zonder project" als vangnet.
- Bulk-archiveren met checkbox-selectie (kan in v2 als behoefte blijkt).
