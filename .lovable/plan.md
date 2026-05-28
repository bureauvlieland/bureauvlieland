# SEPA Betaalbatch voor ING

Genereer een **pain.001.001.03** XML-bestand dat je in Mijn ING Zakelijk kunt uploaden om alle openstaande inkoopfacturen in één keer te betalen.

## 1. Database

**Migratie 1 — `partners`:**
- Voeg toe: `iban text`, `bic text` (optioneel; binnen NL niet nodig).

**Migratie 2 — `partner_purchase_invoices`:**
- Voeg toe: `payment_batch_id uuid` (nullable, FK naar nieuwe tabel) — markeert factuur als "in een batch opgenomen".
- Behoud bestaande `status` (blijft `forwarded` totdat admin handmatig op `paid` zet).

**Migratie 3 — Nieuwe tabel `payment_batches`:**
- `id`, `batch_reference` (auto: `BATCH-YYMM-NNNN`), `created_by`, `created_at`
- `requested_execution_date date`
- `total_amount numeric`, `transaction_count int`
- `xml_file_path text` (in nieuwe storage bucket `payment-batches`)
- `status text` (`generated` | `cancelled`)
- RLS: alleen admin
- GRANTs voor authenticated + service_role

**Storage bucket:** `payment-batches` (private, admin-only).

## 2. Admin-instellingen (`app_settings`)

Nieuwe keys:
- `bureau_iban` — IBAN van Bureau Vlieland (debiteur in batch)
- `bureau_bic` — optioneel
- `bureau_account_name` — tenaamstelling

Toevoegen aan `/admin/instellingen` onder een nieuw blok "Betaalgegevens".

## 3. UI — `/admin/inkoopfacturen`

**Nieuwe sectie "Betaalbatch":**
- Tabel met inkoopfacturen waar `status = 'forwarded'` AND `payment_batch_id IS NULL` AND partner heeft IBAN.
- Default: alles aangevinkt. Per regel checkbox + waarschuwingsicoon als IBAN ontbreekt.
- Boven de tabel: datepicker "Uitvoeringsdatum" (default: eerstvolgende werkdag).
- Knop **"Genereer SEPA-bestand"** → roept edge function aan → download XML.

**Nieuwe tab "Betaalbatches":**
- Historie van gegenereerde batches: referentie, datum, bedrag, # transacties, link naar XML, lijst van facturen.
- Knop "Annuleer batch" (zet `status='cancelled'` en maakt `payment_batch_id` op facturen leeg, zodat ze opnieuw mee kunnen).

**Per inkoopfactuur (detail):**
- Badge "In batch BATCH-2605-0001" wanneer opgenomen.

**Partner-profiel (`/admin/partners/:id`):**
- IBAN/BIC velden toevoegen aan bewerk-formulier.

## 4. Edge function — `generate-payment-batch`

Input: `{ invoiceIds: string[], executionDate: string }`

Stappen:
1. Verifieer admin.
2. Laad facturen + partners (IBAN, naam).
3. Valideer: alle IBANs aanwezig + geldig (mod-97 check), geen factuur al in actieve batch.
4. Maak `payment_batches` record aan → krijg batch reference.
5. Bouw pain.001.001.03 XML (zie technisch).
6. Upload XML naar `payment-batches/{batch_id}.xml`.
7. Update facturen: `payment_batch_id = batch.id`.
8. Return: `{ batchId, xmlContent (base64), filename }`.

Frontend triggert download via blob.

## 5. Technisch — pain.001.001.03 structuur

```xml
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pain.001.001.03">
  <CstmrCdtTrfInitn>
    <GrpHdr>
      <MsgId>BATCH-2605-0001</MsgId>
      <CreDtTm>2026-05-28T14:30:00</CreDtTm>
      <NbOfTxs>5</NbOfTxs>
      <CtrlSum>1234.56</CtrlSum>
      <InitgPty><Nm>Bureau Vlieland</Nm></InitgPty>
    </GrpHdr>
    <PmtInf>
      <PmtInfId>BATCH-2605-0001-01</PmtInfId>
      <PmtMtd>TRF</PmtMtd>
      <BtchBookg>true</BtchBookg>
      <NbOfTxs>5</NbOfTxs>
      <CtrlSum>1234.56</CtrlSum>
      <PmtTpInf><SvcLvl><Cd>SEPA</Cd></SvcLvl></PmtTpInf>
      <ReqdExctnDt>2026-05-29</ReqdExctnDt>
      <Dbtr><Nm>Bureau Vlieland</Nm></Dbtr>
      <DbtrAcct><Id><IBAN>NL..BUREAU..</IBAN></Id></DbtrAcct>
      <DbtrAgt><FinInstnId><Othr><Id>NOTPROVIDED</Id></Othr></FinInstnId></DbtrAgt>
      <ChrgBr>SLEV</ChrgBr>
      <!-- per factuur: -->
      <CdtTrfTxInf>
        <PmtId><EndToEndId>INV-12345</EndToEndId></PmtId>
        <Amt><InstdAmt Ccy="EUR">250.00</InstdAmt></Amt>
        <Cdtr><Nm>Zeehondentochten Vlieland</Nm></Cdtr>
        <CdtrAcct><Id><IBAN>NL..PARTNER..</IBAN></Id></CdtrAcct>
        <RmtInf><Ustrd>Factuur INV-12345 - Project BV-2605-0042</Ustrd></RmtInf>
      </CdtTrfTxInf>
    </PmtInf>
  </CstmrCdtTrfInitn>
</Document>
```

Implementatie-details:
- XML genereren als template-string (geen externe lib nodig).
- Bedragen: `toFixed(2)`, geen duizendtalscheidingsteken.
- `EndToEndId`: max 35 chars, alleen `[A-Za-z0-9-]` → `invoice_number` saniteren.
- `Ustrd` (omschrijving): max 140 chars, format `Factuur {nr} - Project {ref}`.
- Naam crediteur: max 70 chars, strip diacrieten/special chars.
- IBAN-validatie via mod-97 algoritme (kleine helper).
- Bestandsnaam: `BureauVlieland_SEPA_BATCH-2605-0001_2026-05-29.xml`.

## 6. Workflow voor gebruiker

1. Forward inkoopfacturen naar Snelstart zoals nu (status → `forwarded`).
2. Vul IBAN in bij partners die er nog geen hebben (eenmalig).
3. Ga naar **Inkoopfacturen → Betaalbatch**, vink af wat je niet wilt meenemen.
4. Klik "Genereer SEPA-bestand" → download XML.
5. Upload XML in Mijn ING Zakelijk → controleer → ondertekenen.
6. Na bevestiging ING: zet facturen handmatig op `paid` (bestaand mechanisme).

## 7. Buiten scope (later)

- Automatisch op `paid` zetten via MT940-camt.053 import.
- Goedkeuringsworkflow met twee admins.
- Betaaldatum per factuur op basis van vervaldatum (vereist eerst `due_date` veld registreren).