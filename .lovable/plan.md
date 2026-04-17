

De gebruiker vraagt simpelweg waar ze naartoe moeten mailen voor de inkoopfactuur-inbox die we net gebouwd hebben.

Uit de eerder aangemaakte code:
- `inbound-purchase-invoice/index.ts` heeft als doeladres `invoices@reply.bureauvlieland.nl` (zoals getoond in `AdminPurchaseInvoiceInbox.tsx`)
- Mailjet Parse moet nog geconfigureerd worden door de gebruiker om dit adres te koppelen aan de webhook

Dit is een directe vraag — geen plan nodig, gewoon een antwoord. Maar instructies zeggen: in plan mode altijd presentation-plan. Ik geef een mini-plan met het antwoord en de configuratie-stappen.

## Antwoord

**Mailadres voor de inbox:** `invoices@reply.bureauvlieland.nl`

### Belangrijk: Mailjet Parse moet nog geconfigureerd worden

Op dit moment werkt het mailadres pas zodra je in Mailjet een Parse-regel aanmaakt die binnenkomende mails doorstuurt naar onze webhook.

**Stappen in Mailjet:**
1. Ga naar **Mailjet Dashboard → Account Settings → Parse API** (of: https://app.mailjet.com/parseapi)
2. Klik op **"Add a new Parse rule"**
3. Vul in:
   - **Email address:** `invoices@reply.bureauvlieland.nl`
   - **Webhook URL:** 
     ```
     https://blhspuifehausilnzwio.supabase.co/functions/v1/inbound-purchase-invoice
     ```
   - **API version:** v3
4. Opslaan

### Als Mailjet Parse niet wil meewerken (alternatief)

Je gaf eerder aan dat Mailjet Parse moeilijk te configureren is. Er bestaat al een werkende inbound-route via `reply+REF@reply.bureauvlieland.nl` (gebruikt door de project-mailflow). Ik kan die catch-all uitbreiden zodat ook mails naar bijvoorbeeld `reply+inkoop@reply.bureauvlieland.nl` (of gewoon `inkoop@…`) worden herkend en doorgezet naar de inkoopfactuur-inbox — zonder dat je een nieuwe Parse-regel hoeft aan te maken.

**Wil je dat ik die fallback inbouw?** Dan hoef je alleen je facturen door te sturen naar het bestaande inbound-adres en gaat alles automatisch.

### Test

Stuur een mail met PDF-bijlage naar het adres en kijk daarna op `/admin/inkoopfacturen/inbox` — daar moet binnen ~10 seconden een nieuw item verschijnen met automatische AI-scan.

