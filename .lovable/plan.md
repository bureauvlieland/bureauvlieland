## Doel

Naast de bestaande Mailjet-route een **Outlook-verzendmethode** toevoegen voor inkoopfacturen (zodat Snelstart ze wél als inkoopfactuur herkent), plus een **verzendlog per factuur** en de mogelijkheid om een factuur **opnieuw te versturen** via de gekozen methode.

---

## 1. Outlook-koppeling (Microsoft Graph via connector gateway)

- Microsoft Outlook connector aan workspace koppelen (`standard_connectors--connect` → `microsoft_outlook`). De OAuth-account die je koppelt wordt de afzender — kies dus jouw `hallo@bureauvlieland.nl` Microsoft 365 account.
- Geen rechtstreekse SMTP/Graph implementatie nodig; gateway handelt token-refresh af.

## 2. Nieuwe edge function `forward-purchase-invoice-outlook`

- Zelfde input als de bestaande Mailjet-versie (`invoiceId`, `includePdf`).
- Verstuurt via `POST /me/sendMail` op `https://connector-gateway.lovable.dev/microsoft_outlook` met:
  - From = de gekoppelde mailbox (Outlook bepaalt zelf)
  - To = `snelstart_email` uit `app_settings`
  - Subject + HTML body identiek aan huidige Mailjet versie (zonder `[TEST]` prefix in productie; preview-guard behouden)
  - PDF als `fileAttachment` (base64) wanneer `includePdf` en `file_path` aanwezig
- Logt naar `email_log` met `email_type: "purchase_invoice_forward"`, `metadata.template_name: "purchase_invoice_forward_outlook"`, `metadata.send_method: "outlook"`.
- Geen Mailjet headers → Snelstart parser ziet het als gewone zakelijke mail (Return-Path = jouw Outlook domein).

## 3. Bestaande `forward-purchase-invoice` (Mailjet)

- Ongewijzigd qua functionaliteit. Alleen `metadata.send_method: "mailjet"` toevoegen voor logfiltering.

## 4. UI — `ForwardToAccountingDialog`

- Radiokeuze bovenin:
  - **Outlook** (aanbevolen) — verstuurt vanuit `hallo@bureauvlieland.nl` via Microsoft 365
  - **Mailjet** — huidige route (fallback)
- Default = Outlook zodra de connector gekoppeld is, anders Mailjet.
- Knop "Doorsturen" roept de bijbehorende edge function aan.
- Toast toont gekozen methode.

## 5. Verzendlog in `PurchaseInvoicesCard`

Per factuurregel een nieuwe "Geschiedenis" popover (klok-icoon) die alle `email_log` rijen toont waar `metadata->>invoiceId = invoice.id` en `email_type = 'purchase_invoice_forward'`:

- Tijdstip
- Methode (Outlook / Mailjet) — badge
- Ontvanger
- Status (sent / failed)
- Mailjet/Graph message-id (klein, monospace)
- Of er een PDF was bijgevoegd

Nieuwe hook `useInvoiceForwardHistory(invoiceId)` die `email_log` query't (server-side filter via `.contains('metadata', { invoiceId })`).

## 6. Opnieuw versturen

- Bij elke logregel een knop "Opnieuw versturen" → opent dezelfde dialog, met methode voorgekozen op die van de eerdere poging (overschrijfbaar).
- Status van de factuur blijft `forwarded`; alleen extra log-entry erbij.
- Bij `forwarded`-facturen toont de hoofdrij óók nog steeds de mail-knop (nu altijd zichtbaar, niet enkel `status === "pending"`), zodat opnieuw versturen vanuit elke status kan.

---

## Technische details

**Connector gateway call (vereenvoudigd):**
```ts
await fetch(`https://connector-gateway.lovable.dev/microsoft_outlook/me/sendMail`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`,
    "X-Connection-Api-Key": Deno.env.get("MICROSOFT_OUTLOOK_API_KEY"),
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    message: {
      subject, body: { contentType: "HTML", content: html },
      toRecipients: [{ emailAddress: { address: snelstartEmail }}],
      attachments: pdfBase64 ? [{
        "@odata.type": "#microsoft.graph.fileAttachment",
        name: fileName, contentType: "application/pdf", contentBytes: pdfBase64,
      }] : [],
    },
    saveToSentItems: true,
  }),
});
```

**email_log filter:** `select * from email_log where metadata->>'invoiceId' = $1 order by created_at desc`. Geen schemawijziging nodig; bestaande `metadata` JSONB kolom is voldoende.

**Geen DB-migratie nodig.**

---

## Te leveren

1. `standard_connectors--connect` voor `microsoft_outlook` (jij koppelt je Microsoft 365 account)
2. Nieuwe edge function `supabase/functions/forward-purchase-invoice-outlook/index.ts`
3. `forward-purchase-invoice/index.ts`: `metadata.send_method` toevoegen
4. `ForwardToAccountingDialog.tsx`: methode-radio + dispatch
5. Nieuwe `InvoiceForwardHistoryPopover.tsx` + `useInvoiceForwardHistory` hook
6. `PurchaseInvoicesCard.tsx`: historie-knop + mail-knop ook bij `forwarded`/`paid` tonen

Na implementatie kun je factuur 6 (Oliva) opnieuw versturen via Outlook en zou Snelstart 'm direct moeten oppakken.