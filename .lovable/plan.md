# Chat met klant vanuit Admin (Project + Werkbank)

## Doel
- Admin kan vanaf de **projectpagina** (`AdminRequestDetail`) én de **werkbank** (`AdminWerkbank` → `ProjectDetailPanel`) een chat openen met de klant.
- Bericht-historie is **gedeeld** met het klantportaal (`CustomerProgram` → `ChatWidget`): wat de admin verstuurt komt in dezelfde thread terecht en omgekeerd.
- De huidige losse chat-pagina (`/admin/chat`, `AdminChat.tsx`) blijft volledig bestaan en werkt ongewijzigd.

## Huidige situatie (uit verkenning)
- Component `src/components/admin/ProjectChatSheet.tsx` bestaat al en is gekoppeld aan `ProjectCommunicationsCard` op de admin-projectpagina.
- Maar: hij maakt nieuwe conversaties aan met `source = 'admin_project'`, terwijl het klantportaal (`useChat`) zoekt op `source = 'customer_portal'` + `source_token = program.customer_token`. **Daardoor zien klant en admin nu twee verschillende threads.**
- Werkbank-paneel (`ProjectDetailPanel`) heeft nog geen chat-knop.

## Aanpassingen

### 1. `ProjectChatSheet.tsx` — gedeelde thread garanderen
- Bij openen eerst `program_requests` ophalen voor `customer_token`, `customer_name`, `customer_email` (zodat aanroepers alleen `requestId` hoeven door te geven).
- Conversatie zoeken: `chat_conversations` waar `request_id = :requestId` (ongeacht source), nieuwste eerst.
- Ontbreekt er een conversatie? Aanmaken met:
  - `source = 'customer_portal'`
  - `source_token = program.customer_token`
  - `request_id`, `visitor_name`, `visitor_email`
- Hierdoor pikt het bestaande klantportaal-`ChatWidget` (filter op `source_token`) dezelfde thread op → één gedeelde geschiedenis.
- Props vereenvoudigen: `customerName`/`customerEmail` worden optioneel (fallback uit fetch).

### 2. Werkbank — chat-knop toevoegen
- In `src/components/admin/werkbank/ProjectDetailPanel.tsx`:
  - State `chatOpen`.
  - Knop "💬 Chat met klant" naast de bestaande "Open project"-knop in de header (alleen tonen als `project.hasProgram` / `project.id` bestaat).
  - `<ProjectChatSheet open={chatOpen} onOpenChange={setChatOpen} requestId={project.id} customerName={project.customer.name} customerEmail={project.customer.email} />`.

### 3. Admin-projectpagina — chat-knop prominent
- Bestaande integratie via `ProjectCommunicationsCard` blijft.
- Extra: kleine "Chat met klant"-knop in de header van `AdminRequestDetail` (naast bestaande acties) die hetzelfde sheet opent — voor snelle toegang zonder te scrollen naar de communicatiekaart.

### 4. Geen wijzigingen aan
- `src/pages/admin/AdminChat.tsx` en `useAdminChat` blijven ongemoeid.
- `useChat.ts` (klantportaal) blijft ongemoeid.
- Edge function `notify-new-chat-reply` blijft de e-mailnotificatie naar de klant verzorgen.

## Validatie
- Open een project in admin → klik "Chat met klant" → typ bericht.
- Open hetzelfde project in klantportaal → bericht verschijnt in `ChatWidget` (realtime).
- Klant antwoordt → admin ziet antwoord realtime in zowel project- als werkbank-sheet.
- Open `AdminWerkbank` → selecteer project → chatknop opent dezelfde thread.
- `/admin/chat` lijst toont conversatie nog steeds normaal.
