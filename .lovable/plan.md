# Nieuw toegevoegd onderdeel moet opnieuw door de klant goedgekeurd worden

## Wat er nu gebeurt

Je hebt in BV-2606-0013 op dag 3 de Zeehondentocht verwijderd en "Zeehondentocht Exclusief" toegevoegd. Het project staat al op fase "akkoord ontvangen". Het nieuwe onderdeel is nog nooit door de klant goedgekeurd en is ook nog niet naar de aanbieder gestuurd (admin: "Nog naar partner"), maar de klantpagina laat er "Wacht op aanbieder" bij zien, zonder goedkeurknop. Dat is precies omgekeerd aan de werkelijkheid.

Oorzaak (geverifieerd in de code): zodra een project de fase "akkoord ontvangen" heeft, gaat de statusbepaling ervan uit dat álle onderdelen al door de klant zijn goedgekeurd en dat de bal dus bij de aanbieder ligt. Een later toegevoegd onderdeel valt daardoor automatisch in de emmer "wacht op aanbieder", verdwijnt uit de goedkeurteller (3/3 blijft groen) en krijgt geen actieknop.

## Wat we gaan veranderen

1. **Nieuw onderdeel = klant is aan zet.** Een actief onderdeel zonder klant-goedkeuring dat nog niet naar de aanbieder is verstuurd, toont voor de klant "Wacht op uw goedkeuring" (amber) met een knop "Goedkeuren", ook in de fase "akkoord ontvangen".

2. **Tellers en stapkaart lopen mee.** Zo'n onderdeel telt weer mee in "Onderdelen goedkeuren"; de stap springt van "Alle onderdelen goedgekeurd" terug naar open zolang er iets openstaat, met de juiste teller (bijv. 5 van 6).

3. **Juiste kop bovenaan de klantpagina.** In plaats van "Aanvragen verstuurd naar aanbieders" komt er, als er nog een onderdeel op goedkeuring wacht, een blok "Nieuw onderdeel in uw programma — graag uw akkoord" met een knop die naar het onderdeel scrollt.

4. **Consistentie met admin.** De admin blijft "Nog naar partner / wacht op aanbieder-verzending" tonen; na klantakkoord komt het onderdeel zoals gebruikelijk in "klaar om te sturen" en verstuur je de aanvraag naar de aanbieder.

Wat níet verandert: al goedgekeurde onderdelen blijven goedgekeurd (er wordt niets opnieuw ter goedkeuring opengezet), en Bureau Vlieland-onderdelen (overtochten, fietsen) blijven na akkoord direct "Geregeld door Bureau Vlieland".

## Technische uitwerking

- `src/lib/itemStatus.ts` — in `deriveItemDisplayStatus`: vóór de fallback naar `wacht_op_partner` een regel toevoegen dat een item zonder `customer_accepted_at`/`customer_approved_at` met `status = 'pending'` én `skip_partner_notification = true` (nog niet naar partner verstuurd) `wacht_op_klant` wordt, ongeacht `quote_status`.
- `src/lib/customerPortalStatus.ts` — in `getCustomerApprovalStats`: in de fase `akkoord_ontvangen` ook niet-goedgekeurde, nog-niet-verstuurde pending items meenemen in `customerActionableItems` en in `customerApprovableTotal`, zodat teller, `customerActionsCount` en de stepper-stap kloppen.
- `src/components/customer-portal/CustomerProgramItem.tsx` — `needsCustomerAction` werkt al op `wacht_op_klant`; controleren dat `onApproveQuoteItem` in fase 3 wordt doorgegeven vanuit `CustomerProgram.tsx` / `DesktopProgramView.tsx` en dat het goedkeuren van één onderdeel de juiste velden zet.
- `src/components/customer-portal/ActionRequiredCard.tsx` — in fase 3 een extra tak vóór "Aanvragen verstuurd naar aanbieders": bij `customerActionsCount > 0` met alleen niet-goedgekeurde nieuwe onderdelen de kop "Nieuw onderdeel in uw programma" met scroll-CTA.
- Tests: uitbreiden van `src/lib/__tests__/itemStatus.test.ts` en een nieuwe test voor `getCustomerApprovalStats` met scenario "nieuw item toegevoegd na akkoord" (klant aan zet, teller 5/6, bureau-items ongemoeid).
