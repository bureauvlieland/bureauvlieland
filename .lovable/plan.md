## Doel
In het Communicatie-paneel van een project moet je op elk automatisch verstuurd bericht kunnen klikken om (1) het **volledige bericht** (subject + HTML body + ontvanger + tijdstip) te lezen en (2) het **opnieuw te versturen** naar dezelfde of een aangepaste ontvanger.

## Uitgangspunt
`email_log` bewaart nu alleen `subject` + metadata; de HTML/tekst van uitgaande e-mails wordt nergens opgeslagen. Zonder body kan je een bericht niet volledig terugzien of hersturen.

## Aanpak

### 1. Body opslaan in email_log
- Migratie: kolommen `html_body text` en `text_body text` toevoegen aan `public.email_log` (nullable, geen GRANT-wijziging nodig — bestaande policies dekken al).
- `supabase/functions/_shared/email-logger.ts`: `logEmail`-interface uitbreiden met optionele `html_body` / `text_body` en die opslaan.
- Alle edge functions die Mailjet aanroepen (send-*, notify-*, publish-program-changes, etc.) doorgeven van de reeds opgebouwde HTML naar `logEmail`. We voegen één shared helper toe (`buildEmailLogPayload`) zodat toekomstige templates automatisch de body meesturen.
- Historische rijen blijven zonder body — daar tonen we in de UI een nette fallback ("Bericht-inhoud is niet bewaard vóór X datum").

### 2. Body ophalen naar de UI
- `useProjectCommunications`: `html_body`/`text_body` mee-selecteren en meegeven als extra veld op de `ProjectCommunication`-items (source `email_log`).

### 3. Detail-dialog met "Bekijk volledig bericht"
- Nieuw component `EmailLogDetailDialog.tsx` (shadcn `Dialog`) met:
  - Header: onderwerp + tijdstip + status-badges (verzonden/geopend/gebounced).
  - Ontvanger-blok (naam + e-mail + template-naam + actor).
  - Body: HTML gerenderd in een `iframe` sandbox (`sandbox="allow-same-origin"`, srcDoc = html_body). Fallback naar `<pre>` met text_body of "Niet beschikbaar".
  - Acties: **"Opnieuw versturen"**, **"Beantwoorden"**, **"Sluiten"**.
- In `ProjectCommunicationsCard.tsx`: extra actieknop "Bekijk" (icon `Eye`) naast Reply/Delete op elke rij; klik op onderwerp/preview opent ook de dialog.

### 4. Opnieuw versturen
- Nieuwe edge function `resend-email` (POST `{ email_log_id, override_recipient_email? }`).
  - Admin-only (verify JWT + `has_role(admin)`).
  - Leest de log-rij; als `html_body` leeg is → 409 met melding.
  - Verstuurt via bestaande Mailjet-client met dezelfde subject/html/text/reply-to en logt een **nieuwe** `email_log`-rij met `metadata.resend_of = original_id` + `actor = "admin → resend"`.
- Frontend hook `useResendEmail` (React Query mutation) die de function aanroept en de communicatielijst invalideert.
- In de dialog: knop "Opnieuw versturen" → optionele inline input om ontvanger aan te passen (default = origineel) → bevestiging + toast.

### 5. Fallback voor oude berichten zonder body
- "Opnieuw versturen" is uitgeschakeld met tooltip "Body niet bewaard — gebruik ‘Beantwoorden’ om handmatig een nieuwe mail op te stellen".
- "Beantwoorden" (bestaand) blijft werken en pre-fillt de composer met subject/ontvanger.

## Technische details
- Migratie:
  ```sql
  ALTER TABLE public.email_log
    ADD COLUMN IF NOT EXISTS html_body text,
    ADD COLUMN IF NOT EXISTS text_body text;
  ```
  Geen extra GRANTs nodig (kolommen erven bestaande table-grants); RLS ongewijzigd.
- `resend-email` gebruikt dezelfde Mailjet-config als `send-project-email` en logt met `template_name = original.metadata.template_name + "_resend"`.
- Body-rendering in iframe voorkomt CSS-lekken en XSS in het admin-scherm.
- Alle nieuwe edge function calls volgen bestaande logEmail-contract (template_name + actor verplicht).

## Bestanden
- Nieuw: `supabase/migrations/<ts>_email_log_body.sql`, `supabase/functions/resend-email/index.ts`, `src/components/admin/EmailLogDetailDialog.tsx`, `src/hooks/useResendEmail.ts`.
- Aangepast: `supabase/functions/_shared/email-logger.ts`, `src/hooks/useProjectCommunications.ts`, `src/components/admin/ProjectCommunicationsCard.tsx`, alle send-* edge functions die `logEmail` gebruiken (body meesturen).

## Buiten scope
- Terugvullen van body voor historische berichten (niet mogelijk zonder Mailjet-archief).
- Bulk-hersturen van meerdere berichten tegelijk.
