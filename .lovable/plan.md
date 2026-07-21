## Doel
Partner kan een executed-item met "Registreer uw factuur" zelf uit de werkbank verwijderen als er geen factuur (meer) volgt — bijvoorbeeld omdat het buiten Bureau Vlieland om is afgehandeld, gratis was, of vervallen is. Admin behoudt volledig zicht.

## Aanpak

### 1. Database (migratie)
Nieuwe kolommen op `program_request_items`:
- `partner_dismissed_at timestamptz` — wanneer partner het item wegklikte
- `partner_dismissed_reason text` — vrije-tekst reden (max 500 tekens)

Geen aparte tabel; audit-spoor blijft binnen het item.

### 2. Edge function
Nieuwe function `dismiss-partner-invoice-item`:
- Input: `partnerToken`, `itemId`, `reason` (verplicht, ≥ 3 tekens)
- Valideert dat het item bij deze partner hoort én status `executed` heeft én nog géén `invoiced_number`
- Zet `partner_dismissed_at = now()`, `partner_dismissed_reason = reason`
- Logt regel in `project_communications` (type `partner_note`, zichtbaar voor admin) met de reden
- Sluit bijbehorende open admin-todos van type `partner_invoice_pending` voor dit item

### 3. Filter in `get-partner-dashboard`
`activeItems`-filter uitbreiden: items met `partner_dismissed_at != null` niet meer teruggeven.

### 4. UI partner-werkbank
In de "Factureren"-sectie, per rij:
- Extra secundaire knop **"Geen factuur — sluiten"** naast "Openen"
- Opent dialog: verplicht reden-veld + waarschuwingstekst dat admin dit ziet en het onderdeel daarna niet meer in de werkbank staat
- Na bevestigen: refetch dashboard, item verdwijnt

### 5. Admin-zichtbaarheid
In `AdminRequestDetail` bij het item-blok: als `partner_dismissed_at` is gezet → duidelijke amber banner "Partner heeft factureren gesloten op [datum] — reden: [tekst]" + knop "Heropenen" (zet velden op null) zodat admin het kan corrigeren.

### 6. Tests
- Vitest: guard-tests op nieuwe helper `canPartnerDismissInvoiceItem` (status executed, geen invoiced_number, geen dismiss al gezet)
- Deno: unit-test op edge function happy-path + rejection bij verkeerde partner / verkeerde status

## Bestanden
- **Nieuw**: `supabase/functions/dismiss-partner-invoice-item/index.ts`
- **Nieuw**: `src/lib/partnerInvoiceDismiss.ts` + test
- **Nieuw**: `src/components/partner/DismissInvoiceDialog.tsx`
- **Wijzig**: `supabase/functions/get-partner-dashboard/index.ts` (filter + select van nieuwe kolommen)
- **Wijzig**: `src/pages/PartnerDashboard.tsx` of het Werkbank-component (knop + dialog inhaken)
- **Wijzig**: `src/hooks/usePartnerDashboard.ts` (dismiss-actie)
- **Wijzig**: `src/pages/admin/AdminRequestDetail.tsx` (banner + heropenen)
- **Migratie**: kolommen toevoegen (geen policy-wijziging nodig; RLS staat al goed)

## Buiten scope
- Automatisch verbergen na X maanden — bewust niet, jij koos handmatig
- Reminder-mails naar partner — kunnen later apart
