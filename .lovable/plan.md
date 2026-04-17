

De gebruiker wil twee dingen:
1. Inkoopfacturen kunnen toevoegen vanuit `/admin/inkoopfacturen` (centrale plek), niet alleen vanuit het partner-portaal of project. Dan koppelen aan een project + optioneel aan een specifiek programma-item.
2. Bij het uploaden van de PDF: AI-scan die orderregels en bedragen (ex BTW, BTW, incl BTW) automatisch herkent en de velden voorinvult.

Bestaande situatie:
- Tabel `partner_purchase_invoices` bestaat al met velden: `request_id`, `item_id`, `partner_id`, `invoice_number`, `invoice_date`, `amount_excl_vat`, `vat_rate`, `vat_amount`, `amount_incl_vat`, `description`, `file_path`, `status`.
- Storage bucket `partner-invoices` bestaat (private).
- Hook `usePurchaseInvoices` met `createInvoice` mutation aanwezig.
- Component `PurchaseInvoicesCard` toont facturen per project (read + acties), maar **er is geen 'Toevoegen' UI op de admin-overzichtspagina**.
- Pagina `AdminPurchaseInvoices` bestaat (zie `src/pages/admin/AdminPurchaseInvoices.tsx`) — die heeft het lijstoverzicht, maar zonder add-flow.
- Lovable AI Gateway met Gemini Pro/Flash kan PDF's analyseren (multimodal). Geen extra API-key nodig.

## Plan

### 1. Nieuwe edge function: `scan-purchase-invoice`
- Input: base64 PDF (of storage path)
- Roept Lovable AI (`google/gemini-2.5-pro`) aan met de PDF en een gestructureerde prompt
- Output JSON:
  ```
  {
    invoice_number, invoice_date, supplier_name,
    amount_excl_vat, vat_rate, vat_amount, amount_incl_vat,
    description,
    line_items: [{ description, quantity, unit_price, total_excl_vat }]
  }
  ```
- Authenticatie: admin JWT verifiëren

### 2. Nieuwe dialog: `AddPurchaseInvoiceDialog`
Stappen:
1. **Upload PDF** → uploadt naar `partner-invoices` bucket → triggert AI-scan met progress indicator
2. **Verifieer & corrigeer** → gescande velden tonen in editable formulier:
   - Leverancier (partner-selector, met fuzzy match-suggestie op basis van gescande naam)
   - Project (combobox met `program_requests`, zoekbaar op referentienummer/klant)
   - Optioneel: koppel aan specifiek programma-item (dropdown filtert op gekozen project + partner)
   - Factuurnummer, datum, ex BTW, BTW%, BTW bedrag, incl BTW
   - Auto-recalc: bij wijziging ex BTW + BTW% → BTW bedrag en incl BTW automatisch herberekenen (lost ook het probleem op uit de eerdere screenshot)
   - Omschrijving + line items preview (read-only, in details collapse)
3. **Opslaan** → insert in `partner_purchase_invoices`

### 3. Aanpassingen aan `AdminPurchaseInvoices` pagina
- Knop "Inkoopfactuur toevoegen" rechtsboven → opent `AddPurchaseInvoiceDialog`
- Na opslaan: lijst refreshen

### 4. Bedragberekening fix (was eerdere klacht)
- Centrale helper `calculateVatAmounts(exclVat, vatRate)` met correcte afronding (2 decimalen)
- Hergebruiken in alle invoice-dialogs (admin én partner)

### Technisch
- Edge function gebruikt `LOVABLE_API_KEY` (al in secrets)
- Geen schemawijzigingen nodig — bestaande tabel dekt alles
- Storage upload pattern volgt bestaande convention (request_id/timestamp_filename.pdf)
- Helper-functie `calculateVatAmounts` in `src/lib/vatCalculation.ts`

### Buiten scope
- Echte SnelStart REST API-koppeling (eerder besproken, nog niet aanwezig)
- Bulk-upload van meerdere facturen tegelijk
- Automatisch matchen aan programma-items op basis van line items (kan later)

