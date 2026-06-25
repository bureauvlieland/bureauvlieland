## Probleem

De E-mail-tab in het Berichtencentrum laat lang niet alles zien. Er zijn twee oorzaken:

### 1. Filter-bug in `EmailPanel.tsx`
De panel-query filtert op `communication_type IN ('email')`. In de database komen e-mails echter binnen onder drie types:

| communication_type | direction | aantal (90d) |
|---|---|---|
| `email` | outbound | 12 |
| `email_in` | inbound | **32** |
| `email_out` | outbound | **83** |

→ 115 van de 127 e-mails (inbound antwoorden + de meeste handmatige verzendingen) worden nu **uitgefilterd**. Daarom zie je vrijwel alleen jouw eigen verzendingen, en zelfs daarvan niet alles.

### 2. Transactionele e-mails ontbreken volledig
E-mails die het systeem automatisch verstuurt (offerte-mail, partner-uitvraag, annulering, herinneringen, etc. — laatste 30 dagen ~470 stuks in `email_log`) worden alleen gelogd in `email_log` en **niet** in `project_communications`. Daardoor mis je in het Berichtencentrum o.a.:

- offerte-mails naar klanten
- aanvragen naar partners
- annulering-/wijzigingsmails
- herinneringen
- factuur-doorzendingen

## Oplossing

### A. Filter-fix (root cause van "alleen mijn mails")
In `EmailPanel.tsx` de filter verbreden naar `communication_type IN ('email', 'email_in', 'email_out')`. Daarmee verschijnen alle handmatig verstuurde mails én alle inkomende antwoorden direct in het overzicht en bij het juiste project gegroepeerd.

### B. Transactionele mails meenemen
`email_log` als tweede bron toevoegen aan `fetchEmails()` en mergen op project (via `related_request_id` / `related_accommodation_id`). Per regel een herkomst-label:

- **Handmatig** — door admin verstuurd vanuit project (`project_communications` outbound)
- **Automatisch** — systeem-trigger (`email_log` met `email_type` ≠ `admin_project_email`)
- **Inkomend** — antwoord van klant/partner (`project_communications` inbound)

In de threadweergave krijgt elk bericht een klein label met type + ontvanger, zodat in één tijdlijn zichtbaar is: "offerte verstuurd → klant antwoordt → admin reageert handmatig → herinnering automatisch verzonden".

### C. Visuele tweaks
- Filter-chips bovenaan de lijst: `Alles · Handmatig · Automatisch · Inkomend` (default Alles).
- Badge per thread met telling per type, bijv. `3 ↓ · 5 ↑ auto · 2 ↑ handmatig`.
- Inbound-bel/`useAdminInbox` blijft ongewijzigd (toont alleen onbeantwoorde inbound = correct gedrag).

## Scope

- `src/components/admin/EmailPanel.tsx` — filter verbreden, `email_log` mergen, herkomst-labels, filter-chips.
- Geen schemawijzigingen, geen edge function changes, geen impact op verzendlogica.

## Verificatie

1. SQL-check vooraf: tel per project alle rijen uit beide bronnen → moet overeenkomen met wat de panel toont.
2. Open een recent project met bekende transactionele mail (bijv. offerte verstuurd): controleer dat hij verschijnt met label "Automatisch".
3. Open een project met inkomende reply: controleer dat de reply nu zichtbaar is met label "Inkomend".
