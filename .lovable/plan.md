# Plan: Inkoopfacturen opnieuw kunnen verwerken

Doel: een reeds verwerkte inkoopfactuur kunnen "terugdraaien" zodat hij opnieuw vanaf de inbox verwerkt kan worden (bijv. na een foute koppeling, verkeerd programma-onderdeel, of verkeerd bedrag).

## Wijzigingen

### 1. `src/hooks/usePurchaseInvoices.ts` — `deleteInvoice`
Na het verwijderen van de factuur en het resetten van het programma-onderdeel:
- Zet elke `purchase_invoice_inbox`-rij die naar deze factuur verwees terug naar `status='new'` en maak `processed_invoice_id`, `processed_by`, `processed_at` leeg.
- Effect: als je op `/admin/inkoopfacturen` een factuur verwijdert die via de inbox binnenkwam, verschijnt hij automatisch weer in de inbox-tab "Nieuw" en kun je hem opnieuw verwerken (bestaande scan blijft behouden).

### 2. `src/hooks/usePurchaseInvoiceInbox.ts` — nieuwe `reprocess` mutation
Voor een inbox-item met `status='processed'`:
1. Zoek `processed_invoice_id`.
2. Verwijder gerelateerde `purchase_invoice_lines` en `partner_purchase_invoice_allocations`.
3. Verwijder `partner_purchase_invoices`-rij.
4. Reset gekoppeld `program_request_items` (invoiced_* en commission_* velden, zoals in bestaande `deleteInvoice`).
5. Log naar `program_request_history` (`action: 'purchase_invoice_reprocessed'`).
6. Zet inbox-rij terug op `status='new'`, `processed_invoice_id=null`, `processed_by=null`, `processed_at=null` (bijlage en scan_result blijven staan).
7. Toast: "Verwerking ongedaan gemaakt — klaar om opnieuw te verwerken".

Exporteer `reprocess` in de return.

### 3. `src/pages/admin/AdminPurchaseInvoiceInbox.tsx`
- Op tabblad "Verwerkt" (en "Alle" voor processed-items): naast **Bekijk factuur** een knop **Opnieuw verwerken** (icon `RotateCcw`, variant `outline`).
- Klik opent een `AlertDialog` met bevestiging: "De bestaande factuurregistratie wordt verwijderd (inclusief regels, verdelingen en factuur-/commissiestatus op het programma-onderdeel). Het inbox-item komt terug in 'Nieuw' zodat je opnieuw kunt verwerken. Doorgaan?"
- Bij bevestigen → `reprocess.mutate(item.id)` en switch daarna tab naar `"new"`.

### 4. `src/pages/admin/AdminPurchaseInvoices.tsx` — kleine UX-toevoeging
- Update de tekst in de bestaande delete-confirm (`deleteTarget` dialog, rond regel 522-550) met een extra zin: "Als deze factuur via de inbox is binnengekomen, komt het inbox-item automatisch terug op 'Nieuw' zodat je opnieuw kunt verwerken."

## Scope-notes / buiten scope
- **Verzamelfacturen**: één inbox-item kan meerdere `partner_purchase_invoices` hebben opgeleverd. De `reprocess`-knop verwijdert alleen de invoice waarnaar `processed_invoice_id` verwijst. Bij verzamelfacturen tonen we in de confirm-dialog een waarschuwing "Dit item is als verzamelfactuur verwerkt — mogelijk moeten aanvullende factuurregistraties handmatig via /admin/inkoopfacturen worden verwijderd." (detectie: `partner_purchase_invoices.is_collective === true` op de gelinkte invoice.)
- Geen wijziging aan RLS of edge functions nodig; alle acties gaan via bestaande admin-rechten op de betrokken tabellen.
- Geen nieuwe kolommen of migraties nodig.
