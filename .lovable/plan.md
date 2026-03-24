

## Plan: Klantnotificatie bij inkomend partnerantwoord

### Context
Het `partner_direct` model is verwijderd. Alle projecten draaien op `bureau_central`. De conditiecheck op `invoicing_mode` is daarom overbodig — klantnotificaties worden altijd verstuurd.

### Wijzigingen

**1. `supabase/functions/inbound-email/index.ts` — klantnotificatie toevoegen**

Na het opslaan van de communicatie en het aanmaken van de admin-todo:
- Haal `customer_email`, `customer_name` en `customer_company` op uit `program_requests` (request_id is al beschikbaar)
- Voor accommodatie-gerelateerde mails: haal ook de partnernaam op via `accommodation_quotes` + `partners`
- Stuur een notificatiemail naar de klant via Mailjet met:
  - Afzender: Bureau Vlieland
  - Reply-To: `reply+{referentie}@bureauvlieland.nl` (zodat klantantwoord ook in het dossier komt)
  - Inhoud: samenvatting van het partnerantwoord met context
- Log de mail in `email_log`
- Geen `invoicing_mode` check — altijd versturen

**2. Database migratie — nieuw e-mailtemplate `inbound_reply_to_customer`**

Template met variabelen:
- `customer_name`, `partner_name`, `reference_number`, `subject`, `message`, `portal_url`

### Mailjet Parse API configuratie (handmatig, door jou)

De edge function werkt (getest). Om Mailjet inkomende mails te laten doorsturen:

1. Mailjet dashboard → Account Settings → Parse API (of Transactional → Inbound)
2. Parse Route toevoegen:
   - URL: `https://blhspuifehausilnzwio.supabase.co/functions/v1/inbound-email`
   - Methode: POST (JSON)
3. MX-record voor subdomein (bv. `reply.bureauvlieland.nl`):
   - `MX 10 parse.mailjet.com.`
   - Dan Reply-To adressen aanpassen naar `reply+REF@reply.bureauvlieland.nl`

### Bestanden
1. `supabase/functions/inbound-email/index.ts` — klantnotificatie na opslaan
2. Database migratie — `inbound_reply_to_customer` template invoegen

