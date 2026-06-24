
# Werkbank rust & overzicht — analyse + verbeterplan

## Wat er nu gebeurt (waarom het te veel voelt)

Er zijn drie parallelle signaalstromen die per project **stapelen** in de Inbox:

1. **`admin_todos`** — ~25 auto_types die door minstens 12 edge functions worden geschreven (`check-pending-items`, `update-customer-program`, `update-partner-item-status`, `notify-accommodation-quote`, `accept-quote-proposal`, `confirm-pending-commissions`, `inbound-email`, `cleanup-stale-todos`, etc.). Elk type heeft eigen drempels, eigen reminders en eigen sluit-logica.
2. **`projectCommunication`** — eigen status-as (`bij_bureau`, `wacht_op_partner`, `wacht_op_logies`, `wacht_op_klant`, `stilte`) met eigen 5-daagse stilte-drempel.
3. **`getInbox`** — voegt het samen, maar telt de twee bronnen **op** (score = todos + comm-state). Een dossier dat hoort bij "bij_bureau" krijgt naast die reden ook 3-7 todo-rijen voor dezelfde onderliggende actie ("nieuwe aanvraag", "stuur items naar partners", "akkoord ontvangen", "klant moet voorwaarden tekenen", "partner reageerde", …).

Resultaat: één dossier waar je net contact mee had, blijft 4× in de inbox poppen met varianten van dezelfde boodschap. De **stilte-drempel reset niet** op contact, alleen op outbound. Inbound mail of een chat-bericht telt nergens als "ik ben er mee bezig".

## Principes (less is more)

1. **Eén project = één rij** in de Inbox, ongeacht hoeveel todos/redenen er onder hangen.
2. **Recent contact = rust.** Als er binnen N dagen heen-of-weer-contact is geweest in het dossier (uitgaande mail, inkomende mail, chat-bericht, statuswijziging door klant/partner), dempen we alle niet-urgente signalen.
3. **Eén "next action" per dossier** in plaats van een lijst van 7 redenen.
4. **Todos volgen het dossier**, niet andersom. Een todo verbergen ≠ todo sluiten — alleen de zichtbaarheid wordt aangepast.

## Voorstel

### A. Dossier-cooldown bij recent contact

Nieuwe centrale functie `getProjectActivityState(project)` die kijkt naar:
- `program_requests.updated_at` / `last_outbound_at`
- laatst ingekomen `project_communications` (zowel inbound als outbound, mail én chat)
- laatste partner/klant-statuswijziging (`program_request_items.updated_at` waar `updated_at > X`)

Geeft terug:
- `lastContactAt` (max van alle bovenstaande)
- `cooldownLevel`: `"hot"` (≤2 dagen contact), `"warm"` (≤7), `"cold"` (>7).

### B. Inbox-onderdrukking op cooldown

Pas `loadInbox` en de afgeleide `projectCommunication`-state aan:

| Cooldown | Gedrag in Inbox |
|---|---|
| **hot** (≤2 dagen contact) | Alleen `urgent`-todos of harde deadlines (verlopen offertes, factuur-deadline overschreden) komen door. Status-as wordt forced naar `klaar` voor weergave, behalve bij urgent. |
| **warm** (3-7 dagen) | Toon één samengevatte rij, max één "next action". Reminders (`partner_reminder`, `quote_pending_partner`, `quote_pending_customer`, `request_no_response`, `customer_status_email_due`, `customer_status_update_due`) worden uitgesteld tot warm voorbij is. |
| **cold** (>7 dagen) | Huidige logica + stilte-flag. Hier mag het volle pakket aan reminders zichtbaar zijn. |

Belangrijk: todos blijven gewoon in de DB en blijven open. We **tonen** ze alleen niet — telling op het dossier zegt "+3 stille opvolgsignalen". Eén klik op de rij in `ProjectDetailPanel` toont ze nog steeds volledig.

### C. Samenvoegen van overlappende auto_types

Veel auto_types beschrijven hetzelfde moment in de pipeline. Voorstel om **te clusteren** voor inbox-weergave (DB blijft granulair voor logging):

