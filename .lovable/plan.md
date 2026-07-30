## Doel

Een inkoopfactuur die in een SEPA-betaalbatch is opgenomen, krijgt automatisch de status **betaald**. Nu blijft die op "doorgestuurd" staan: 30 van de 38 facturen zitten al in een batch maar tellen nog als onbetaald.

## Wat er verandert

**1. Bij genereren van de batch → betaald**
De batchgeneratie koppelt de facturen nu alleen aan de batch. Voortaan zet dezelfde stap in één keer ook de status op `paid` met `paid_at` op het moment van genereren. Alle bestaande controles (dubbele regels, terug te vorderen, IBAN, bedragafwijking, incasso-partners) blijven ongewijzigd vóór deze stap staan, dus een geblokkeerde batch markeert niets als betaald.

**2. Batch annuleren → terugdraaien**
Bij het annuleren van een batch worden de gekoppelde facturen niet alleen losgekoppeld, maar ook teruggezet naar "doorgestuurd" met een lege betaaldatum. Zo kan de factuur daarna weer in een nieuwe batch mee.

**3. Eenmalige correctie bestaande facturen**
De 30 facturen die al in een batch zitten maar nog op "doorgestuurd" staan, worden bijgewerkt naar "betaald", met als betaaldatum de gevraagde uitvoerdatum van hun batch (niet vandaag), zodat de historie klopt. Facturen in geannuleerde batches worden overgeslagen.

**4. Zichtbaarheid**
In het batchdetail (transactieoverzicht) en in de inkoopfacturenlijst wordt zichtbaar dat de betaling via een batch is gelopen, zodat een handmatige "markeer als betaald" niet meer nodig is voor batchfacturen.

## Aandachtspunt

De bankafletter-functie zoekt losse inkoopfacturen alleen onder niet-betaalde facturen. Omdat batchfacturen nu direct betaald zijn, worden ze niet meer individueel voorgesteld bij bankregels — dat is correct, want een SEPA-batch komt als één verzamelboeking op het afschrift en wordt al op batchniveau gematcht. Ik controleer dat de batch-matching daar blijft werken.

## Technische uitvoering

- `supabase/functions/generate-payment-batch/index.ts`: de `update({ payment_batch_id })` uitbreiden met `status: "paid"`, `paid_at` en `updated_at`.
- `src/pages/admin/AdminPaymentBatches.tsx`: in de annuleer-actie de losgekoppelde facturen terugzetten naar `status: "forwarded"`, `paid_at: null`; batch-transactietabel toont de betaalstatus.
- Data-correctie via een insert/update-statement: `partner_purchase_invoices` met `payment_batch_id is not null` en `status = 'forwarded'` → `paid`, `paid_at = payment_batches.requested_execution_date`, exclusief geannuleerde batches.
- Testdekking: een unittest op de terugdraai-/markeerregels in de bestaande betaalbatch-testsuite (`src/lib/__tests__/paymentBatch*`), plus draaien van de volledige suite.
