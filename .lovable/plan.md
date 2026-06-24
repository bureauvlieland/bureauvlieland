
## Wat speelt er

Amber (Island Events) ontving op 22-06 een mail "Logies-aanvraag **BV-2605-0005** is geannuleerd". Die referentie kan ze niet vinden, omdat logies-partners de aanvraag bij ons kennen onder de **LOG-referentie** uit `accommodation_requests` (in dit geval `LOG-2606-0004`). De `BV-…` referentie hoort bij het bovenliggende programma. Bovendien stond er geen klant-/bedrijfsnaam in de mail, waardoor herkenning extra lastig is.

DB-bevindingen:
- `program_requests.reference_number = BV-2605-0005` (cancelled)
- gekoppelde `accommodation_requests.reference_number = LOG-2606-0004` (cancelled), met `customer_company` / `customer_name` beschikbaar
- email_log: subject "Logies-aanvraag BV-2605-0005 is geannuleerd"

In `supabase/functions/notify-partner-cancellation/index.ts` (logies-blok, regels ~240-340) wordt overal `refNumber` (BV-…) gebruikt en is geen klantnaam aanwezig.

## Fix

In `supabase/functions/notify-partner-cancellation/index.ts`:

1. Vóór het logies-mailblok één extra lookup op `accommodation_requests` voor `program.linked_accommodation_id` om op te halen: `reference_number`, `customer_company`, `customer_name`, `arrival_date`, `departure_date`. Bewaar als `accommodationRef` en `customerLabel` (= `customer_company || customer_name || "onbekend"`).
2. Logies-mail aanpassen (regels ~276-290):
   - **Subject**: `Logies-aanvraag {accommodationRef} – {customerLabel} is geannuleerd` (fallback naar `refNumber` als LOG-ref ontbreekt).
   - **Body**: openingszin wordt "Hierbij laten we je weten dat de logies-aanvraag met referentie **{accommodationRef}** voor **{customerLabel}** is geannuleerd." Optioneel een regel met aankomst-/vertrekdatum als die beschikbaar zijn, voor extra herkenning. Subtiele toevoeging "Onderdeel van programma {refNumber}." zodat de programma-koppeling zichtbaar blijft.
   - **Portal-link**: `?tab=projecten&q={accommodationRef}` (komt overeen met wat de partner in zijn portal ziet).
   - **Footer-hint**: ook `accommodationRef` gebruiken.
3. Reply-To en correlatie via `request_id` blijven ongewijzigd. In `metadata` extra velden loggen: `accommodation_reference_number`, `customer_label`.

Het programma-annuleringsblok (reguliere partners, regels ~140-235) blijft ongewijzigd: daar is de BV-referentie correct. Optioneel kan daar wél `customerLabel` worden toegevoegd aan subject/body voor dezelfde herkenbaarheid — graag bevestigen of dat ook gewenst is, of dat we het beperken tot de logies-mail.

Geen DB-migratie of frontendwijzigingen. Geen automatische herverzending van de eerdere mail naar Amber.

## Bestanden

- `supabase/functions/notify-partner-cancellation/index.ts` — extra lookup + logies-mail subject/body/portal-link/metadata bijwerken met LOG-ref en klant-/bedrijfsnaam.
