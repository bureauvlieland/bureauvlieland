## Doel
Op de admin-projectpagina elke regel onder "Overige kosten" kunnen bewerken (omschrijving, bedrag, BTW-tarief, toelichting) — niet alleen toevoegen/verwijderen.

## Aanpak
`AdminAddCostSheet` uitbreiden tot een dual-mode sheet (toevoegen + bewerken):
- Nieuwe optionele prop `editingItem?: { id, block_name, admin_price_override, admin_price_notes, vat_rate? }`.
- Wanneer `editingItem` aanwezig is: titel "Kosten bewerken", velden voorgevuld, submit doet `update` i.p.v. `insert`, knop-tekst "Opslaan".

In `AdminRequestDetail.tsx`:
- Nieuwe state `editingCost` (item of null) + helper `setEditCostOpen`.
- In de "Overige kosten"-tabel een Pencil-icon-knop toevoegen naast de Trash-knop. Hele rij krijgt ook een hover-cursor + clickable area op de cel zodat een klik op de regel dezelfde sheet opent.
- Sheet wordt gerenderd met óf `editingItem`-prop óf zonder, beide via dezelfde component.

## Niet in scope
- Geen nieuwe BTW-kolom in de tabel (blijft alleen in de sheet).
- Geen wijzigingen aan andere overzichten / financiële berekeningen — die lezen al `admin_price_override`.

## Bestanden
- `src/components/admin/AdminAddCostSheet.tsx` — dual-mode maken
- `src/pages/admin/AdminRequestDetail.tsx` — edit-knop + state + sheet-call
