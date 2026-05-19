## Doel

Stop met onaangekondigde live-wijzigingen in klant- en partnerportals. Admin-aanpassingen aan een programma worden lokaal verzameld als "pending changes" en pas live + per mail gecommuniceerd nadat jij in één keer op **Publiceer & notificeer** klikt.

## Huidige situatie

- Admin past tijd/dag/notitie aan in `AdminRequestDetail` → directe `update()` op `program_request_items`.
- Klant- en partnerportals lezen live uit dezelfde tabel → wijziging meteen zichtbaar.
- Geen mail bij admin-edits. Alleen klant-acties triggeren `update-customer-program`.

## Aanpak in het kort

Pending-laag bovenop de bestaande items. Wijzigingen worden opgeslagen in twee nieuwe kolommen (`pending_*`) zonder de live-kolommen (`preferred_time`, `confirmed_time`, `day_index`, etc.) te raken. Portals blijven de live-kolommen tonen. Een centrale "Wijzigingen"-balk in admin laat zien wat er klaarstaat. Eén knop publiceert alles tegelijk én verstuurt gebundelde mails.

## Scope

In scope: tijd, dag-volgorde, klant-notitie, toegevoegde/verwijderde items, aantal personen-override.
Buiten scope (gaat al via eigen flow): prijswijziging, status-transities, ferry/bike tickets, accommodatie-quotes.

## Datamodel

Nieuwe kolommen op `program_request_items`:

- `pending_preferred_time time` 
- `pending_day_index int`
- `pending_customer_notes text`
- `pending_override_people int`
- `pending_marked_for_removal boolean default false`
- `pending_added boolean default false` (voor net toegevoegde items die nog niet live mogen)
- `pending_changed_at timestamptz`
- `pending_changed_by uuid`

Plus per `program_requests`:

- `pending_changes_summary jsonb default '[]'` — wordt gebruld door de "Publiceer & notificeer"-dialoog (bevat snapshot van old → new per veld voor mail-body).
- `last_published_at timestamptz`

Nieuwe tabel `program_change_log` (voor changelog/audit):

- `id, request_id, item_id, field, old_value, new_value, changed_at, changed_by, published_at, notified_emails text[]`

## Admin UI

1. **Edit-gedrag wijzigt**: in `AdminRequestDetail` schrijft `handleSaveTime` (en vergelijkbare handlers voor dag/notitie/personen) voortaan naar `pending_*` kolommen i.p.v. de live kolommen. Geen `status_note`, geen `customer_approved_at` reset.
2. **Visuele markering**: items met pending changes krijgen een gele "ongepubliceerd"-badge + tooltip met old → new. Live waarde blijft erboven, pending eronder in kleiner.
3. **Sticky topbalk** op de detailpagina zodra er ≥1 pending change is:
   `[3 wijzigingen klaar]  [Bekijk]  [Verwerp wijzigingen]  [Publiceer & notificeer →]`
4. **Publiceer-dialoog** (nieuwe component `PublishChangesDialog`):
   - Lijst van wijzigingen (per item: wat verandert)
   - Per ontvanger een checkbox vooraf aangevinkt:
     - Klant (`customer_email`) — altijd zichtbaar
     - Per betrokken partner één regel met partner-naam + `contact_email`, alleen voor items waar die partner bij betrokken is
   - Optioneel vrij tekstveld "Toelichting in mail"
   - Knop **Publiceer & verstuur** → roept nieuwe edge function aan

## Edge function `publish-program-changes`

Service-role function. Input: `requestId`, `notifyCustomer: bool`, `notifyPartnerIds: string[]`, `adminNote?: string`.

1. Lees alle items met niet-null pending_* of pending_marked_for_removal/added.
2. Bouw per-ontvanger een changeset (klant ziet alle items; partner ziet alleen zijn eigen items).
3. Promoot pending → live in één transactie:
   - `preferred_time = pending_preferred_time` (en confirmed_time clear policy volgens bestaande regels in `update-customer-program`)
   - `day_index = pending_day_index`
   - `customer_notes = pending_customer_notes`
   - `override_people = pending_override_people`
   - DELETE waar `pending_marked_for_removal = true`
   - clear `pending_added` flag
   - clear alle `pending_*`
4. Append rows naar `program_change_log` met `published_at = now()`.
5. Update `program_requests.last_published_at`, leeg `pending_changes_summary`.
6. Render twee mail-templates:
   - **`program-changes-customer`** (formeel, "u") — overzicht alle wijzigingen + admin-toelichting + portallink.
   - **`program-changes-partner`** (informeel, "je") — alleen relevante items voor die partner, géén klant-PII (volgt bestaande privacy-regels).
7. Verstuur via Mailjet in batch zoals `update-customer-program` doet.
8. Log via `logEmail()` met verplichte `metadata.template_name` + `metadata.actor: "admin_publish_changes"` (volgens Email Logging Contract).

## Verwerp-flow

"Verwerp wijzigingen" → één RPC die alle `pending_*` velden naar NULL zet voor de request en pending_added items hard-delete't. Geen mails, geen log-entries.

## Edge cases

- **Pending op item dat ondertussen door klant is gewijzigd** (race): bij publiceren detecteer conflict (live waarde ≠ snapshot waar pending op gebaseerd was) → dialoog toont conflict-rij met "overschrijven of bewaren?".
- **Pending op item dat al `confirmed_time` heeft van partner**: publiceren = nieuwe tijd, clear `confirmed_time`, item gaat terug naar "in afstemming" zoals nu ook gebeurt in `update-customer-program`.
- **Partner heeft geen `contact_email`**: regel grijs + checkbox uit, met hint "geen e-mail bekend".
- **Geen ontvangers aangevinkt**: knop wordt "Publiceer zonder mail" met bevestiging — er wordt nog steeds gelogd in `program_change_log`.
- **Ferry/bike items en bureau-interne items** (`block_type = 'bureau'`): wel zichtbaar in pending-lijst, maar bij default uitgevinkt voor partner-notificatie (consistent met bestaande visibility-regels).

## Bestanden

- Migratie: nieuwe kolommen + `program_change_log` tabel + RLS (admin all, customer/partner read-only via bestaande request-tokens).
- `supabase/functions/publish-program-changes/index.ts` (nieuw).
- `supabase/functions/_shared/email-templates.ts`: twee nieuwe templates.
- `src/pages/admin/AdminRequestDetail.tsx`: handlers naar pending_* schrijven, sticky balk renderen.
- `src/components/admin/PublishChangesDialog.tsx` (nieuw).
- `src/components/admin/PendingChangeBadge.tsx` (nieuw, kleine UI helper).
- `src/hooks/usePendingChanges.ts` (nieuw, aggregeert per request).

## Niet doen

- Bestaande klant-flow (`update-customer-program`) niet aanraken — klant blijft direct publiceren bij eigen acties.
- Geen wijziging aan ferry/Doeksen-API logica.
- Geen bulk-mail of marketing — strikt transactioneel per request.
- Geen change in bestaande prijs-notificaties (`notify-partner-price-change` / `notify-customer-price-change`).

## Verificatie

- Tijd-edit in admin → portal toont oude tijd, badge verschijnt in admin.
- Publiceer → portal toont nieuwe tijd, klant + relevante partner krijgen één mail met alle wijzigingen, `email_log` heeft 2 entries met juiste `template_name`.
- Verwerp-knop reset alles zonder mail.
- Tweede edit na publiceren start nieuwe pending-batch.