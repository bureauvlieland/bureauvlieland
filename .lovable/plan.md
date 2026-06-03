
# Nacalculatie door partners + admin-verwerking

Partners (logies, catering, activiteiten) kunnen achteraf losse nacalculatie-regels opvoeren per project — denk aan p.m.-posten, meerverbruik of afwijkingen op de offerte. Die regels zijn niet zichtbaar voor de klant; alleen admin ziet ze, krijgt er een signaal van en kan ze met één klik (of na bewerking) als "Overige kosten" op het project zetten zodat ze meegaan in de factuur.

## Nieuwe tabel: `partner_post_charges`

Aparte laag — bestaande `quoted_price` op items blijft ongemoeid.

Kolommen:
- `id`, `created_at`, `updated_at`
- `partner_id` (text, fk partners)
- `request_id` (uuid, fk program_requests) — voor activiteiten/catering
- `accommodation_request_id` (uuid, nullable) — voor logies
- `related_item_id` (uuid, nullable) — optionele koppeling aan bestaand `program_request_items` of `accommodation_quote_extras`
- `description` (text), `notes` (text, optioneel)
- `amount_incl_vat` (numeric), `vat_rate` (numeric, default 21)
- `service_date` (date, optioneel)
- `status` (text): `submitted` → `processed` → `rejected`
- `processed_at`, `processed_by`, `processed_item_id` (uuid → program_request_items.id) — referentie naar het Overige-kosten item dat hieruit ontstond
- `reject_reason` (text, optioneel)

RLS:
- Partner: insert + select + update (alleen eigen, alleen zolang `status='submitted'`)
- Admin: full access
- GRANT volgens conventie

## Partnerportaal — Nacalculatie-blok

Op `PartnerProject.tsx` (activiteiten/catering) en `PartnerAccommodation.tsx` (logies) een nieuw sectie-blok "Nacalculatie / nabookingen":
- Lijst van eerder ingediende regels met status-badge (Ingediend / Verwerkt / Afgewezen)
- Knop "Regel toevoegen" → dialog met omschrijving, bedrag incl. BTW, BTW-tarief, datum (optioneel), notitie
- Tekstuele uitleg: "Voeg hier kosten toe die achteraf zijn ontstaan of afwijken van de offerte. Bureau Vlieland verwerkt deze in de eindfactuur."
- Verwijderen alleen mogelijk zolang status `submitted`

## Admin — signalering

Bij elke nieuwe `partner_post_charges` met `status='submitted'`:
1. **Auto-todo** in werkbank (`auto_type='partner_post_charge'`, `auto_entity_id=charge.id`) — titel: "Partner X: nacalculatie € … voor project Y"
2. **Badge op project** in `AdminProjectsOverview` en `AdminProjectDetail` — pill "N nacalculatie(s) te verwerken" (oranje)
3. **Sectie in Financieel Overzicht** op projectdetail: aparte kaart "Openstaande nacalculaties" boven de extra kosten

DB trigger op insert maakt de todo aan (vergelijkbaar met `create_todo_for_new_accommodation_request`).

## Admin — verwerken

In de nieuwe sectie per regel twee knoppen:
- **Overnemen** — maakt direct een `program_request_items` met `block_type='bureau'`, `day_index=-1`, `skip_partner_notification=true`, `provider_name=<partnernaam>`, `block_name=<description>`, `admin_price_override=<amount_incl_vat>`, `vat_rate=<vat>`, `admin_price_notes` verwijst naar partner + originele notitie. Zet charge op `processed` met `processed_item_id`. Sluit todo.
- **Bewerken & overnemen** — opent `AdminAddCostSheet` voorgevuld met bedrag/omschrijving/BTW/notitie; bij opslaan zelfde resultaat.
- **Afwijzen** — vraag reden, zet `status='rejected'`, sluit todo. Partner ziet de afwijzing + reden.

## Technisch

- Migratie: nieuwe tabel + RLS + GRANT + trigger voor auto-todo + trigger `update_updated_at_column`.
- `usePartnerPostCharges` hook (partner-kant) + `useAdminPostCharges` hook (admin-kant).
- Nieuwe componenten:
  - `src/components/partner-portal/PostChargesSection.tsx`
  - `src/components/partner-portal/AddPostChargeDialog.tsx`
  - `src/components/admin/PostChargesSection.tsx` (in projectdetail Facturatie-tab)
  - Hergebruik `AdminAddCostSheet` met nieuwe `prefill` prop + callback `onCreated(itemId)` om charge te markeren als processed.
- `AdminProjectsOverview`: badge-query meenemen (count van `submitted`).
- Email-notificatie: niet in v1 (todo + badge volstaat). Later eventueel toevoegen.

## Out of scope

- Bestandsuploads/bonnetjes bij nacalculatie (kan in v2)
- Klantzichtbaarheid van deze regels (blijft admin-only; ze komen wel ongelabeld op de eindfactuur via het Overige-kosten item)
- Automatisch matchen met bestaande items (admin koppelt handmatig indien gewenst via `related_item_id` veld in dialog)
