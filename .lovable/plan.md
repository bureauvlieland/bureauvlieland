## Bevestiging: ja, het is dubbel

Vlieland Outdoor Center heeft op **6 juni** in de partnerportal 8 facturen handmatig aangemaakt zonder PDF (genummerd 1 t/m 8, status "in afwachting"). Op **26 juni** zijn diezelfde 8 facturen via Visma e-Accounting gemaild naar `invoices@reply.bureauvlieland.nl` mét PDF (nummers 665 t/m 672). De bedragen matchen 1-op-1 in dezelfde volgorde:

| Handmatig (6 jun) | Per mail (26 jun) | Bedrag incl. |
|---|---|---|
| 1 | 665 | € 280,00 |
| 2 | 666 | € 300,00 |
| 3 | 667 | € 640,01 (vs 640,00) |
| 4 | 668 | € 180,00 |
| 5 | 669 | € 135,00 |
| 6 | 670 | € 300,00 |
| 7 | 671 | € 1.072,50 |
| 8 | 672 | € 240,00 |

De unique-index op `(partner_id, invoice_number)` heeft niet gepakt omdat de partner destijds zelf "1..8" als nummer invulde, terwijl Visma later de echte nummers (665..672) meestuurde.

## Voorstel: opruimen + voorkomen

**Stap 1 — Opruimen huidig geval (handmatig, eenmalig)**
Voor elke duplicaat: PDF + correct factuurnummer uit de inbox koppelen aan de bestaande regel in plaats van een tweede regel aan te maken. Concreet:
- Voeg in de inbox-detail een knop **"Koppel aan bestaande factuur"** toe naast "Verzamelfactuur" / "Verwerken". Admin kiest dan de bestaande regel (gefilterd op partner + bedrag ± €0,02). Bij koppelen:
  - `file_path`, `attachment_filename` worden overgezet naar de bestaande regel
  - `invoice_number` wordt bijgewerkt naar het echte nummer (665..672)
  - `purchase_invoice_inbox.processed_invoice_id` + status `processed`
- Alternatief eenmalig per SQL als je het sneller wil; zeg het maar.

**Stap 2 — Voorkomen in de toekomst**
- Bij inbox-verwerking automatisch een match-voorstel tonen: zelfde `partner_id` + bedrag incl. BTW match ± €0,02 + factuurdatum binnen 60 dagen + nog geen PDF op de bestaande regel ⇒ "Mogelijk dezelfde factuur (regel #X, € 280)". Default-actie wordt "Koppelen" i.p.v. "Aanmaken".
- In de partnerportal-melding bij handmatig aanmaken zonder PDF: korte hint "Stuur je facturen liever per e-mail naar `invoices@reply.bureauvlieland.nl`; ze worden dan automatisch ingelezen."

**Stap 3 — Detectiebanner**
Bovenaan `/admin/inkoopfacturen` een banner als er nu nog kandidaat-duplicaten zijn (zelfde partner + bedrag, één met PDF en één zonder), met link naar een overzicht waar je ze paarsgewijs kunt mergen.

## Technische details

- Edge function `merge-purchase-invoice-from-inbox` (nieuw): krijgt `inboxId` + `targetInvoiceId`, kopieert file_path/filename + corrigeert invoice_number, zet inbox op processed.
- UI: knop in `AdminPurchaseInvoiceInbox.tsx` + nieuwe `MatchExistingInvoiceDialog.tsx` met fuzzy-matchlijst.
- Detectie-query voor banner: `partner_purchase_invoices` self-join op `partner_id` + `abs(amount_incl_vat diff) < 0.02` + één `file_path IS NULL`.

Laat me weten of je akkoord bent met deze aanpak — en of je de 8 huidige duplicaten direct via SQL wil opruimen of liever via de nieuwe UI-knop één voor één.