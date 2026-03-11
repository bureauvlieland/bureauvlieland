

# Email log samenvoegen in Communicatie-tijdlijn

## Wat
Alle automatische systeem-e-mails (uit `email_log`) worden zichtbaar in het Communicatie-tabblad, samengevoegd met handmatige communicatie. Bestaande projecten krijgen dit direct — het zijn dezelfde `email_log` records die al bestaan.

## Aanpak

### 1. Hook: `useProjectCommunications.ts`
- Tweede query toevoegen die `email_log` ophaalt gefilterd op `related_request_id` of `related_accommodation_id`
- Email log entries mappen naar hetzelfde formaat:
  - `communication_type: 'email_out'`, `direction: 'outbound'`
  - `subject`, `recipient_email` → `contact_email`, `recipient_name` → `contact_name`
  - `sent_at` → `communication_date`
  - Extra veld `source: 'email_log'` om ze te onderscheiden
  - `email_type` meegeven in metadata voor label (bijv. "Offerteaanvraag partner")
- Beide arrays mergen, sorteren op datum, dedupliceren (email_log items die al als `project_communications` bestaan overslaan op basis van gelijke `subject` + `contact_email` + tijdstip binnen 1 minuut)

### 2. UI: `ProjectCommunicationsCard.tsx`
- Items met `source === 'email_log'` krijgen een subtiel "Automatisch" badge (paars/grijs)
- Delete-knop verbergen voor email_log items (read-only)
- `email_type` vertalen naar leesbaar Nederlands label (bijv. `partner_quote_request` → "Offerteaanvraag")

### 3. Type uitbreiding
- `ProjectCommunication` interface uitbreiden met optioneel `source?: 'manual' | 'email_log'` en `email_type?: string`

### Bestanden
- `src/types/projectCommunication.ts` — source + email_type velden
- `src/hooks/useProjectCommunications.ts` — extra query + merge
- `src/components/admin/ProjectCommunicationsCard.tsx` — badge + hide delete

Geen database-wijzigingen nodig — `email_log` bevat al alle data inclusief `related_request_id` en `related_accommodation_id`.

