## Probleem
Op `/admin/berichten` toont de tab **E-mail** een badge "3", terwijl er maar 1 chatmelding en (in dit geval) 2 onbeantwoorde inkomende e-mails zijn. Oorzaken:

1. **Verkeerde optelling** in `src/pages/admin/AdminMessages.tsx` (regel 126):
   `unansweredCount = unansweredEmailCount + chatTotalUnread` — de chat-teller wordt bij de e-mail-badge opgeteld én apart op de Chat-tab getoond (dubbeltelling).
2. **Geen directe manier om de onbeantwoorde e-mails te vinden**: `EmailPanel` heeft filterchips voor Alles/Inkomend/Handmatig/Automatisch, maar niet voor "Onbeantwoord". De 3 zitten verstopt in 25 gesprekken.

## Wijzigingen

### 1. Badge E-mail-tab correct maken
`src/pages/admin/AdminMessages.tsx`
- Toon op de E-mail-tab uitsluitend `unansweredEmailCount` (onbeantwoorde inbound project_communications).
- Verwijder `unansweredCount` (opgeteld) of hernoem, en gebruik alleen de twee losse counters op hun eigen tab.

### 2. Filterchip "Onbeantwoord" in EmailPanel
`src/components/admin/EmailPanel.tsx`
- Filterchips uitbreiden met een extra chip **"Onbeantwoord"** (naast Alles/Inkomend/Handmatig/Automatisch).
- Wanneer actief: toon alleen gesprekken met minstens één item waar `origin === "inbound"` en `!answered_at && !archived_at` (dezelfde conditie als `isUnread` op regel 233).
- Chip toont hetzelfde getal als de tab-badge, zodat de admin direct van "3 in de badge" naar "3 in de lijst" kan klikken.
- Optioneel: chip automatisch selecteren als de gebruiker via een `?filter=unanswered` URL binnenkomt (b.v. door op de tab-badge te klikken).

### 3. Tab-badge klikbaar naar filter (klein)
`src/pages/admin/AdminMessages.tsx`
- Als de gebruiker op de E-mail-tab klikt en er zijn onbeantwoorde e-mails, zet `?tab=inbox&filter=unanswered` zodat `EmailPanel` initieel op de nieuwe chip staat. (Alleen bij eerste activatie; daarna respecteert het de handmatige chipkeuze.)

## Technische details
- `useAdminInbox` blijft ongewijzigd; alleen de weergave in `AdminMessages.tsx` verandert.
- `EmailPanel` heeft al alle benodigde data (`answered_at`, `archived_at`, `origin`); er hoeft geen extra query bij.
- Geen backend-/RLS-wijzigingen.

## Niet in scope
- Wijzigingen aan hoe `answered_at` wordt gezet (dat blijft de bestaande "Beantwoorden"/"Archiveer"-logica).
- Wijzigingen aan de Chat-badgeberekening zelf.