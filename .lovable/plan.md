

## Plan: Reply-To domein updaten naar reply.bureauvlieland.nl

### Probleem
Alle Reply-To adressen gebruiken `@bureauvlieland.nl`, maar Mailjet Parse API draait op het subdomein `reply.bureauvlieland.nl`. Hierdoor matchen de Reply-To adressen niet met de MX-records en komen antwoorden niet binnen.

### Wijzigingen

**3 bestanden, zelfde wijziging: `@bureauvlieland.nl` → `@reply.bureauvlieland.nl`**

1. **`supabase/functions/_shared/email-templates.ts`** (regel 284)
   - `buildReplyTo()`: `reply+${ref}@bureauvlieland.nl` → `reply+${ref}@reply.bureauvlieland.nl`

2. **`supabase/functions/send-customer-accommodation-message/index.ts`** (regel 143)
   - Hardcoded Reply-To: zelfde wijziging

3. **`supabase/functions/inbound-email/index.ts`** (regel 12, 15)
   - `extractReferenceNumber()` regex matcht al op `@` zonder domeincheck → geen wijziging nodig, maar comment updaten voor duidelijkheid

Na wijziging: alle 3 edge functions redeployen.

### Resultaat
Partner drukt op "beantwoorden" → mail gaat naar `reply+BV-2503-0012@reply.bureauvlieland.nl` → Mailjet MX-records vangen dit op → Parse API stuurt door naar inbound-email edge function.

