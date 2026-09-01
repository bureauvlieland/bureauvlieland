# Goedkeuring alleen voor nieuwe onderdelen

Nu vervalt het klantakkoord op een onderdeel bij bijna elke wijziging: publiceren van een gewijzigde tijd, prijs, aantal personen of locatie zet de goedkeuring standaard terug op nul, en ook een partner-alternatief of "niet beschikbaar" wist het akkoord. Daardoor moet de klant dingen opnieuw goedkeuren die al goedgekeurd waren.

Nieuw uitgangspunt: goedkeuring gaat over de activiteit zelf. Is een onderdeel eenmaal goedgekeurd, dan blijft dat akkoord staan; wijzigingen worden alleen als melding gecommuniceerd. Alleen een **nieuw toegevoegd onderdeel** vraagt nog een klantgoedkeuring.

## Wat er verandert

1. **Publiceren van wijzigingen**
   - Standaard blijft het klantakkoord staan bij alle wijzigingen aan bestaande onderdelen (tijd, prijs, personen, locatie, beschrijving, aanbieder, facturatie).
   - De admin-keuze "klant moet opnieuw goedkeuren" blijft bestaan in de publiceer-dialoog, maar staat standaard **uit**, met korte uitleg dat dit alleen voor uitzonderingen is.
   - De keuze voor partner-herbevestiging blijft ongewijzigd (dat traject staat los van klantgoedkeuring).
   - Nieuw toegevoegde onderdelen: gedrag blijft zoals nu — klant moet goedkeuren, tenzij admin kiest voor "al afgestemd".

2. **Partnerreacties**
   - Partner stelt een alternatieve tijd/prijs voor: klantakkoord blijft staan; de klant krijgt dit als wijziging/voorstel te zien, niet als "opnieuw goedkeuren".
   - Partner meldt "niet beschikbaar": klantakkoord blijft ook staan. Het onderdeel blijft wel als open/actiepunt zichtbaar voor Bureau (vervanging zoeken) en de klant blijft de melding zien.

3. **Klantportaal**
   - Onderdelen met een bestaand akkoord verschijnen niet meer in "wacht op uw goedkeuring", ook niet na een tijd- of prijswijziging of na een partner-alternatief.
   - De banner en de lijst met te beoordelen onderdelen bevatten dan alleen nog écht nieuwe onderdelen.
   - Wijzigingen blijven zichtbaar via de bestaande wijzigingsmelding/changelog in het portaal, zodat de klant het verschil ziet zonder actie te hoeven doen.

## Voorkomen dat er iets stukgaat

- De ondertekenflow, "onder voorbehoud ondertekenen" en de voortgangsteller blijven werken op dezelfde bron van waarheid; alleen de reset-regels wijzigen.
- Bestaande projecten worden niet met terugwerkende kracht aangepast: geen data-migratie, alleen ander gedrag vanaf nu.
- Partner-notificatie-gates die op klantakkoord staan blijven intact, dus partners krijgen niet plotseling mails voor niet-goedgekeurde onderdelen.

## Technische uitvoering

- `supabase/functions/publish-program-changes/index.ts`: default van `approvalScope.customer` van `reset` naar `keep`; reset alleen nog bij expliciete admin-keuze. Partnerreset-logica onveranderd.
- `src/components/admin/PublishChangesDialog.tsx`: `approvalCustomer` default `keep`, label/uitleg aanpassen.
- `supabase/functions/update-partner-item-status/index.ts`: bij `alternative` en `unavailable` niet langer `customer_approved_at`/`customer_accepted_at` op null zetten (beide stempels blijven samen staan). Statusafleiding (`item_quote_status = "in_afstemming"`, alternative-status) blijft.
- `src/lib/customerPortalStatus.ts`: `hasLiveCustomerApproval` niet meer laten verlopen door een nieuwere `status_updated_at` bij `alternative`; een bestaand akkoord blijft geldig. `getCustomerActionableItems` / `getCustomerApprovalStats` volgen daaruit automatisch.
- Bestaande dual-timestamp guard-test (`customerApprovalDualTimestampGuards.test.ts`) aanpassen aan de verwijderde resets.

### Tests

- `src/lib/__tests__/customerPortalStatus.test.ts`: goedgekeurd onderdeel met latere `status_updated_at` en status `alternative` telt als goedgekeurd; nieuw (niet goedgekeurd) onderdeel telt nog wel als actiepunt; teller en banner-namen kloppen.
- Nieuwe test voor de publiceer-defaults: zonder `approvalScope` blijft klantakkoord staan; met `approvalScope.customer = "reset"` vervalt het.
- Deno-test voor `update-partner-item-status`: alternative/unavailable behouden de goedkeuringsstempels.
- Volledige `vitest` run om regressies in ondertekenflow, tickets en commissielogica uit te sluiten.
