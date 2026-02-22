

# Admin Chat Inbox verbeteren + koppeling aan projectcommunicatie

## Wat verandert er?

De huidige admin chatpagina wordt uitgebreid met drie verbeteringen:

1. **Inbox met status-tabs** -- Gesprekken worden gegroepeerd in tabs: "Onbeantwoord", "Actief" en "Gesloten", zodat je direct ziet welke chats aandacht nodig hebben
2. **Koppeling aan project/partner zichtbaar** -- Bij elk gesprek wordt getoond of het gekoppeld is aan een project (via `request_id`) of partner (via `source_partner_id`), met een directe link ernaartoe
3. **Chat opslaan als projectcommunicatie** -- Een knop "Opslaan bij project" in de chatheader slaat de volledige chatgeschiedenis op als communicatie-item in `project_communications`, zodat het terugkomt in de projecttijdlijn

## Gebruikerservaring

1. Admin opent /admin/chat en ziet bovenaan tabs: **Onbeantwoord** (met teller), **Actief**, **Gesloten**
2. In de conversatielijst staat bij elk gesprek een label met de bron (Klantportaal / Partnerportaal) en, indien beschikbaar, een link naar het bijbehorende project
3. Bij het openen van een gesprek toont de header de naam, email, bron en een chipje met het projectnummer (klikbaar)
4. Via een knop "Opslaan bij project" kan de admin de chatgeschiedenis als notitie opslaan in de projectcommunicatie. Dit creëert een `project_communications` record van type `note` met de volledige chatinhoud

## Technische wijzigingen

### 1. `src/hooks/useAdminChat.ts`
- **Filteren op status**: Nieuwe state `statusFilter` ("waiting" | "active" | "closed" | "all") toevoegen
- Afgeleide conversatielijsten per tab berekenen op basis van `status`
- "Onbeantwoord" = gesprekken waar het laatste bericht van type `visitor` is en er geen `read_at` is
- **`saveChatToProject`**: Nieuwe functie die alle berichten van een conversatie samenvoegt tot een tekst en als `project_communications` record opslaat (type: `note`, direction: `internal`, subject: "Chat met [naam]")

### 2. `src/pages/admin/AdminChat.tsx`
- **Tabs toevoegen**: Boven de conversatielijst komen drie tabs met Shadcn `Tabs` component: "Onbeantwoord", "Actief", "Gesloten"
- **Onbeantwoord-teller**: Badge op de tab "Onbeantwoord" met het aantal
- **Projectlink in conversatie-item**: Als `request_id` beschikbaar is, toon een klein projectnummer-chipje (ophalen via een query op `program_requests` voor het referentienummer)
- **Chatheader uitbreiden**: Projectlink en "Opslaan bij project" knop toevoegen
- **"Opslaan bij project" knop**: Opent een bevestigingsdialog, roept `saveChatToProject` aan, en toont een succesmelding

### 3. `src/hooks/useAdminChat.ts` -- `saveChatToProject` functie
```
saveChatToProject(conversationId):
  1. Haal alle berichten op voor de conversatie
  2. Format ze als leesbare tekst:
     "[HH:mm] Naam: bericht"
  3. Insert in project_communications:
     - request_id: conversation.request_id
     - communication_type: 'note'
     - direction: 'internal'
     - subject: 'Chat met [visitor_name]'
     - content: geformatteerde chatgeschiedenis
     - communication_date: conversation.created_at
```

### Geen database-wijzigingen nodig
- `chat_conversations` heeft al `request_id` en `source_partner_id` kolommen
- `project_communications` kan al `note` type records bevatten
- Alle benodigde RLS policies zijn al aanwezig

