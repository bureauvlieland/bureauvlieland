## Probleem

Snelstart verwerkt nu de PDF wel als document, maar leest de BTW-regels niet automatisch in. Dat komt doordat Snelstart een PDF visueel/OCR moet interpreteren — gestructureerde data (UBL XML) is veel betrouwbaarder. Daarnaast slaat Snelstart op dit moment ook het HTML-mailbericht zelf op als "e-mail.pdf", wat overbodige ruis is.

## Oplossing

1. **UBL 2.1 e-factuur (XML) als extra bijlage meesturen.** Snelstart herkent UBL automatisch en vult dan correct in:
   - Grootboekrekening (8000 — Omzet hoog)
   - BTW-tarief en BTW-bedrag per regel
   - Klantgegevens, factuurnummer, vervaldatum
   - Totalen excl/incl BTW
2. **De HTML-body sterk inkorten** tot één regel ("Zie bijlage voor de factuur") zodat Snelstart het mailbericht niet meer als waardevol document opslaat. PDF + UBL blijven de twee échte bijlagen.

## Wat er verandert

### Edge function `forward-bureau-invoice`
- Nieuwe helper `buildUblXml(invoice, request, billingLines)` die een geldige UBL 2.1 Invoice XML genereert volgens NLCIUS (Nederlandse standaard die Snelstart ondersteunt). Per factuurregel wordt `quantity`, `unit_price_excl_vat`, `vat_rate`, `vat_amount` ingevuld. Voor creditnota's wordt `CreditNote` (UBL CreditNote 2.1) gebruikt i.p.v. `Invoice`.
- De factuurregels worden opgehaald uit `program_item_billing_lines` (gekoppeld aan items van het project) zodat per regel de juiste BTW-categorie meegaat. Als die ontbreken, valt de XML terug op één samenvattende regel met het totaal en het BTW-tarief uit de bureau_invoice zelf.
- Twee bijlagen aan Mailjet meegeven:
  - `Factuur-{nummer}.pdf` (bestaande PDF)
  - `Factuur-{nummer}.xml` met `ContentType: "application/xml"` (UBL)
- HTML-body verkorten tot één regel + verwijzing naar de bijlagen (geen factuurtabel meer in de mail).

### `email_log.metadata`
- Toevoegen: `hasUblAttachment: true/false` voor traceerbaarheid in het dashboard.

### Frontend
Geen UI-wijzigingen nodig. De gebruiker klikt nog steeds gewoon op **Doorsturen** in de factuur-preview. PDF wordt clientside gegenereerd en meegestuurd; UBL wordt serverside in de edge function opgebouwd uit de database.

## Technische details

```text
Mailjet payload:
  Attachments: [
    { ContentType: "application/pdf", Filename: "Factuur-FV-BV-...pdf", Base64Content: <pdf> },
    { ContentType: "application/xml", Filename: "Factuur-FV-BV-...xml", Base64Content: <ubl> }
  ]

UBL hoofdvelden:
  cbc:CustomizationID  -> urn:cen.eu:en16931:2017#compliant#urn:fdc:nen.nl:nlcius:v1.0
  cbc:ID               -> invoice_number
  cbc:IssueDate        -> invoice_date
  cbc:DueDate          -> invoice_date + betalingstermijn (uit settings, fallback +14d)
  cbc:DocumentCurrencyCode -> EUR
  cac:AccountingSupplierParty -> Bureau Vlieland gegevens (uit app_settings)
  cac:AccountingCustomerParty -> klantgegevens uit program_requests
  cac:InvoiceLine[]    -> per billing_line
  cac:TaxTotal         -> BTW-bedrag
  cac:LegalMonetaryTotal -> totalen
```

## Te bevestigen door jou

- Bureau Vlieland's KvK-nummer en BTW-nummer voor in de UBL: heb je die in `app_settings` staan, of moet ik die eerst toevoegen? (Zonder deze twee weigert Snelstart UBL.)
- Mag ik aannemen dat de standaard betalingstermijn 14 dagen is (zoals nu in de factuurweergave: "Vervalt over 2 dagen" bij een factuur van 12 dagen oud)?

Na implementatie: één keer **Doorsturen** klikken bij FV-BV-2602-0006-001 en verifiëren in Snelstart dat de regels + BTW automatisch zijn ingevuld.
