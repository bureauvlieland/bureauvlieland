
# Pre-sales communicatiehub op de projectpagina

## Doel

Vanaf `/admin/projecten/:id` direct kunnen mailen en chatten met klant of betrokken partners — zonder verstopt achter een tab. Templates kiesbaar, per geadresseerde een eigen thread, antwoorden komen netjes terug via Mailjet inbound, en chatberichten triggeren een mailmelding aan de geadresseerde.

## Wat je krijgt

### Op de projectdetailpagina

Communicatiekaart wordt verplaatst van de tab naar een vaste positie boven de tabs (volle breedte, altijd zichtbaar). Header van de kaart heeft 4 actieknoppen:
- **"Mail klant"** — opent composer met klant prefilled
- **"Mail partner..."** — dropdown met alle betrokken partners uit de programma-items
- **"Chat openen"** — opent chat-sheet met de klant (en/of partner-keuze)
- **"Notitie loggen"** — bestaande functionaliteit

In de tijdlijn:
- **Thread-filter chips** bovenaan ("Alle • Klant • Partner X • ..."), afgeleid uit unieke `contact_email` waarden.
- Per item een **"Beantwoorden"**-knop die de composer opent met juiste recipient + "Re: " subject prefix.

De tab "Communicatie" verdwijnt; "Geschiedenis" blijft als aparte tab.

### Verbeterde mail-composer

`SendProjectEmailSheet` krijgt:
- **Template-select** met pre-sales templates (4 nieuwe: aanvraag opvolgen, verduidelijking wensen, voorstel komt eraan, partner-vraag) plus bestaande relevante.
- Bij keuze: subject + body worden ingevuld via een nieuwe edge function `render-email-template` die variabelen automatisch aanvult (`customer_name`, `reference_number`, `number_of_people`, `portal_url`, `event_date`).
- **Multi-recipient checkbox-lijst**: meerdere ontvangers in één keer mogelijk; per ontvanger gaat een aparte mail uit zodat thread-isolatie en `Reply-To: reply+REF@` per geadresseerde correct blijft.

### Chat → e-mailmelding aan klant

`notify-new-chat-reply` wordt uitgebreid: voor klant-portal conversaties wordt het customer_token van het gekoppelde project (`request_id` of `accommodation_id`) opgezocht, zodat de mail naar de klant een geldige `https://bureauvlieland.nl/klant/{token}` link bevat.

### Mailjet & inbound flow check

Ik heb je hierboven al een PowerShell-snippet gegeven om de Mailjet Parse-routes en MX-records van `reply.bureauvlieland.nl` te checken. Stuur de output door, dan valideer ik of de wildcard-route (`*@reply.bureauvlieland.nl` → `https://blhspuifehausilnzwio.supabase.co/functions/v1/inbound-email`) correct staat. `verify_jwt = false` voor `inbound-email` is al in `supabase/config.toml` aanwezig.

## Technische details

**Database (één migratie)**
- 4 nieuwe rijen in `email_templates` (presales_intake_followup, presales_clarification, presales_proposal_intro, presales_partner_question). RLS staat al INSERT toe voor admins, dus alleen rij-data toevoegen.

**Backend**
- Nieuwe edge function `render-email-template` (admin-only, gebruikt bestaande `getRenderedTemplate` shared util, vult variabelen aan vanuit `program_requests` / `accommodation_requests`). Returns `{ subject, body (plaintext), html }`.
- `notify-new-chat-reply` aanpassing: customer-portal pad bouwt `/klant/{customer_token}`-link i.p.v. generieke baseUrl.

**Frontend**
- `src/pages/admin/AdminRequestDetail.tsx`: Communicatie-tab verwijderen, `ProjectCommunicationsCard` boven tabs renderen.
- `src/components/admin/ProjectCommunicationsCard.tsx`: thread-filter chips, "Beantwoorden"-knop per item, chat-knop in toolbar, partner-dropdown.
- `src/components/admin/SendProjectEmailSheet.tsx`: template-select, multi-recipient lijst, loop over recipients bij submit.
- Nieuwe `src/components/admin/ProjectChatSheet.tsx`: hergebruikt `useAdminChat` met filter op `request_id`.

## Uit scope (later)

- Rich-text editor (v1 = plaintext + nieuwe regels).
- Bijlagen vanuit composer (kan via storage-link patroon later).
- Aparte inbox-pagina los van projecten.

## Vraag

Geen vragen meer — eerder al akkoord op (1) altijd-zichtbare communicatiekaart, (2) multi-recipient = aparte mails per ontvanger, (3) Mailjet check via PowerShell.
