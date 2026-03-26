

## Plan: Alle URLs naar bureauvlieland.nl

### Probleem
Meerdere edge functions bevatten hardcoded `bureauvlieland.lovable.app` URLs. Dit moet overal `bureauvlieland.nl` zijn — dat is de productie-URL.

### Gevonden probleemlocaties

| Bestand | Regel | Huidig | Fix |
|---|---|---|---|
| `send-partner-reset-email/index.ts` | 74 | `supabaseUrl.replace(".supabase.co", ".lovable.app")` | `"https://bureauvlieland.nl/partner/reset-password"` |
| `notify-new-chat-reply/index.ts` | 65 | `"https://bureauvlieland.lovable.app"` | `"https://bureauvlieland.nl"` |
| `notify-new-chat/index.ts` | 80, 90 | `"https://bureauvlieland.lovable.app/admin/chat"` | `"https://bureauvlieland.nl/admin/chat"` |
| `invite-partner/index.ts` | 314 | fallback `"https://bureauvlieland.lovable.app"` | `"https://bureauvlieland.nl"` |
| `resend-email/index.ts` | 118 | fallback `"https://bureauvlieland.lovable.app"` | `"https://bureauvlieland.nl"` |
| `resend-partner-invitation/index.ts` | 242 | fallback `"https://bureauvlieland.lovable.app"` | `"https://bureauvlieland.nl"` |
| `bulk-invite-partners/index.ts` | 422 | fallback `"https://bureauvlieland.lovable.app"` | `"https://bureauvlieland.nl"` |

**Geen wijziging nodig:**
- `_shared/email-templates.ts` → `getPortalBaseUrl()` default al naar `bureauvlieland.nl` ✓
- `isTestMode()` → referentie naar `.lovable.app` is correct (voor test-detectie)
- `update-customer-program/index.ts` `PRODUCTION_DOMAINS` array → bevat `.lovable.app` naast `.nl`, is correct (beide zijn productie)

### Wijzigingen
7 edge functions aanpassen — alle hardcoded `.lovable.app` fallback/default URLs vervangen door `bureauvlieland.nl`. Deploy daarna alle gewijzigde functies.

### Bestanden
1. `supabase/functions/send-partner-reset-email/index.ts`
2. `supabase/functions/notify-new-chat-reply/index.ts`
3. `supabase/functions/notify-new-chat/index.ts`
4. `supabase/functions/invite-partner/index.ts`
5. `supabase/functions/resend-email/index.ts`
6. `supabase/functions/resend-partner-invitation/index.ts`
7. `supabase/functions/bulk-invite-partners/index.ts`

