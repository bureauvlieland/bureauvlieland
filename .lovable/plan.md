## Doel

Op `/partner/facturatie` (tab "Nog te factureren") wil de partner per project één actie hebben: **"Markeer als gefactureerd via e-mail"**. Dit bevestigt dat de verzamelfactuur via e-mail naar `inkoop@reply.bureauvlieland.nl` is gestuurd. De onderdelen worden direct als gefactureerd geregistreerd — de PDF volgt automatisch via de inkoop-inbox (Mailjet Parse → koppeling op factuurnummer).

## Wijzigingen

### 1. `RegisterCollectivePartnerInvoiceDialog.tsx` — modus toevoegen
- Nieuwe prop `mode: "upload" | "email"` (default `"upload"`).
- In `mode = "email"`:
  - Titel: *"Markeer verzamelfactuur als verzonden via e-mail"*.
  - PDF-upload sectie wordt vervangen door een prominent amber blok:
    > "Je bevestigt dat je de factuur (#<nummer>) hebt verstuurd naar **inkoop@reply.bureauvlieland.nl**. Wij koppelen de PDF automatisch zodra hij binnenkomt."
  - `filePath` blijft leeg in de payload; PDF-validatie wordt overgeslagen.
  - Notes krijgen automatisch suffix: *"Factuur verzonden via e-mail naar inkoop@reply.bureauvlieland.nl"*.
- Submit-knop tekst: *"Bevestig verzending"* i.p.v. *"Registreer factuur"*.
- Rest (item-selectie, bedragen incl. BTW, commissie-berekening) blijft identiek.

### 2. `PartnerFinance.tsx` — tweede knop per projectkaart
- Naast de bestaande knop "Verzamelfactuur registreren" komt een variant-`outline` knop **"Gefactureerd via e-mail"** (icon: `Mail`).
- Beide knoppen openen dezelfde dialog; nieuwe state `collectiveMode: "upload" | "email"` bepaalt de modus.
- De algemene inkoop-inbox tip-banner blijft staan (context blijft duidelijk).

### 3. `register-partner-invoice` edge function — `via_email` flag
- Payload accepteert optioneel `viaEmail: boolean`.
- Als `viaEmail = true`:
  - `filePath` mag leeg zijn (validatie aanpassen).
  - `partner_purchase_invoices.registered_by` blijft `'partner'`, maar `status` wordt `'pending_email_match'` (nieuwe waarde, geen schema-wijziging — het is een vrij tekstveld).
  - `description` krijgt prefix `[via e-mail]` zodat admin het in de inkoopinbox direct herkent.
- Items worden gewoon gemarkeerd als gefactureerd (denormalized fields op `program_request_items` blijven werken zoals nu).

### 4. Memory update
- `mem://style/partner-invoice-dialog-rules` aanvullen: *"Partner heeft twee paden om te bevestigen: PDF uploaden in portal, of markeren als verzonden via inkoop-inbox. Bij e-mail-pad is PDF niet vereist; admin matcht binnenkomende mail later op factuurnummer."*

## Out of scope (nu niet)
- Automatische matching tussen `pending_email_match` rijen en inkomende Mailjet Parse mails (bestaat al voor de directe inbox-flow; werkt straks ook hier zolang factuurnummer overeenkomt).
- Admin UI-aanpassing voor de nieuwe status — bestaande inkoopfacturen-lijst toont 'm gewoon als status-label.

## Bestanden
- `src/components/partner-portal/RegisterCollectivePartnerInvoiceDialog.tsx` (edit)
- `src/pages/PartnerFinance.tsx` (edit)
- `supabase/functions/register-partner-invoice/index.ts` (edit)
- `mem://style/partner-invoice-dialog-rules` + `mem://index.md` (edit)
