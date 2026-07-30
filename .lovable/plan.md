## Doel

Eén werklijst in Commissie Beheer → "Te factureren" met **alle** gerealiseerde partnerregels, ongeacht of er een inkoopfactuur aan hangt, plus de inkoopfacturen die nergens aan gekoppeld zijn. Per regel zie je de koppelstatus en kies je zelf de grondslag (onze verkoopprijs of de inkoopfactuur). Daarmee vervalt de aparte "Match & controle"-weergave.

## Huidige situatie (gecontroleerd)

- `get-admin-commissions` filtert bij status "Te factureren" op `invoiced_number is not null`: 18 partnerregels met inkoopfactuur zijn zichtbaar, 32 gerealiseerde partnerregels zonder inkoopfactuur staan op `commission_status = not_applicable` en zijn onzichtbaar.
- 23 van de 42 inkoopfacturen hebben geen `item_id`; die komen alleen voor in de losse "Match & controle"-tab.
- De kolom `commission_basis` ('purchase' | 'sales') bestaat al, maar staat overal op 'purchase' en is alleen via het aparte matchpaneel te wijzigen.
- `commission_invoice_lines` heeft alleen `item_id` / `quote_id`; een losse inkoopfactuur kan nu niet op een commissiefactuur.

## Wat er gebouwd wordt

**1. Eén databron voor de lijst**
`get-admin-commissions` gaat voor de werklijst de reconciliatie-logica (`_shared/commissionReconciliation.ts`) gebruiken als basis en levert per regel:
- gerealiseerde partnerregels (status confirmed/accepted/executed, `block_type = partner`, commissie% > 0, commissie nog niet gefactureerd/betaald) — óók zonder inkoopfactuur;
- geselecteerde logies-offertes, zelfde regels;
- inkoopfacturen zonder koppeling als eigen regel;
- per regel: verkoopwaarde ex btw, inkoopwaarde ex btw, verschil, koppelstatus (`gekoppeld` / `geen inkoopfactuur` / `niet gekoppeld` / `afwijking` / `commissievrij`), gekozen grondslag en de resulterende commissie.

**2. Nieuwe kolommen in het overzicht** (`AdminCommissions.tsx`)
Per partnergroep, gesorteerd op datum, met naast Klant/Datum/Bedrag/Commissie:
- **Koppeling**: badge met inkoopfactuurnummer, of "Geen inkoopfactuur" / "Niet gekoppeld aan projectregel";
- **Verkoop ex btw / Inkoop ex btw / Verschil** met rode markering bij afwijking buiten tolerantie (€5 / 2%);
- **Grondslag**: per regel schakelen tussen "Verkoop" en "Inkoop" (en bulk voor een hele partnergroep), inclusief automatische standaard: inkoop als er een factuur is, anders verkoop;
- rij-acties: "Commissievrij", "Koppel aan projectregel" (opent bestaande matchdialoog) en doorklik naar project.

**3. Losse inkoopfacturen meenemen in de commissiefactuur**
Migratie op `commission_invoice_lines`: `purchase_invoice_id uuid` + `commission_basis text` toevoegen, `item_type` mag 'purchase_invoice' zijn. `AdminCommissionInvoiceCreate` accepteert `invoiceIds` naast `itemIds`/`quoteIds` en zet zulke regels als aparte factuurregel met de partnerfactuur als omschrijving. Na facturatie wordt de inkoopfactuur gemarkeerd zodat hij niet dubbel opduikt.

**4. Aparte matchpagina vervalt**
De weergaveschakelaar "Match & controle" verdwijnt uit `AdminCommissions.tsx`; de acties die daar zaten (grondslag wijzigen, commissievrij markeren) zitten nu inline in de werklijst. Filter "Alleen afwijkingen / alleen ontbrekende facturen" komt als statusfilter in dezelfde lijst. `CommissionReconciliationPanel.tsx` en `get-commission-reconciliation` blijven bestaan als databron/logica; het losse paneel wordt uit de UI gehaald.

**5. Borging**
Unit-tests uitbreiden op de gedeelde logica (grondslagkeuze, commissieberekening per grondslag, geen dubbele regels bij factuur die via nummer én allocatie matcht) en op de nieuwe factuurregel-opbouw. Volledige typecheck + testsuite.

## Technische details

- Bestanden: `supabase/functions/get-admin-commissions/index.ts`, `supabase/functions/_shared/commissionReconciliation.ts`, `src/pages/admin/AdminCommissions.tsx`, `src/pages/admin/AdminCommissionInvoiceCreate.tsx`, migratie voor `commission_invoice_lines`.
- Commissie op verkoopgrondslag = verkoopprijs incl btw → ex btw via `vat_rate` × commissie%; op inkoopgrondslag = som van `amount_excl_vat` van gekoppelde inkoopfacturen × commissie%.
- `commission_status` van regels zonder factuur wordt bij tonen niet muteren; pas bij facturatie naar `invoiced`, zodat de lijst niets stilzwijgend verandert.

## Open vraag

Standaardgrondslag: ik zet hem op "inkoopfactuur indien aanwezig, anders verkoop". Wil je liever altijd verkoop als standaard (met inkoop alleen als controle), dan pas ik dat aan.
