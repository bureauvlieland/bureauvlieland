## Doel

Voor de bureau-items "overtocht" (Doeksen) en "fietshuur" wil je per item een **boekingsnummer** en een **PDF** kunnen vastleggen, en een centraal **Tickets**-overzicht waarin je per afvaart de status, het boekingsnummer en de PDF ziet, en van waaruit je de tickets naar de klant kunt mailen.

---

## 1. Welke items tellen als "ticket"?

Bureau-items met een vaste set `block_id`'s (canonical):
- `boot-enkel-heen`, `boot-enkel-terug`, `boot-retour`, `bootretour-doeksen-groep` → categorie **Overtocht**
- `fiets-huur`, `fietshuur-weekend` → categorie **Fietshuur**

Eén centrale helper `isTicketItem(item)` zodat we overal hetzelfde detecteren (configurator-pinning, admin-detail, Tickets-overzicht). Lijst is uitbreidbaar in één bestand.

---

## 2. Datamodel (migratie op `program_request_items`)

Drie nieuwe velden:
- `booking_reference text` — boekingsnummer (Doeksen / bonnummer fietshuur), nullable
- `booking_document_path text` — pad in nieuwe storage bucket, nullable
- `booking_group_id uuid` — optioneel, om bv. heen+terug van dezelfde retourboeking te koppelen; leeg laten = "los"

Plus een nieuwe storage bucket **`ticket-documents`** (privé, alleen admins kunnen upload/download via signed URL). RLS zo dat alleen admins lezen/schrijven; klanten krijgen tickets per e-mail (geen directe portal-toegang).

Geen wijziging aan bestaande RLS-policies van `program_request_items`; de drie velden vallen onder de bestaande admin-update-policy.

---

## 3. Item-detail UI (admin projectdetail)

Bij elk ticket-item een compact blok **"Boeking"** tonen:
- Tekstveld **Boekingsnummer / bonnummer**
- Bestandsupload **PDF** (drag & drop, vervangbaar, met download-link)
- Optioneel selectveld **"Hoort bij dezelfde boeking als…"** met de andere ticket-items van hetzelfde project (vult `booking_group_id`); standaard leeg

Status-afleiding: **Geboekt** als `booking_reference` óf `booking_document_path` is gevuld, anders **Open** (= nog actie van jou).

---

## 4. Nieuwe pagina `/admin/tickets`

Sidebar-item **"Tickets"** in groep *Operationeel*, icoon `Ticket`, met badge = aantal items met status Open binnen X dagen vooruit (bv. komende 90 dagen). Route via standaard `AdminLayout`.

**Overzicht (tabel):**

| Datum afvaart | Project (ref + klant/bedrijf) | Type | Personen | Boekingsnummer | PDF | Status | Acties |

- **Datum afvaart** = `selected_dates[day_index]` van het project (bij heen day 0, bij terug laatste dag, bij fiets day 0). Sortering: oplopend op datum, dan op project, dan op type.
- Items met dezelfde `booking_group_id` worden visueel gegroepeerd (zelfde rij-achtergrond / kleine "groepslabel"). Bij leeg `booking_group_id` = los; staan toch vaak naast elkaar door datumsortering.
- **Filters bovenaan:** zoek (project/klant/ref/boekingsnummer), type (Overtocht / Fietshuur / alles), status (Open / Geboekt / alles), periode (komende 30/90 dagen / archief).
- **Acties per rij:**
  - Inline edit boekingsnummer (Enter = opslaan)
  - PDF upload / vervangen / downloaden
  - Knop **"Mail naar klant"** (zie §5)
  - Link naar het project

---

## 5. "Mail naar klant"-popup

Dialog met:
- **Aan** — vooringevuld op `customer_email` van het project, vrij aanpasbaar (kan ook eigen adres of meerdere zijn, comma-separated; client-side gevalideerd met zod)
- **Onderwerp** — vooringevuld, bv. *"Uw bootticket(s) Vlieland — boeking {ref}"*
- **Bericht** — vooringevuld template (formele "u"-vorm), aanpasbaar
- **Bijlagen** — automatisch de PDF van dit item; als `booking_group_id` is gezet, optie om PDF's van de hele groep mee te sturen (vinkjes per item, default aan)
- Knoppen **Annuleren** / **Verstuur**

Bij verzenden:
- Edge function `send-ticket-email` (nieuw) → Mailjet via bestaande transactionele infra; bijlage(n) als signed download (>10MB regel uit memory) of inline attachment (<10MB)
- Loggen via bestaande `logEmail`-contract met `template_name: 'ticket_to_customer'` en `actor: 'admin'`
- Toast bevestiging; in tabel timestamp **"Laatst gemaild: …"** tonen (extra kolom `ticket_last_emailed_at` op het item)

---

## 6. Sidebar-badge

In `AdminLayout` een nieuwe query `useOpenTicketsCount()` (komende 90 dagen, status Open) → toont aantal naast "Tickets". Refetch elke 60s, conform bestaande badges.

---

## Technische details (kort)

- Nieuwe helper `src/lib/ticketItems.ts` met `TICKET_BLOCK_IDS`, `isTicketItem`, `getTicketKind`, `getTicketDate(item, project)`.
- Nieuwe pagina `src/pages/admin/AdminTickets.tsx` + tabelcomponent `src/components/admin/tickets/TicketsTable.tsx` + dialoog `SendTicketEmailDialog.tsx`.
- Migratie: 3 kolommen + index op `(booking_group_id)`, storage bucket `ticket-documents` met admin-only RLS.
- Edge function `supabase/functions/send-ticket-email/index.ts` (Mailjet + signed URL fallback).
- Route in `src/App.tsx` + menu-entry in `AdminLayout.tsx` + titel-mapping (we hebben net `getAdminPageTitle` toegevoegd).
- Memory update: nieuwe core-rule "Ticket-items (ferry/fiets) hebben booking_reference + PDF; centraal beheerd in /admin/tickets".

---

## Wat ik **niet** doe (tenzij je het wilt)

- Geen klantportal-zicht op tickets — verzending is via e-mail.
- Geen automatische koppeling heen↔terug; je zet `booking_group_id` zelf óf laat leeg (jouw voorstel).
- Geen automatische sync met Doeksen-API voor boekingsnummers (handmatig invoeren).
