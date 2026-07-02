# Inkoopfacturen opnieuw kunnen verwerken

Doel: een reeds verwerkte inkoopfactuur kunnen terugdraaien zodat hij opnieuw vanaf de inbox verwerkt kan worden (bijv. na een foute koppeling, verkeerd programma-onderdeel of verkeerd bedrag).

## Wijzigingen

### 1. Inbox: knop "Opnieuw verwerken" op verwerkte items
Op `/admin/inkoopfacturen/inbox`, tabblad **Verwerkt** (en processed-items binnen **Alle**), naast **Bekijk factuur** een extra knop **Opnieuw verwerken** (icoon `RotateCcw`).

Klik opent een bevestigingsdialoog:
> "De bestaande factuurregistratie wordt verwijderd (inclusief regels, verdelingen en factuur-/commissiestatus op het programma-onderdeel). Het inbox-item komt terug op 'Nieuw' zodat je opnieuw kunt verwerken. Doorgaan?"

Bij bevestigen:
1. Verwijder gerelateerde regels + verdelingen + de `partner_purchase_invoice`-rij.
2. Reset factuur- en commissievelden op het gekoppelde programma-onderdeel (zoals de bestaande "Verwijderen"-actie doet).
3. Verwijder de PDF uit storage (best effort).
4. Log naar de projecthistorie (`purchase_invoice_reprocessed`).
5. Zet het inbox-item terug op status **Nieuw**; scan-resultaat en bijlage blijven staan zodat je meteen door kunt.
6. Springt automatisch naar de tab **Nieuw**.

### 2. Facturenlijst: verwijderen → automatisch terug in inbox
Op `/admin/inkoopfacturen`: bij het verwijderen van een factuur die oorspronkelijk via de inbox binnenkwam, komt het bijbehorende inbox-item automatisch terug op **Nieuw**. De bevestigingstekst krijgt een extra zin:
> "Als deze factuur via de inbox is binnengekomen, komt het inbox-item automatisch terug op 'Nieuw' zodat je opnieuw kunt verwerken."

Zo werken beide ingangen (inbox-knop én verwijderen op de facturenlijst) consistent.

## Aandachtspunt: verzamelfacturen
Eén inbox-item kan bij een verzamelfactuur (bv. Doeksen, Isla Vlieland) meerdere factuurregistraties hebben opgeleverd. De **Opnieuw verwerken**-knop verwijdert alleen de factuur waarnaar het inbox-item direct verwijst. In de bevestigingsdialoog verschijnt daarom bij verzamelfacturen een waarschuwing:
> "Dit item is als verzamelfactuur verwerkt — mogelijk moeten aanvullende factuurregistraties handmatig via /admin/inkoopfacturen worden verwijderd."

## Buiten scope
- Geen wijzigingen aan RLS, edge functions, database-schema of migraties.
- Geen automatische herscan; bestaand scan-resultaat wordt hergebruikt (met de bestaande **Opnieuw scannen**-knop als optie).

## Technische notitie
- `src/hooks/usePurchaseInvoices.ts` — in `deleteInvoice` de gekoppelde `purchase_invoice_inbox`-rij terugzetten op `status='new'` en `processed_*`-velden leegmaken.
- `src/hooks/usePurchaseInvoiceInbox.ts` — nieuwe `reprocess`-mutatie die bovenstaande stappen uitvoert.
- `src/pages/admin/AdminPurchaseInvoiceInbox.tsx` — extra knop + AlertDialog + tabwissel naar `"new"` na succes.
- `src/pages/admin/AdminPurchaseInvoices.tsx` — tekstuele aanvulling op de bestaande delete-confirm.
