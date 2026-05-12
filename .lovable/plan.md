## Doel

1. Klant ontvangt automatisch een enthousiaste **aankomstmail** een paar dagen voor de eerste programmadag, met daarin het Word-programma als bijlage en uitleg over de overtocht (Doeksen, groepsticket bij klantenservicebalie Harlingen).
2. In dat Word-document staat per programma-onderdeel een **kaartje met de locatie**, zodat de gasten direct zien waar ze moeten zijn.

## 1. Nieuwe edge function `send-arrival-reminder`

Gebaseerd op `send-guest-details-reminder`, maar met andere logica:

- **Wanneer**: eerste `selected_date` valt **3 t/m 5 dagen** in de toekomst (venster van 3 dagen zodat we niets missen als de cron een keer faalt).
- **Voorwaarden**:
  - `terms_accepted_at` ingevuld én `cancelled_at` leeg
  - `status` niet `geannuleerd` / `cancelled`
  - Nog géén eerdere `arrival_reminder` in `email_log` voor dit project (dedup via `related_request_id` + `email_type`)
- **Per match**:
  - Genereer het Word-document door intern `generate-program-docx` aan te roepen (service-role auth) en hang de buffer aan de mail als bijlage `Programma-{referentie}.docx`.
  - Render template `arrival_reminder` met velden: `customer_name`, `arrival_date`, `number_of_people`, `reference_number`, `ferry_info_link` (https://www.rederij-doeksen.nl), `portal_link`.
  - Verstuur via Mailjet (volgens bestaande email-architectuur, met `metadata.template_name` en `metadata.actor: "system"` zoals voorgeschreven door het Email Logging Contract).
- **Cron**: dagelijks via pg_cron, vergelijkbaar met de bestaande herinneringsworkflow.

## 2. Nieuw e-mailtemplate `arrival_reminder`

Toevoegen in `email_templates` tabel (via migratie). Toon, in lijn met huisstijl (formeel "u"):

> **Onderwerp**: Over een paar dagen bent u op Vlieland — uw programma & aankomstinformatie
>
> Beste {{customer_name}},
>
> Nog een paar nachtjes slapen — op {{arrival_date}} verwelkomen wij u en uw groep op Vlieland! Wij hebben er zin in.
>
> In de bijlage vindt u het volledige programma met alle tijden, locaties en kaartjes. U kunt het ook altijd online bekijken via uw portaal.
>
> **Reis met Rederij Doeksen** 
> De boot vertrekt vanuit Harlingen Haven. Houd rekening met ruim op tijd aanwezig zijn (minimaal 30 minuten voor vertrek). Actuele vertrektijden vindt u op [rederij-doeksen.nl]({{ferry_info_link}}).
>
> **Reist u met een groepsticket?** 
> Meld u zich dan bij aankomst in Harlingen bij de **klantenservicebalie van Doeksen**. Daar krijgt u uw tickets, waarna u als groep door de ticketcontrole kunt.
>
> Heeft u nog vragen? Stuur gerust een bericht via uw portaal of antwoord op deze mail.
>
> Tot snel op Vlieland!  
> Bureau Vlieland

(Exacte HTML/MJML volgt het bestaande template-patroon.)

## 3. Locatiekaart per onderdeel in het Word-document

Aanpassen `supabase/functions/generate-program-docx/index.ts`:

- Voor elk item met `location_lat` + `location_lng`: haal **server-side** (binnen de edge function, niet via base64 data-URI) een statisch kaartje op.
- Bron: OpenStreetMap static map (`https://staticmap.openstreetmap.de/staticmap.php?center=lat,lng&zoom=15&size=480x240&markers=lat,lng,red-pushpin`) — fetch als `ArrayBuffer`.
- Voeg toe via `ImageRun` (PNG, fixed `transformation: { width: 360, height: 180 }`) **onder** het locatieadres in de bestaande paragraaf-flow. Geen tabel-wrapper, single-column blijft behouden (voorkomt de eerdere Word-corruptie).
- **Alleen kaartjes**, geen activity-foto's — die hebben eerder de corruptie veroorzaakt en zijn voor deze mail niet nodig.
- Robuust foutpad: als de fetch faalt of timeout (>5s), sla het kaartje voor dat item over en log een warning. Document moet altijd genereren.
- Concurrente fetch: gebruik `Promise.all` over alle items vooraf, met `Promise.allSettled` zodat één faalend kaartje het document niet blokkeert.

## 4. Validatie

- Lokaal de edge function aanroepen met een test-`request_id` en het document als afbeeldingen renderen om te controleren dat:
  - Word het bestand zonder corruptie-melding opent (Microsoft Office, jouw eerdere knelpunt).
  - Kaartjes scherp en op de juiste locatie staan.
- `send-arrival-reminder` één keer met `dry_run: true` parameter draaien (alleen loggen, niet verzenden) om de matchset te controleren voordat de cron live gaat.

## Bestanden

- `supabase/functions/send-arrival-reminder/index.ts` (nieuw)
- `supabase/functions/generate-program-docx/index.ts` (kaartjes toevoegen)
- migratie: `email_templates` insert voor `arrival_reminder` + pg_cron schedule voor de nieuwe function
- `mem://features/automated-reminder-system` updaten met de nieuwe arrival reminder

## Open vraag

Wil je dat de aankomstmail naar **alleen** `customer_email` gaat, of ook in CC naar het interne bureau-adres (zodat jullie zien dat hij eruit is)?