| Cluster | Bestaande auto_types |
|---|---|
| `next_action.bureau` | `new_request_received`, `new_accommodation_request`, `quote_ready_to_send`, `send_items_to_partners`, `bureau_item_pricing`, `forward_accommodation_quote` |
| `awaiting.partner` | `quote_pending_partner`, `partner_reminder`, `quote_expiring_soon`, `quote_expired_partner` |
| `awaiting.customer` | `quote_pending_customer`, `terms_reminder`, `request_no_response`, `customer_inputs_missing`, `customer_status_email_due`, `customer_status_update_due` |
| `post_execution` | `post_execution_feedback`, `post_execution_invoice_check`, `customer_aftersales`, `invoicing_ready`, `commission_ready_to_invoice`, `accommodation_commission_ready` |
| `inbound` | `inbound_email`, `sales_inbox`, `purchase_invoice_inbox`, `quote_review`, `partner_status_update`, `accommodation_selected`, `customer_counter_proposal`, `all_partners_responded` |

Per cluster geldt: **max 1 rij/cluster/project** in de Inbox. De rij toont de hoogste prioriteit + "+N meer".

### D. Reminder-trottling

In `check-pending-items`: voeg de cooldown-check toe vóór elke `partner_reminder` / `quote_pending_*` / `customer_status_*` insert. Als het dossier "hot" is, geen nieuwe reminder. Dit voorkomt dat de reconcile-run elke nacht nieuwe todos genereert direct nadat we mailden.

Bovendien: bestaande reminders met `created_at < lastContactAt` worden bij de volgende reconcile automatisch gesloten met reden `superseded_by_contact`. Dat kost één extra regel in `reconcile-admin-todos`.

### E. Inbox-UI

`InboxList.tsx` wijzigingen:

- Per rij: één **statusbol** (uit communicatie-as) + één **next action**-zin in plaats van de huidige rij met badges + bureauActionHints + todo-bullets.
- Cooldown-icoontje wanneer `hot`/`warm`: ⏱ "Net contact gehad (2 d)" — geeft visueel rust en legt uit waarom de rij rustig is.
- Tab-teller bovenaan toont alleen `cold` + urgent (dat is de échte "moet ik nu iets mee"-stapel).
- Detail-paneel rechts laat onveranderd alle todos zien, inclusief de gedempte — daar mag granulair zijn.

### F. Wat we **niet** doen

- Geen auto_types verwijderen of mergen in de DB — logging/analytics blijft gelijk.
- Geen wijzigingen in partner-portal of klant-portal — dit is puur Werkbank-zijde.
- Geen aanpassingen aan de communicatie-state-machine zelf (alleen weergave dempen).

## Implementatie-volgorde

```text
1. src/lib/projectActivity.ts        nieuwe getProjectActivityState() + cooldown
2. src/lib/getInbox.ts               cluster-mapping + cooldown-suppression
3. src/components/admin/werkbank/
   InboxList.tsx                     één rij, één action, cooldown-pill
4. supabase/functions/
   check-pending-items/index.ts      cooldown-guard rond reminder-inserts
   reconcile-admin-todos/index.ts    superseded_by_contact close-rule
5. unit tests:
   src/lib/__tests__/
     projectActivity.test.ts         drempels hot/warm/cold
     getInbox.cooldown.test.ts       suppressie + cluster-merge
```

## Technische details

- **`project_communications`** wordt al geschreven door alle outbound/inbound mail-flows en chat. Geen schema-wijziging nodig — we lezen alleen `max(created_at)` per project.
- **Cooldown-drempels** worden constants (`HOT_DAYS = 2`, `WARM_DAYS = 7`), niet via `app_settings`, om dit eerst te valideren in de praktijk. Later eventueel verplaatsen.
- **Reconcile sluit-reden** `superseded_by_contact` komt erbij in de bestaande `reasons`-teller; admin ziet dit terug in de toast na "Reconcile uitvoeren".
- **Backwards-compat**: bestaande todos blijven werken, niets in DB-structuur verandert. Bij rollback verdwijnt alleen de suppressie-laag.

## Verwacht effect

- Dossiers waar net (≤2 d) contact mee was: **niet zichtbaar** in inbox, tenzij urgent.
- Dossiers met openstaande acties zonder recent contact: **één rij** met één duidelijke "next action".
- Geen nieuwe reminder-todos meer in de 2 dagen na een outbound/inbound contact-moment.
- Inbox-rijen-aantal naar verwachting 40-60% lager bij gelijk werkpakket.
