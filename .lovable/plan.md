# Direct boeken op de eigen site (geen doorverwijzing meer)

## Wat er nu misgaat

De "Boeken"-knoppen in de activiteitenlijst en in het detailpaneel linken naar
`https://boeking.mijnactiviteitenplanner.nl/<aanbieder>/<activiteit>/list`. Die URL bevat geen
datum en geen tijdslot, dus MAP opent op de dag van vandaag. De boek-en-betaal-laag
(`map-book`, `map-payment-status`, `booking_events`) is al gebouwd, maar de front-end gebruikt
die nog niet.

## Wat we bouwen

1. **Boekdialoog op de eigen site**
   Klik op "Boeken" of op een vertrektijd opent een dialoog in plaats van een nieuw venster:
   - gekozen activiteit, datum en vertrektijd staan bovenaan vast (het exacte MAP-slot-ID gaat mee);
   - aantal volwassenen en, als er een kinderprijs is, aantal kinderen (begrensd op de resterende plekken);
   - naam, e-mail, telefoon; optioneel kortingscode;
   - live prijsindicatie (volwassenen x p.p. + kinderen x kindprijs) met de tekst dat de aanbieder
     het definitieve bedrag berekent;
   - knop "Doorgaan naar betalen".

2. **Betalen**
   De dialoog roept `map-book` aan. Bij `mode: "checkout"` gaat de bezoeker naar de betaalpagina.
   Bij `mode: "redirect"` (aanbieder zonder eigen checkout) openen we de MAP-pagina van die
   aanbieder als terugvaloptie, met een korte uitleg.

3. **Retourpagina `/boeking-status`**
   Na betalen komt de bezoeker hier terug (`?b=<boeking>&t=<aanbieder>`). De pagina pollt
   `map-payment-status` en toont: gelukt (met boekingsnummer en de melding dat de bevestiging per
   e-mail komt), mislukt (opnieuw proberen) of nog in behandeling. Cross-sell naar logies en
   programma samenstellen onderaan, zoals nu in het detailpaneel. Pagina is `noindex`.

4. **Vertrektijden worden acties, geen links**
   In `MapActivityCard` en `MapActivityDetailSheet` verdwijnen de externe links en het
   "u boekt rechtstreeks bij ..."-blok; volgeboekte tijden blijven uitgeschakeld. Bij meerdere
   tijden vraagt de kaartknop eerst om een tijd (detailpaneel), bij één tijd gaat hij direct
   naar de dialoog.

## Technisch

- `supabase/functions/_shared/map.ts`: `bureauvlieland.nl` en `www.bureauvlieland.nl` toevoegen aan
  `ALLOWED_RETURN_HOSTS`, plus een unit-test hiervoor in `map.test.ts` (de retour-URL is nu deze site).
- Nieuw: `src/components/map/MapBookingDialog.tsx` (formulier + `supabase.functions.invoke("map-book")`).
- Nieuw: `src/pages/BookingStatus.tsx` + route `/boeking-status` in `src/App.tsx`; `/boeking-status`
  toevoegen aan de noindex-regels in `public/robots.txt`.
- Aanpassen: `MapActivityCard.tsx` en `MapActivityDetailSheet.tsx` — `onBook(activity, timeId)` in
  plaats van `bookingUrl`; `ActiviteitenBoeken.tsx` beheert de dialoogstate.
- Nieuw: `src/lib/mapBooking.ts` met de prijsberekening en de validatie van het formulier, plus
  unit-tests (aantallen, kinderprijs afwezig, e-mail/telefoon-patroon gelijk aan de edge function).
- Bestaande `map-create-booking` blijft ongemoeid; de nieuwe flow gebruikt uitsluitend `map-book`.
- Analytics: `activity_book_click` blijft, `activity_booking_started` en `activity_booking_paid`
  komen erbij.

## Testen

- Unit: prijsberekening, formuliervalidatie, `safeReturnUrl` met de nieuwe hosts.
- Contract: `map-book` met foute payloads (400) en met een aanbieder zonder sleutel (`mode: "redirect"`).
- Eén echte proefboeking op een goedkope activiteit om `payment_started` → `payment_paid` in
  `booking_events` te bevestigen, plus de afgebroken-betaling-kant.
