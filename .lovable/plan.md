
Doel: de fout op `/partner/logies?impersonate=hotel-seeduyn` oplossen én “verlopen” logiesoffertes duidelijker zichtbaar maken in een aparte tab.

## Wat ik heb vastgesteld
- De fout is reproduceerbaar op de partner-logiespagina in impersonatie.
- De mislukte request is: `GET accommodation_quotes?partner_id=eq.hotel-seeduyn` met **500**.
- Backend geeft expliciet: **`infinite recursion detected in policy for relation "accommodation_quotes"`**.
- De quote van **Bouwbedrijf Kreeft** bestaat wel degelijk in de database:
  - partner: `hotel-seeduyn`
  - status: `expired`
  - request status: `processing`
  - dus deze hoort zichtbaar te zijn.
- Oorzaak: circulaire RLS-keten:
  1) policy op `accommodation_quotes` verwijst naar `accommodation_requests`
  2) policy op `accommodation_requests` verwijst naar `accommodation_quotes`
  => wederzijdse evaluatie veroorzaakt recursie.

## Implementatieplan

### 1) Backend/RLS recursie structureel oplossen
Ik maak een migratie die de circulaire policy-verwijzing doorbreekt zonder toegangsrechten te verruimen.

Aanpak:
1. Nieuwe **security definer** helperfunctie in `public`:
   - bv. `partner_can_view_accommodation_request(_user_id uuid, _request_id uuid) returns boolean`
   - controleert of er een quote bestaat voor `get_partner_id(_user_id)` op `_request_id`.
2. Bestaande policy op `accommodation_requests`:
   - “Partners can view requests with their quotes”
   - vervangen van inline `EXISTS (SELECT ... FROM accommodation_quotes ...)`
   - naar functie-aanroep:
     - `USING (public.partner_can_view_accommodation_request(auth.uid(), id))`
3. Policies op `accommodation_quotes` ongemoeid laten (tenzij test nog een recursielus toont).

Waarom zo:
- Dit volgt jullie bestaande patroon (`has_role`, `is_admin`, `get_partner_id`) met `SECURITY DEFINER`.
- Voorkomt directe policy-op-policy kruisverwijzing.
- Houdt partner-toegang strikt beperkt tot eigen requests via eigen quotes.

### 2) UI: aparte tab “Verlopen” toevoegen in Partner Logies
Bestand: `src/pages/PartnerAccommodation.tsx`

Wijzigingen:
1. Nieuwe filtergroep:
   - `expiredRequests = requests.filter(r => r.quote?.status === "expired")`
2. `closedRequests` aanpassen zodat “verlopen” eruit gaat:
   - behoud: `selected`, `rejected`, `declined`
3. Tabbar uitbreiden met:
   - `TabsTrigger value="expired"` + badge met count
4. Nieuwe `TabsContent value="expired"`:
   - zelfde card-grid patroon als andere tabs
   - lege-state tekst specifiek voor verlopen offertes
5. Optioneel: default tab op `pending` houden (ongewijzigd).

Resultaat:
- Kreeft (expired) staat in eigen tab en verdwijnt niet in “Afgerond”.
- Partner ziet direct welke offertes actie/verlenging kunnen vereisen.

### 3) Consistentie met dashboard (kleine afstemming)
Omdat de dashboard-weergave al “expired” in completed meeneemt:
- Ik laat dashboardlogica functioneel gelijk.
- Alleen label/duiding in de partner-logiespagina wordt explicieter met aparte tab.
- Geen extra API-wijziging nodig voor deze stap.

## Testplan (eind-tot-eind)
1. Reproduceerroute:
   - Open `/partner/logies?impersonate=hotel-seeduyn` als admin-impersonatie.
   - Verwacht: geen foutscherm “Kon offertes niet laden”.
2. Datacontrole:
   - Controleer dat Kreeft-quote zichtbaar is.
3. Tabcontroles:
   - “Verlopen” toont expired records.
   - “Afgerond” toont alleen selected/rejected/declined.
4. Regressie:
   - gewone partner-login zonder impersonatie werkt nog.
   - andere logiespartners laden normaal.
5. Security-check:
   - partner zonder quote op een request kan dat request niet zien.

## Te wijzigen onderdelen
- Nieuwe DB migratie in `supabase/migrations/*` (functie + policy update).
- `src/pages/PartnerAccommodation.tsx` (tab-opsplitsing).

## Risico’s en mitigatie
- Risico: nog recursie door andere policy-combinaties.
  - Mitigatie: direct na migratie request opnieuw testen en eventuele tweede lus gericht isoleren.
- Risico: tab-aantallen komen niet overeen met oude “closed” count.
  - Mitigatie: expliciete statusmapping documenteren in codecomment.

## Acceptatiecriteria
- Geen 500 meer op `accommodation_quotes` call voor `/partner/logies?impersonate=hotel-seeduyn`.
- Kreeft-offerte zichtbaar voor WestCord.
- Nieuwe tab “Verlopen” aanwezig en correct gevuld.
- Geen verruiming van datarechten buiten bestaande partner-scope.
