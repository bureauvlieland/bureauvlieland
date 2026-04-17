
The user sent an empty message but uploaded a screenshot showing the inbox with two forwarded emails (FW:) — both marked "Mislukt" with "Geen PDF-bijlage gevonden". The user forwarded invoices from their own Outlook/mail client, but the PDFs didn't make it through.

## Diagnose

When you **forward** an email in Outlook/Gmail, the original PDF attachment often:
1. Gets re-encoded as inline content within the forwarded message body, or
2. Gets stripped entirely if the forward is plain-text, or
3. Arrives via the existing `inbound-email` catch-all (which I extended to route `invoices@`/`inkoop@`/`facturen@` to the purchase-invoice flow) — but that catch-all uses Mailjet's **Parse API webhook payload format**, while the routing I added forwards the *raw payload* to `inbound-purchase-invoice`. Both functions expect the same Mailjet payload shape, so attachments should pass through if Mailjet itself received them.

The most likely root causes:
1. **Mailjet Parse isn't configured yet** for `invoices@reply.bureauvlieland.nl` — so the mail arrived via the existing catch-all (`reply+...@`), but the user mailed to `invoices@` directly which has no Parse rule → went to a different path or was processed differently.
2. **The forwarded mail's attachment is encoded differently** — Mailjet Parse exposes attachments via `Attachments` array + `Parts` map (base64). If forwarded as inline `message/rfc822` or as `Content-Disposition: inline`, our filter `ct.includes("pdf") || fn.endsWith(".pdf")` may miss it.
3. **The `inbound-email` route I added forwards the payload but doesn't log what it sees** — making debugging hard.

I need to read the current `inbound-email/index.ts` and `inbound-purchase-invoice/index.ts` to see exactly what's happening, plus check edge function logs for the actual payload structure of these failed mails.

## Plan

### 1. Inspect logs first (after approval)
Pull recent logs of `inbound-email` and `inbound-purchase-invoice` to see the exact Mailjet payload the failed mails produced — specifically what's in `Attachments`, `Parts`, and whether the PDF arrived as an inline forwarded part.

### 2. Improve attachment detection in `inbound-purchase-invoice`
- Broaden the filter: also accept `application/octet-stream` when filename ends `.pdf`, plus check `Content-Disposition`.
- Walk **all** keys in `Parts` (not just those listed in `Attachments`) and detect PDFs by filename or content-type.
- Also handle **nested forwarded `message/rfc822`** parts: when present, recursively scan their attachments.
- Decode both base64 and `Headers.Content-Transfer-Encoding=base64` variants.

### 3. Better error messages in inbox
Instead of generic "Geen PDF-bijlage gevonden", capture and store:
- List of attachment filenames+content-types Mailjet did send
- Whether the mail was a forward (subject starts with `FW:`/`Fwd:`)
- A hint: "Forward gedetecteerd zonder bijlage — stuur de mail opnieuw als bijlage of zet PDF expliciet bij"

### 4. Reprocess existing failed inbox items
Add a "Opnieuw analyseren" button on failed items that re-fetches the original Mailjet payload — but since we don't store the raw payload, instead: store `raw_payload jsonb` going forward (and add a small column via migration). For the two existing failed items, the user can simply re-forward.

### 5. Add a diagnostic console log dump
In the inbound function, on failure log the full payload keys + attachment metadata so future failures are debuggable in one click.

### Files to change
- `supabase/functions/inbound-purchase-invoice/index.ts` — broader attachment detection, recursive forwarded-mail handling, richer error messages, payload logging
- `supabase/functions/inbound-email/index.ts` — log routing decisions for purchase-invoice forwards
- `supabase/migrations/<new>.sql` — add `raw_payload jsonb` column to `purchase_invoice_inbox` for future debugging

### Out of scope
- Reprocessing the two existing failed inbox items (user re-forwards)
- Mailjet Parse rule setup (separate; user has the PowerShell command already)

### Open question
Is Mailjet Parse already configured for `invoices@reply.bureauvlieland.nl`, or are these mails arriving via the catch-all `reply+...` route I extended? The fix differs slightly. I'll check logs after approval — no need to ask now, the fix covers both.
