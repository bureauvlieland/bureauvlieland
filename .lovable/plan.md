# Fix: "Opnieuw versturen" bij e-mails werkt niet meer

## Probleem (bevestigd)

De nieuwe `resend-email` edge function eist `html_body` of `text_body` op de `email_log`-rij. Van de 1008 rijen in `email_log` heeft **geen enkele** deze velden gevuld — alle ~30 sender edge-functions in `supabase/functions/**` roepen `logEmail(...)` zonder `html_body`/`text_body` te geven. Resultaat: elke resend faalt met HTTP 409 "De inhoud van dit bericht is niet bewaard".

## Aanpak

### 1. Reconstructie-fallback in `resend-email` (voor bestaande rijen)

Verwijder de harde 409-guard. Als `html_body` en `text_body` beide NULL zijn:
- probeer `email_templates` (op basis van `metadata.template_name` of `email_type`) te renderen met `metadata` als variabelen (zoals de vorige implementatie deed);
- als er geen template of onvoldoende variabelen zijn, val terug op een minimaal "her-verstuurd bericht"-HTML (subject + waarschuwing dat inhoud niet exact identiek is + originele metadata-preview) zodat de admin altijd kan doorsturen;
- de admin ziet in de UI (`EmailLogDetailDialog`) alleen "Opnieuw versturen" beschikbaar als er iets te versturen valt — die guard mag blijven, mits we voor legacy-rijen de knop weer inschakelen (zie punt 3).

### 2. Body persistent opslaan bij nieuwe sends

Wijzig alle sender edge-functions die `logEmail(...)` aanroepen (~30 functies, o.a. `send-quote-offer`, `send-items-to-partners`, `accept-quote-proposal`, `approve-quote-item`, `notify-partners-informational`, `send-quote-request`, `send-bureau-invoice-to-customer`, `notify-partner-cancellation`, `notify-partner-item-deletion`, `update-customer-program`, `update-partner-item-status`, `invite-partner`, `bulk-invite-partners`, `send-accommodation-request`, `send-accommodation-quote-request`, `notify-accommodation-quote`, `select-accommodation-quote`, `withdraw-accommodation-quote`, `send-customer-accommodation-message`, `send-partner-customer-message`, `send-project-email`, `send-customer-aftersales`, `send-guest-details-reminder`, `send-arrival-reminder`, `send-partner-headsup-t3`, `send-partner-mailing`, `send-partner-intro-email`, `send-ticket-email`, `send-partner-reset-email`, `resend-partner-invitation`, `admin-reset-partner-password`, `resend-customer-link`, `check-pending-items`, `process-completed-items`, `publish-program-changes`, `cancel-program-request`, `forward-bureau-invoice`, `forward-commission-invoice`, `forward-purchase-invoice`, `forward-purchase-invoice-outlook`, `register-partner-invoice`, `send-commission-invoice-to-partner`, `update-commission-status`, `notify-new-chat`, `notify-new-chat-reply`, `notify-headcount-change-bulk`, `notify-partner-headcount-change`, `notify-customer-price-change`, `notify-partner-price-change`, `notify-partners-missing-invoice-pdf`).

Voor elk: geef de reeds gebouwde `html`/`text` (die al aan Mailjet gaat) mee als `html_body`/`text_body` aan `logEmail`. Trivialiteit varieert per file (soms is er per-recipient een aparte body binnen dezelfde call).

### 3. UI: knop weer beschikbaar maken voor legacy-rijen

- `EmailLogDetailDialog`: `disabled={!hasBody && !isLegacy...}` versoepelen — de knop moet altijd klikbaar zijn zolang er een `email_log_id` is; de edge function beslist over de fallback.
- `PartnerNotificationsCard` en `ResendEmailDialog` hebben geen disable-guard nodig; alleen de foutafhandeling laten staan.

### 4. Tests / verificatie

- Handmatig: 1 oude email (uit vóór de wijziging) resend → moet slagen met fallback.
- 1 nieuwe email verzenden (bv. via `send-project-email`) → controleer dat `html_body` gevuld is in `email_log`.
- Resend van die nieuwe email → moet 1:1 dezelfde inhoud versturen.

## Impact / risico

- **Breed maar mechanisch**: veel bestanden, kleine wijziging per bestand (één extra veld aan `logEmail`).
- Reconstructie-fallback voorkomt dat historische rijen ooit nog blokkeren.
- Geen schema-wijziging nodig; kolommen bestaan al.

## Levering

1 PR met: `resend-email/index.ts` (fallback), ~30 sender-functies (`html_body`/`text_body` toevoegen), `EmailLogDetailDialog.tsx` (disabled-guard versoepelen). Deploy alle gewijzigde edge-functies.
