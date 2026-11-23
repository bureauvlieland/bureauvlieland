# Nummering: dossiers, offertes en facturen

Status: gebouwd op 23 november 2026, naar de vraag van Erwin: "Vooral het
factuurnummer is een crime om in te vullen voor klanten. Wat is je voorstel
voor verandering in de breedte?" Migratie `20261123120000`.

## Het probleem

Vijf reeksen stapelden alle vijf "jaar-maand plus teller", en het
klantfactuurnummer stapelde daar het dossiernummer nog eens in:
`FV-BV-2611-0001-001`. Negentien tekens voor een klant die er maar een
handvol hoeft te kennen. Bovendien bedacht de browser dat nummer zelf door
de facturen van het project te tellen: geen unieke index, en al eens een pdf
met een nummer dat nooit geregistreerd werd. De commissiefactuur had een
eigen maandreeks (`BVC-JJMM-NNNN`); een factuur begon feitelijk per project
een nieuwe reeks bij 001, wat de boekhouder en de Belastingdienst
("opeenvolgend en uniek") niet helpt.

## De regel

| Wat | Nummer | Toegekend door |
|---|---|---|
| Dossier (project) | `BV-JJMM-NNNN`, ongewijzigd | trigger op `program_requests` |
| Offerte | geen eigen nummer: "offerte bij dossier BV-2611-0001, versie 2" | n.v.t. |
| Klantfactuur | **`JJNNNN`** (260041 = jaar 26, nummer 41) | `register_bureau_invoice` |
| Commissiefactuur | **`JJNNNN`**, dezelfde reeks | `finalize_commission_invoice` via `next_commission_invoice_number` |
| Inkoopfactuur partner | nummer van de partner (of `T-…`), ongewijzigd | partner |
| Betaalbatch | `BATCH-JJMM-NNNN`, intern, ongewijzigd | trigger |

- **Eén verkoopreeks per jaar, alleen cijfers.** Dicteerbaar, foutloos in
  een bank-app, geen O/0- of streepjesverwarring. Klant- en
  commissiefacturen zijn beide verkoopfacturen en delen de reeks; dat is
  het eenvoudigst voor Snelstart.
- **Het nummer draagt het dossier niet meer.** Het dossiernummer staat als
  apart veld "Dossier" op de factuur en de koppeling zit in
  `bureau_invoices.request_id`. Termijnen staan in de omschrijving
  ("Termijnfactuur 260041", "Restant na reeds gefactureerde termijn 260012").
- **De database kent het nummer toe**, in één transactie met kop en
  regels, pas bij versturen of registreren. Een concept heeft geen nummer
  ("Wordt toegekend bij versturen"). Weggegooide concepten laten dus geen
  gat; twee gelijktijdige registraties krijgen nooit hetzelfde nummer.
- **Bestaande nummers blijven staan.** `FV-…` en `BVC-…` worden nooit
  hernummerd; de nieuwe reeks start bij de eerstvolgende factuur. Alles
  wat nummers leest (bankmatching, Snelstart, mailrouting) herkent oud en
  nieuw.
- **Op de factuur staat als omschrijving alleen het nummer**, en de
  voorwaardenregel zegt "onder vermelding van 260041".

## Waar het staat

- **Database** (`20261123120000_factuurnummer-jaarreeks.sql`):
  `sales_invoice_sequences(year, last_seq)` met
  `next_sales_invoice_number(datum)` (vergrendeld via `INSERT … ON CONFLICT
  DO UPDATE`, vangnet tegen handmatig ingevoerde nummers in beide
  factuurtabellen). `next_commission_invoice_number(datum)` is een alias
  erop, zodat `finalize_commission_invoice` en `credit_commission_invoice`
  ongewijzigd doorwerken. Unieke index `bureau_invoices_invoice_number_key`
  (overgeslagen met een waarschuwing als er al dubbele nummers staan: dan
  eerst opschonen). RPC `register_bureau_invoice(p_header, p_lines)`:
  kop en regels in één transactie, nummer uit de reeks of, alleen om een
  elders gemaakte factuur vast te leggen, een meegegeven nummer; de tekst
  `{{nummer}}` in regelomschrijvingen wordt vervangen door het toegekende
  nummer. `commission_invoice_sequences` blijft staan voor de historie.
- **Frontend**: `src/lib/invoiceNumber.ts` (formaat, normalisatie,
  placeholder, label) en `src/lib/registerBureauInvoice.ts` (de RPC-aanroep).
  `AdminInvoicePreview` bedenkt geen nummers meer: een nieuwe factuur toont
  "Wordt toegekend bij versturen", een losse download heet "concept".
  `SendBureauInvoiceToCustomerDialog` registreert eerst (nummer), maakt dan
  de pdf met dat nummer en vult `{{nummer}}` in onderwerp en tekst in; de
  keuze "ook registreren" is weg, want zonder registratie is er geen nummer.
  `RegisterBureauInvoiceDialog`: nummerveld leeg = volgende uit de reeks.
  Pdf (`invoicePdfRenderer`): "Dossier" in plaats van "Klantnummer",
  omschrijving alleen het nummer.
- **Bankmatching** (`_shared/bankMatching.ts`): `textMentionsReference`
  vergelijkt zonder spaties, punten en streepjes, en eist voor een
  cijfernummer een los getal, zodat 260041 niet de cijfers van een IBAN of
  een datum raakt. Oude nummers blijven matchen.
- **Mailrouting** (`inbound-email`): `reply+260041@…` wordt herkend als
  antwoord op een commissiefactuur (klantfacturen gaan uit met het
  dossiernummer als Reply-To). Bestaat het nummer niet, dan "ignored" zoals
  voorheen.

## Wat niet veranderde, en waarom

- Het dossiernummer `BV-JJMM-NNNN` staat in mailonderwerpen, het
  partnerportaal, de digest en tientallen tests; klanten typen het zelden
  in. Verbouwen kost veel en levert weinig op.
- Offertes krijgen geen eigen reeks: een offerte is een versie van het
  dossier.

## Volgende stap

De grootste winst voor de klant zit buiten de nummering: een betaallink of
QR-code met vooringevuld kenmerk op de factuur, zodat er niets meer
ingetikt hoeft te worden. Dat kan los van deze wijziging.
