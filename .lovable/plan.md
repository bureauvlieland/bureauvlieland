# Logies-project tonen in admin chat

Op dit moment toont de admin-chat alleen een chip met het programma-referentienummer (uit `program_requests`). Wanneer een logies-partner (zoals Badhotel Bruin) vanuit een specifieke logies-aanvraag (bijv. "Deloitte") chat, is dat verband nergens zichtbaar — admin weet niet bij welk project de vraag hoort.

## Aanpak

### 1. Datamodel
- Migratie: `chat_conversations.accommodation_request_id uuid null references public.accommodation_requests(id) on delete set null` + index.
- Bestaande `request_id` (= `program_requests`) blijft ongemoeid; logies krijgt zijn eigen veld zodat de verwijzing eenduidig is en de juiste admin-route gebruikt kan worden.

### 2. Partnerportaal (chat-context meegeven)
- `ChatWidget` krijgt optionele prop `accommodationRequestId`.
- `useChat` accepteert + persist `accommodationRequestId` in `chat_conversations` (insert + matching bij hervatten).
- `PartnerLayout`: detecteer route `/partner/logies/:id` (via `useParams`/`useMatch`) en geef het id door aan `ChatWidget`. Voor `/partner/projecten/:id` blijft `requestId` werken zoals nu.

### 3. Admin chat-weergave
- `useConversationProjects` uitbreiden zodat het ook labels ophaalt voor `accommodation_request_id` (klantnaam + datum uit `accommodation_requests`, bijv. "Deloitte · 2 jul").
- `AdminChat` header: tweede chip naast de partner-chip, met `Bed`-icoon, die linkt naar `/admin/logies/:id` (mode: logies-detailpagina). Zelfde chip ook in `ChatConversationItem` sidebar onder de partnernaam.
- "Opslaan bij project"-actie ondersteunt straks ook logies (notitie op `accommodation_requests` i.p.v. `program_requests`). Als dit te veel scope is, valt deze knop terug op uitsluitend programma-projecten — chip-link blijft de primaire verbetering.

## Technische details

Bestanden:
- `supabase/migrations/<ts>_chat_accommodation_link.sql` — kolom + index.
- `src/integrations/supabase/types.ts` — auto-regen.
- `src/hooks/useChat.ts` — type + insert/match logica.
- `src/components/chat/ChatWidget.tsx` — extra prop doorzetten.
- `src/components/partner-portal/PartnerLayout.tsx` — route-detectie en prop meegeven.
- `src/hooks/useConversationProjects.ts` — extra fetch voor logies-labels; return type wordt `{ program?: string; accommodation?: { id; label } }` per conversation-id.
- `src/pages/admin/AdminChat.tsx` — extra chip in header + doorgeven aan `ChatConversationItem`.
- `src/components/admin/chat/ChatConversationItem.tsx` — render extra chip.

## Open vraag

Voor het "Opslaan bij project"-pad bij een logies-conversatie: wil je dat de chat als notitie op de logies-aanvraag wordt opgeslagen (extra werk), of laten we die knop voorlopig alleen werken voor programma-projecten en is een zichtbare link naar het logies-project genoeg? Ik ga uit van het laatste tenzij je anders aangeeft.
