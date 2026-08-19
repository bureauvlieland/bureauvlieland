# Nieuw onderdeel toevoegen na "akkoord ontvangen"

## Probleem

Als een project al de fase "akkoord ontvangen" heeft en je voegt een nieuw onderdeel toe, dan gaat de klantpagina er van uit dat alles al is goedgekeurd. Het nieuwe onderdeel toont "Wacht op aanbieder" zonder goedkeurknop, terwijl admin "Nog naar partner" laat zien. Je hebt nu ook geen keuzemoment om te bepalen of de klant hier nog akkoord op moet geven.

## Wat er komt

1. **Keuze bij publiceren.** In de publicatiedialoog (Wijzigingen doorvoeren) verschijnt een apart blok zodra er nieuwe onderdelen bij zitten én het project al akkoord is:
   - "Klant moet dit nieuwe onderdeel nog goedkeuren" (standaard aan)
   - "Geen klantgoedkeuring nodig — al afgestemd" (onderdeel gaat direct mee als goedgekeurd)
   Daaronder blijft de bestaande keuze staan om wel/geen mail naar de klant te sturen. Geen mail sturen is en blijft mogelijk.

2. **Nieuwe mailtemplate.** Er is nog geen klantmail voor "nieuw onderdeel — graag goedkeuren"; die maken we (`item_added_customer_approval`): korte uitleg dat er een onderdeel is toegevoegd aan het al goedgekeurde programma, het onderdeel met dag/tijd/prijs, en een knop naar de klantpagina om het goed te keuren. Bij "geen goedkeuring nodig" wordt de bestaande bevestigingsmail (Programma bijgewerkt) gebruikt.

3. **Klantportaal werkt weer.** Nieuwe, nog niet goedgekeurde onderdelen krijgen in de klantpagina de status "Wacht op uw goedkeuring" met goedkeurknop, ook als het project al in de akkoord-fase zit. De actiebanner bovenaan meldt dan "Nieuw onderdeel toegevoegd — graag uw goedkeuring", en de voortgangsteller telt het onderdeel mee als openstaand.

4. **Partnermail wacht.** Zoals nu al: zolang de klant het nieuwe onderdeel niet heeft goedgekeurd, gaat er geen partnermail uit. Kies je "geen goedkeuring nodig", dan mag de partnermail direct mee.

## Technisch

- `src/components/admin/PublishChangesDialog.tsx`: extra `newItemApproval: "require" | "skip"` radiogroep, alleen gerenderd als `pendingItems.some(i => i.pending_added)` en het project in `akkoord_ontvangen` zit; meegestuurd in de invoke-body.
- `supabase/functions/publish-program-changes/index.ts`: nieuw veld `newItemApproval`. Bij `skip` worden `customer_approved_at`/`customer_accepted_at` op nieuwe items gezet (nu blijven ze leeg) en tellen ze mee voor partnermail; bij `require` blijven ze leeg en wordt — als `notifyCustomer` aan staat — `item_added_customer_approval` gebruikt in plaats van `item_changes_customer` voor de nieuwe onderdelen. Loggen via `logEmail` met `metadata.template_name` + `metadata.actor` zoals het emailcontract vereist.
- Migratie: insert van template `item_added_customer_approval` in `email_templates` (variabelen `customer_name`, `changes_summary`, `portal_url`, `reference_number`).
- `src/lib/customerPortalStatus.ts`: `getCustomerApprovalStats` neemt in `akkoord_ontvangen` ook items zonder `customer_approved_at` mee in `customerActionableItems`.
- `src/lib/itemStatus.ts`: nog niet goedgekeurde items krijgen ook in latere fases "Wacht op uw goedkeuring".
- `src/components/customer-portal/ActionRequiredCard.tsx`: aparte tekstvariant voor nieuw-toegevoegde onderdelen.
- Tests: unit tests voor de nieuwe approvalstats en statusafleiding.
