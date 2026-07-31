## Wat er misgaat

Het ligt niet aan het portaal maar aan een databasecontrole. Het onderdeel **Strand BBQ** (Zuiver, BV-2602-0002) staat op `confirmed` met `item_quote_status = 'bevestigd'`, maar heeft geen `quoted_at` en geen bevestigde prijswijziging — de prijs is destijds door jou als admin gezet (€ 35,00 override), niet door Zuiver zelf ingevoerd.

De trigger `guard_item_status_consistency` is bedoeld om te voorkomen dat een item op "bevestigd" wordt gezet vóórdat de partner heeft gereageerd. Maar hij slaat óók aan bij een statuswijziging naar **`executed`**, puur omdat `item_quote_status` al op `bevestigd` staat. Gevolg: de update wordt geweigerd (`check_violation`), de edge function geeft 500 terug en het portaal toont "Kon status niet bijwerken".

Dit is geen eenmalig geval: **14 onderdelen** in de database hebben dezelfde combinatie (bevestigd, geen eigen partneroffer, admin-prijs) en kunnen dus geen van alle door de partner op uitgevoerd worden gezet.

Dat de opdracht nog zichtbaar is, heeft een tweede oorzaak: het partnerdashboard verbergt alleen afgeronde/oude onderdelen. Zolang een item op `confirmed` of `executed` staat blijft het altijd staan, ongeacht leeftijd. BV-2602-0002 (februari, uitgevoerd in mei) staat in de database nog steeds als `active` en is nooit als afgerond gemarkeerd, dus er is niets dat het opruimt. Zuiver heeft twee van de drie onderdelen vandaag zelf gesloten via "Geen factuur"; alleen Strand BBQ lukte niet — precies vanwege de trigger hierboven.

## Wat ik ga doen

**1. Trigger repareren (kern van het probleem)**

De controle moet alleen gelden bij een transitie *naar* `confirmed`/`accepted` of *naar* `item_quote_status = 'bevestigd'` — niet bij een latere statuswijziging naar `executed`, `invoiced` of `cancelled` van een item dat al bevestigd was. Concreet: de trigger stopt direct als de nieuwe status een lifecycle-status ná bevestiging is, en als `item_quote_status` ongewijzigd blijft telt die niet langer als trigger-aanleiding.

**2. Betere foutmelding in het portaal**

`update-partner-item-status` geeft nu bij elke fout een generieke 500 en de UI zegt alleen "Kon status niet bijwerken". Ik geef de databasefoutmelding door in de response en toon die in de toast, zodat een volgende blokkade meteen te herleiden is in plaats van blind zoeken.

**3. Afgeronde opdrachten uit het partnerportaal**

Twee aanvullingen:
- Knop **"Project sluiten"** op de projectpagina in het partnerportaal: sluit in één keer alle onderdelen van dat project die geen actie meer nodig hebben (dezelfde `partner_dismissed_at`-route als de bestaande "Geen factuur — sluiten", inclusief reden en logging).
- Automatisch verbergen: onderdelen uit projecten die als afgerond zijn gemarkeerd (`completed_at` gevuld) én die gefactureerd of gesloten zijn, verdwijnen uit de partnerwerkbank. Dat voorkomt dat oude projecten eeuwig blijven hangen zonder handmatige actie.

**4. Direct opruimen**

Na de fix zet ik Strand BBQ voor Zuiver op uitgevoerd/gesloten, zodat BV-2602-0002 volledig uit hun werkbank verdwijnt. De overige 13 geblokkeerde onderdelen laat ik ongemoeid — die kunnen partners na de fix zelf gewoon afhandelen; ik rapporteer wel welke het zijn.

**5. Tests**

- Regressietest op de triggerlogica: een item met `item_quote_status = 'bevestigd'`, zonder `quoted_at`, moet van `confirmed` naar `executed` kunnen; van `pending` naar `confirmed` moet nog steeds geweigerd worden.
- Unit tests voor de "project sluiten"-guard (welke onderdelen wel/niet meegaan).

## Technische details

- Migratie: `CREATE OR REPLACE FUNCTION public.guard_item_status_consistency()` — vroege exit bij `NEW.status IN ('executed','invoiced','cancelled')` en bij een ongewijzigde `item_quote_status`.
- `supabase/functions/update-partner-item-status/index.ts`: foutdetails doorgeven in de JSON-response.
- `supabase/functions/dismiss-partner-invoice-item/index.ts`: variant voor bulk per `request_id`, of nieuwe functie `dismiss-partner-project`.
- `src/pages/PartnerProject.tsx` + `src/components/partner-portal/PartnerProjectItemRow.tsx`: knop en foutweergave.
- `supabase/functions/get-partner-dashboard/index.ts`: extra filter op afgeronde projecten.
