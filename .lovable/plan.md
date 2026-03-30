

## Plan: Berichtenfunctie admin ↔ logiespartner bij offerteaanvraag

### Doel
Vanuit de admin logies-detailpagina een bericht sturen naar een specifieke logiespartner over een aanvraag. Berichten worden twee-richtingsverkeer: de partner kan reageren. Alles wordt gelogd bij de aanvraag (communicatielog) en is zichtbaar in het partnerportaal.

### Aanpak
Het bestaande chat-systeem hergebruiken (chat_conversations + chat_messages), uitgebreid met een `accommodation_id` veld. Dit geeft realtime berichten, leesbevestigingen en e-mailnotificaties gratis mee.

### Database-migratie

**Tabel `chat_conversations` uitbreiden:**
- `accommodation_id UUID REFERENCES accommodation_requests(id)` — koppeling aan logiesaanvraag
- `quote_id UUID REFERENCES accommodation_quotes(id)` — koppeling aan specifieke offerte/partner

Dit maakt het mogelijk om per partner per aanvraag een gesprek te voeren, en berichten terug te tonen op de admin-detailpagina en in het partnerportaal.

### Deel 1: Admin — bericht sturen naar partner

**Nieuw component: `src/components/admin/AdminAccommodationChatSheet.tsx`**
- Sheet die opent vanuit een quote-kaart op de logies-detailpagina
- Toont bestaande berichten (chat-stijl) als er al een gesprek is
- Tekstveld om nieuw bericht te typen
- Bij eerste bericht: maakt automatisch een `chat_conversation` aan met:
  - `source: "partner_portal"`
  - `source_partner_id: partner.id`
  - `accommodation_id: request.id`
  - `quote_id: quote.id`
  - `visitor_name/email` van de partner
- Bericht wordt als `sender_type: "admin"` opgeslagen
- Triggert `notify-new-chat-reply` edge function voor e-mailnotificatie

**Integratie in `AdminAccommodationDetail.tsx`:**
- Per quote-kaart een "Bericht" knop (MessageSquare icoon) toevoegen
- Opent de chat-sheet voor die specifieke partner/quote

### Deel 2: Partner — berichten zien en reageren

**Aanpassen: `src/components/partner-portal/PartnerAccommodationRequestCard.tsx`**
- "Berichten" knop toevoegen die een chat-sheet opent
- Chat-sheet toont berichten gekoppeld aan de quote/aanvraag
- Partner kan reageren (sender_type: "visitor")
- Gebruikt bestaande `useChat` hook met aanpassing voor accommodation-context

**Nieuw component: `src/components/partner-portal/PartnerAccommodationChatSheet.tsx`**
- Herbruikbare chat-interface voor partner-logies-context
- Realtime updates via bestaand Supabase Realtime kanaal

### Deel 3: E-mailnotificatie bij nieuw bericht

**Aanpassen: `supabase/functions/notify-new-chat-reply/index.ts`**
- Als de conversatie een `accommodation_id` heeft: bouw een directe link naar het partnerportaal met de aanvraag
- Onderwerp: "Nieuw bericht inzake logiesaanvraag {reference_number}"
- Hergebruikt bestaande Mailjet-integratie en throttling (max 1 per 10 min)

**Aanpassen: `supabase/functions/notify-new-chat/index.ts`**
- Zelfde aanpassing voor berichten van partner naar admin

### Deel 4: Logging in communicatiedossier

**Aanpassen: `src/components/admin/ProjectCommunicationsCard.tsx`**
- Chat-berichten gekoppeld aan de accommodation_id ook weergeven in de tijdlijn
- Of: bij het sluiten van een gesprek automatisch opslaan als communicatie-entry (bestaand patroon in `saveChatToProject`)

### Bestanden

| Bestand | Actie |
|---|---|
| Database migratie | `accommodation_id` + `quote_id` kolommen op `chat_conversations` |
| `src/components/admin/AdminAccommodationChatSheet.tsx` | Nieuw — chat-sheet voor admin |
| `src/pages/admin/AdminAccommodationDetail.tsx` | "Bericht" knop per quote-kaart |
| `src/components/partner-portal/PartnerAccommodationChatSheet.tsx` | Nieuw — chat-sheet voor partner |
| `src/components/partner-portal/PartnerAccommodationRequestCard.tsx` | "Berichten" knop toevoegen |
| `supabase/functions/notify-new-chat-reply/index.ts` | Accommodation-context in e-mail |
| `supabase/functions/notify-new-chat/index.ts` | Accommodation-context in admin-notificatie |
| `src/hooks/useChat.ts` | Optionele `accommodationId`/`quoteId` parameters toevoegen |

