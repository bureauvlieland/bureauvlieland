

## Plan: Alle automatische mails testen — inconsistenties in test-mode

### Bevinding: Het Posthuys
Het Posthuys heeft de mail van 23 maart **wél ontvangen** — ze hebben op 29 maart een offerte ingediend via het partnerportaal. Vermoedelijk is de mail in spam beland of over het hoofd gezien. Het e-mailadres `info@posthuysvlieland.nl` is correct.

### Bevinding: Test-mode inconsistenties

Meerdere edge functions die e-mails versturen gebruiken **geen test-mode filtering**. Dit betekent dat in de preview-omgeving echte partners/klanten worden gemaild in plaats van alleen `erwin@bureauvlieland.nl`.

| Functie | Test-mode? | Risico |
|---|---|---|
| `send-program-request` | ✅ Ja | — |
| `send-items-to-partners` | ✅ Ja | — |
| `cancel-program-request` | ✅ Ja | — |
| `send-quote-offer` | ✅ Ja | — |
| `accept-quote-proposal` | ✅ Ja | — |
| `approve-quote-item` | ✅ Ja | — |
| `update-customer-program` | ✅ Ja | — |
| `process-completed-items` | ✅ Ja | — |
| `select-accommodation-quote` | ✅ Ja | — |
| `send-customer-accommodation-message` | ✅ Ja | — |
| **`send-accommodation-quote-request`** | ❌ Nee | Partners ontvangen testmails |
| **`notify-accommodation-quote`** | ❌ Nee | Klant ontvangt testmails |
| **`withdraw-accommodation-quote`** | ❌ Nee | Partners ontvangen testmails |
| **`update-partner-item-status`** | ❌ Nee | Klant ontvangt testmails |
| **`send-accommodation-request`** | ❌ Nee | Bureau + klant ontvangen testmails |
| **`send-quote-request`** | ❌ Nee | Bureau + klant ontvangen testmails |
| **`register-partner-invoice`** | ❌ Nee | Bureau ontvangt testmails |
| **`forward-purchase-invoice`** | ❌ Nee | Boekhouder ontvangt testmails |
| **`update-commission-status`** | ❌ Nee | Partners ontvangen testmails |
| **`notify-new-chat`** | ❌ Nee | Bureau ontvangt testmails |
| **`inbound-email`** | Gedeeltelijk | Klant wel, maar zonder origin |

### Voorstel

Test-mode filtering toevoegen aan alle 10 functies die dit missen. Per functie:
1. Import `getRecipientEmail`, `getSubjectPrefix` uit `_shared/email-templates.ts`
2. Gebruik `origin` parameter (uit body of header) om test-mode te bepalen
3. In test-mode: redirect alle e-mails naar `erwin@bureauvlieland.nl` en prefix subject met `[TEST]`

### Bestanden (10 edge functions aanpassen)
1. `supabase/functions/send-accommodation-quote-request/index.ts`
2. `supabase/functions/notify-accommodation-quote/index.ts`
3. `supabase/functions/withdraw-accommodation-quote/index.ts`
4. `supabase/functions/update-partner-item-status/index.ts`
5. `supabase/functions/send-accommodation-request/index.ts`
6. `supabase/functions/send-quote-request/index.ts`
7. `supabase/functions/register-partner-invoice/index.ts`
8. `supabase/functions/forward-purchase-invoice/index.ts`
9. `supabase/functions/update-commission-status/index.ts`
10. `supabase/functions/notify-new-chat/index.ts`

Na de code-aanpassingen moeten alle 10 functies opnieuw gedeployed worden.

