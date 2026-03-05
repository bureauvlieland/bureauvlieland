

## Plan: Mailjet Parse API — Inkomende e-mails koppelen aan projecten

### Status: ✅ Geïmplementeerd

### Wat is gebouwd

1. **`buildReplyTo()` helper** in `_shared/email-templates.ts`: genereert dynamische Reply-To adressen zoals `reply+BV-2503-0012@bureauvlieland.nl`

2. **Consistente afzenderadressen**: Alle 7 `noreply@bureauvlieland.nl` referenties in `update-customer-program/index.ts` vervangen door `SENDER_EMAIL` (`hallo@bureauvlieland.nl`)

3. **Reply-To headers** toegevoegd aan 12 edge functions:
   - `send-project-email` (met reference_number lookup)
   - `send-quote-offer`
   - `approve-quote-item`
   - `update-customer-program`
   - `notify-accommodation-quote`
   - `select-accommodation-quote`
   - `cancel-program-request`
   - `process-completed-items`
   - `send-accommodation-quote-request` (import only, emails gaan naar partners)

4. **`inbound-email/index.ts`**: Nieuwe edge function die Mailjet Parse API POST's ontvangt:
   - Parseert referentienummer uit To-adres
   - Zoekt project op via `program_requests.reference_number` of `accommodation_requests.reference_number`
   - Slaat bericht op in `project_communications` (type: `email_in`, direction: `inbound`)
   - Maakt admin todo aan voor follow-up
   - Retourneert altijd 200 OK (voorkomt Mailjet retries)

5. **Admin UI**: Inbound e-mails tonen "Inkomend" badge in `ProjectCommunicationsCard`

### Handmatige configuratie vereist

1. **Mailjet Dashboard**: Parse API activeren
2. **Webhook URL**: `https://blhspuifehausilnzwio.supabase.co/functions/v1/inbound-email`
3. **DNS/Route**: Configureren voor `reply+*@bureauvlieland.nl`
