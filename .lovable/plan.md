# Kinderprijzen per activiteit

Doel: bij activiteiten met een kinderprijs kun je per programma-onderdeel de verdeling volwassenen/kinderen invullen. Die verdeling en de bijbehorende prijsopbouw lopen door naar het klantportaal, de partner, de offerte-PDF, de facturen en de commissie.

## Wat je krijgt

1. **Admin — per activiteit een deelnemersmix**
   In het onderdeel-scherm (toevoegen en wijzigen) komt naast "Aantal personen" een blok:
   - Volwassenen (het bestaande aantal)
   - Kinderen + kinderprijs p.p. (met leeftijdsrange uit de bouwsteen, bijv. "4–12 jr")
   Alleen zichtbaar bij prijstype per persoon / per persoon per dag. Bij het toevoegen van een activiteit worden kinderprijs en leeftijdsrange automatisch overgenomen uit de bouwsteen; je kunt ze per onderdeel overschrijven.
   Onder het veld staat live de opbouw: `20 × €32,00 + 7 × €18,00 = €766,00`, plus een zachte waarschuwing als volwassenen + kinderen afwijkt van het projectaantal (27).

2. **Klantportaal — zichtbaar en aanpasbaar**
   De klant ziet per onderdeel de opbouw ("20 volwassenen × €32,00 + 7 kinderen × €18,00") en kan de verdeling zelf bijstellen binnen het totaal aantal personen. Zo'n wijziging landt als concept-wijziging (pending) die jij publiceert; de partner wordt daarbij geïnformeerd zoals nu bij een aantalswijziging.

3. **Partner — ziet de mix en mag een kinderprijs voorstellen**
   In het partnerportaal staat bij het onderdeel de verdeling (volwassenen/kinderen + leeftijdsrange). Bij het uitbrengen of aanpassen van een prijs kan de partner een prijs voor volwassenen én kinderen invullen; het totaalbedrag wordt daaruit berekend. Partner-mails over het onderdeel en over aantalswijzigingen tonen de verdeling.

4. **Offerte, facturen en commissie**
   - Offerte-PDF en klantprogramma tonen twee prijsregels per onderdeel (volwassenen, kinderen).
   - Bij factureren worden automatisch twee factuurregels voorgesteld (volwassenen, kinderen) met hetzelfde btw-tarief; handmatig aanpassen blijft mogelijk.
   - Projecttotalen, restant-berekening en commissie rekenen met het nieuwe onderdeeltotaal — de commissiegrondslag blijft het inkoopbedrag ex btw, dus daar verandert de rekenregel niet.
   - Capaciteitscheck (max. personen) rekent met volwassenen + kinderen samen.

## Technische aanpak

**Database (één migratie)**
- `program_request_items`: `override_children` (int), `child_unit_price` (numeric), `child_min_age`, `child_max_age` (int) — plus pending-varianten `pending_override_children`, `pending_child_unit_price` voor de bestaande publiceer-flow.
- `override_people` blijft ongewijzigd van betekenis: het aantal personen tegen het volwassenentarief. `override_children` staat er los naast en telt op bij het totaal.
- Geen wijziging aan `building_blocks`: `price_child`, `price_child_min_age`, `price_child_max_age` bestaan al en worden de bron bij het toevoegen/synchroniseren van een activiteit.

**Rekenkern (`src/lib/portalPricing.ts`)**
- Nieuwe helpers `getEffectiveChildren(item)`, `getParticipantTotal(item, programPeople)` en `getPriceComponents(item, programPeople, days)` die per onderdeel de regels (volwassenen, kinderen) teruggeven.
- `getDisplayLineTotal` wordt: `adultUnit × volwassenen + childUnit × kinderen`, maal dagen bij p.p.p.d. Zonder kinderen is de uitkomst identiek aan nu (geen regressie).
- `getPriceBreakdownLabel` krijgt de kinderregel; `getDisplayUnitPrice` blijft het volwassenentarief.
- `hasOpenAdminPriceChange` / `priceChangeRequiresReapproval` gaan via het nieuwe totaal, zodat een gewijzigde kindprijs ook als prijswijziging wordt gezien.
- `capacityCheck.ts`, `invoiceTotals.ts`, `adminInvoicingTotals.ts` en `projectFinancials.ts` gaan via deze helpers in plaats van eigen vermenigvuldiging.

**UI**
- `AdminAddActivitySheet.tsx`, `AdminEditActivitySheet.tsx`: mix-blok + overname uit bouwsteen.
- `partialItemSave.ts`, `PublishChangesDialog.tsx`, `publish-program-changes`: de twee nieuwe pending-velden toevoegen aan de opslag-, diff- en publiceer-lijsten (zelfde patroon als `pending_override_people`).
- `CustomerProgramItem.tsx`, `PriceSummaryCard.tsx`, `CustomerItemChangelog.tsx` + `update-customer-program`: opbouw tonen en verdeling laten wijzigen (validatie: som ≤ totaal aantal personen, kinderen ≥ 0).
- `PartnerItemSheet.tsx`, `PartnerProjectItemRow.tsx`, `PartnerWerkbankList.tsx`: mix tonen, kinderprijs-invoer bij prijsvoorstel; `update-partner-item-status` slaat volwassen- en kindprijs op en berekent `quoted_price`.
- `AdminQuotePreview.tsx`, `AdminInvoicePreview.tsx`, `useItemBillingLines`: tweede prijsregel/factuurregel.
- Mailteksten: `notify-partner-headcount-change`, `notify-headcount-change-bulk`, `send-partner-headsup-t3`, `compose-followup-email` krijgen de verdeling in de itemregel.

**Tests**
- Uitbreiding van `portalPricing`-tests: onderdeel met/zonder kinderen, p.p.p.d. met kinderen, prijswijziging-detectie bij gewijzigde kindprijs.
- `capacityCheck`: volwassenen + kinderen tegen `max_people`.
- Nieuwe tests voor de factuurregel-opbouw en voor de klantvalidatie van de verdeling.

## Aanpak in stappen

1. Migratie + rekenkern + tests (geen UI-zichtbare wijziging, alles blijft gelijk zonder kinderen).
2. Admin-invoer inclusief overname uit bouwsteen en publiceer-flow.
3. Klantportaal (weergave + aanpasbaar) en partnerportaal (weergave + kinderprijs).
4. Offerte-PDF, factuurregels, mails.
