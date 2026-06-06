# Plan: PDF-upload optioneel maken + duplicaat-matching in inkoop-inbox

## 1. `RegisterCollectivePartnerInvoiceDialog.tsx` — PDF optioneel in e-mailmodus

- `validate()`: foutmelding "PDF is verplicht" alleen tonen als `!isEmailMode && !selectedFile`.
- `handleSubmit`: in e-mailmodus zonder bestand → geen upload, geen `filePath` meegeven aan de edge function.
- Upload-blok UI:
  - Normale modus: label blijft "PDF inkoopfactuur (verplicht)".
  - E-mailmodus: label wordt "PDF inkoopfactuur (optioneel)" met hint *"Heb je de factuur al gemaild naar de inkoop-inbox? Dan kun je dit overslaan — wij koppelen de PDF aan jouw registratie."*
- Amber-alert tekst aanpassen: maak duidelijk dat de PDF later vanuit de inkoop-inbox aan deze registratie wordt gekoppeld.

De edge function `register-accommodation-invoice` voegt al `[via e-mail]` toe aan de beschrijving — geen wijziging nodig.

## 2. `AdminPurchaseInvoices.tsx` — zichtbaar label voor "via e-mail"

- Detecteer beschrijvingen die met `[via e-mail]` beginnen.
- Toon een kleine `Mail`-badge naast het factuurnummer met tooltip: *"Geregistreerd via e-mail — PDF wordt verwacht in inkoop-inbox"*.
- Strip de `[via e-mail]`-prefix uit de zichtbare beschrijving (blijft wel in DB staan).
- De bestaande amber upload-knop (`setUploadPdfTarget`) blijft beschikbaar zodat admin alsnog handmatig een PDF kan koppelen.

## 3. `AdminPurchaseInvoiceInbox.tsx` — match-detectie & 1-klik PDF koppelen

Wanneer een inbox-item gescand is en er bestaat al een `partner_purchase_invoices`-rij met dezelfde `(partner_id, invoice_number)`:

- Toon een blauwe match-banner:
  *"Deze factuur is al door {partner} geregistreerd op {datum} voor project {ref}."*
- Twee acties:
  1. **"PDF koppelen aan bestaande registratie"** (primair) — zet `file_path` op de bestaande rij, markeert het inbox-item als `processed`, maakt géén nieuwe rij.
  2. **"Toch als nieuwe inkoopfactuur opslaan"** (secundair) — bestaande override, blijft werken.

Hiermee is de flow sluitend:
- Partner registreert via e-mailmodus (zonder PDF) → factuur staat in admin met `Mail`-badge.
- E-mail met PDF arriveert in inkoop-inbox → admin ziet match → 1-klik PDF aan bestaande registratie koppelen → géén dubbele inkoopfactuur.

## Out of scope

- Volledig automatisch matchen zonder admin-interventie.
- Database-wijzigingen (signaal `[via e-mail]` zit al in `description`; `file_path` kolom bestaat al).

## Geraakte files

- `src/components/partner-portal/RegisterCollectivePartnerInvoiceDialog.tsx`
- `src/components/admin/AdminPurchaseInvoices.tsx`
- `src/components/admin/AdminPurchaseInvoiceInbox.tsx`
