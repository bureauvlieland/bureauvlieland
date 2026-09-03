# Partner niet-beschikbaar: opslaan werkt weer + subtiele melding op de site

## Wat er nu misgaat

De beveiligingsregels op de tabel met niet-beschikbare periodes staan alleen de partner zélf toe om periodes toe te voegen, te wijzigen of te verwijderen. Een admin mag ze alleen bekijken. Daarom krijg je "Kon periode niet opslaan" wanneer je vanuit het partnerbeheer een periode aanmaakt.

Daarnaast is die informatie nergens beschikbaar voor de publieke website: bezoekers kunnen de periodes niet lezen, dus er is ook geen melding te tonen.

## Wat we gaan bouwen

### 1. Admin mag periodes beheren
Beheerders krijgen het recht om periodes toe te voegen, aan te passen en te verwijderen voor elke partner. Daarmee werkt de dialoog "Nieuwe periode" gewoon.

### 2. Beschikbaarheid leesbaar voor de website
Een veilige publieke weergave met alleen het strikt noodzakelijke: partner-id, startdatum en einddatum van lopende en toekomstige periodes. De ingevulde reden (bijv. "Gesloten") blijft intern en gaat niet naar bezoekers.

### 3. Subtiele melding in het aanbod
Aanbod blijft gewoon zichtbaar en boekbaar-aanvraagbaar; er komt alleen een rustige melding bij:

- Op de bouwstenen-overzichtskaart (`/bouwstenen`): een kleine, neutrale regel onder de titel, bijvoorbeeld "Beperkt beschikbaar t/m 31 maart" — geen rode waarschuwing, geen blokkade.
- Op de activiteitdetailpagina (`/activiteit/...`): dezelfde melding als nette notitie boven de aanvraagknoppen, met de tekst "Deze aanbieder is van 1 oktober t/m 31 maart niet beschikbaar. Buiten deze periode kun je gewoon aanvragen — of vraag ons naar een alternatief."
- In de configurator/programma-samensteller: als een gekozen datum binnen de periode van de aanbieder valt, een subtiele inline notitie bij dat onderdeel (geen harde blokkade), zodat de klant het ziet vóór verzending.

De bestaande admin-conflictbanner en het partnerportaal blijven ongewijzigd werken.

## Technische details

- Migratie: admin-policies (`INSERT`/`UPDATE`/`DELETE` met `is_admin(auth.uid())`) op `public.partner_unavailability`.
- Nieuwe view `public.partner_unavailability_public` (`security_invoker=false`, alleen `partner_id`, `start_date`, `end_date`, gefilterd op `end_date >= current_date`) met `GRANT SELECT` aan `anon` en `authenticated`.
- Nieuwe hook `usePublicPartnerUnavailability()` die deze view uitleest en per `provider_id` de eerstvolgende relevante periode teruggeeft.
- Hergebruik van de bestaande `VacationNotice`-stijl (variant `info`, `compact`) voor de melding, met aangepaste tekst; kleuren via bestaande tokens.
- Aanpassingen in `src/pages/Bouwstenen.tsx`, `src/pages/ActiviteitDetail.tsx` en de onderdeel-weergave in de configurator.
