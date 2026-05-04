# Juridisch deel-akkoord bij logiesselectie

## Doel

Borg dat Bureau Vlieland niet contractueel klem zit richting logiespartner zodra een klant een offerte selecteert: de klant geeft op dát moment expliciet en aantoonbaar akkoord op de relevante voorwaarden (UVH 2024 of partnervoorwaarden + Bureau Vlieland-bemiddelingsvoorwaarden), in plaats van pas bij het eind-akkoord aan het einde van het traject.

## Wat we bouwen

### 1. Verplichte voorwaarden-bevestiging in `SelectQuoteDialog`

Uitbreiden met een akkoord-blok dat de klant moet doorlopen vóór de selectie definitief wordt:

- **Voorwaarden inline tonen** met de juiste set per logies:
  - Bemiddelingsvoorwaarden Bureau Vlieland (altijd, link naar `/algemene-voorwaarden`)
  - Voorwaarden van de gekozen logies-partner: custom PDF als `partner.terms_pdf_path` aanwezig en `uses_default_terms = false`, anders Standaardvoorwaarden Partneraanbod (`/partner-voorwaarden`)
  - UVH 2024 (link) als de partner geen custom voorwaarden heeft
- **Verplichte checkbox**: "Ik ga akkoord met bovenstaande voorwaarden voor dit verblijf en begrijp dat de annuleringsvoorwaarden van de logies vanaf dit moment van toepassing zijn."
- **Naamveld** ("Volledige naam") voor digitale ondertekening, min. 2 tekens.
- Knop "Bevestigen" alleen actief als checkbox aan + naam ingevuld.

Tone: formeel ("u"), conform memory.

### 2. Akkoord vastleggen bij selectie

`useAccommodationQuotes.selectQuote` accepteert nieuwe parameters `signatureName` en `acceptedTerms` (samenstelling: bureau, partner_custom/partner_default, uvh_2024). De daadwerkelijke insert gebeurt server-side in een nieuwe edge function `select-accommodation-quote`:

1. Verifieert klant-token + quote behoort bij `accommodation_request`.
2. Zet quote op `selected` (en triggert bestaande auto-reject van overige quotes — bestaand gedrag blijft).
3. Schrijft per geaccepteerde voorwaardenset een rij in `accepted_terms_log`:
   - `terms_type`: `bureau_vlieland`, `partner_custom`, `partner_default`, of `uvh_2024`
   - `terms_pdf_path`: snapshot van het PDF-pad op moment van akkoord
   - `terms_version`: timestamp / versie-string
   - `accepted_at`: now
   - `partner_id` / `partner_name`: van de gekozen logies-partner
   - `request_id`: linked `program_request.id` (bestaande FK)
4. Slaat handtekeninggegevens op de quote zelf op (zie schema-wijziging).
5. Stuurt een bevestigingsmail naar de klant met:
   - Overzicht gekozen logies + prijs
   - Lijst geaccepteerde voorwaarden + downloadlinks
   - Duidelijke vermelding: "Vanaf nu gelden de annuleringsvoorwaarden van [partner]."

### 3. Database

**Schemamigratie** (alleen structuur):

- Op `accommodation_quotes`:
  - `customer_terms_accepted_at timestamptz`
  - `customer_signature_name text`
  - `customer_terms_ip text`
- `accepted_terms_log.terms_type` toestaat extra waarde `accommodation_selection` (alleen documentatie via comment; kolom is `text`, geen check-constraint nodig).
- Index `idx_accepted_terms_log_request` bestaat al.

Geen wijziging aan `program_requests.terms_accepted_at` — dat blijft het eind-akkoord op het totaal.

### 4. Eind-akkoord (`AcceptTermsCard`) bewust van deel-akkoord

- Per partner / voorwaardenset die al deel-geaccepteerd is via logies-selectie tonen we "Reeds geaccepteerd op [datum] door [naam]" in plaats van opnieuw vragen.
- Checkbox-tekst past zich aan: dekt nog alleen de overige (nog niet geaccepteerde) voorwaarden.
- Als alle relevante voorwaarden al deel-geaccepteerd zijn, blijft alleen de bevestiging op het totaalprogramma over (handtekening + akkoord op uitvoering).
- Eind-akkoord blijft het ankerpunt voor activiteiten en bevestigt de eerder gegeven deel-akkoorden mee in `accepted_terms_log` (bestaand gedrag blijft).

### 5. Admin-zichtbaarheid

In `AdminRequestDetail` (Logies-tab / project-overzicht) tonen:
- Per geselecteerde logiesofferte: badge "Voorwaarden geaccepteerd op [datum] door [naam]" met expand naar de gelogde rijen.
- Bij ontbrekend deel-akkoord (legacy data): waarschuwing "Geen deel-akkoord vastgelegd — eind-akkoord vereist".

Geen aparte tabbladen of nieuwe overzichten; puur informatief in de bestaande logies-sectie.

## Bestanden

- **Nieuw**:
  - `supabase/functions/select-accommodation-quote/index.ts`
  - `supabase/migrations/<ts>_accommodation_quote_terms_acceptance.sql`
- **Aangepast**:
  - `src/components/accommodation-portal/SelectQuoteDialog.tsx` (akkoord-blok)
  - `src/hooks/useAccommodationQuotes.ts` (parameters doorgeven, edge function aanroepen i.p.v. directe update)
  - `src/pages/AccommodationQuotes.tsx` (state voor signature/checkbox doorgeven)
  - `src/components/customer-portal/AcceptTermsCard.tsx` (deel-akkoord respecteren)
  - `src/components/admin/...` logies-detailblok (status-badge tonen)
  - `src/types/acceptedTerms.ts` (nieuw `terms_type`-literal)

## Migratie van bestaande data

Reeds geselecteerde logies (vóór deze release) hebben geen deel-akkoord. Daar accepteren we de huidige situatie: het eind-akkoord blijft daar het juridische ankerpunt, en de admin-waarschuwing maakt zichtbaar dat er geen deel-akkoord is. Geen backfill nodig.

## Buiten scope (nu)

- Punt 6 uit eerder advies (zelfde patroon voor losse partner-activiteiten) — bewust uitgesteld.
- PDF-bewijsstuk per deel-akkoord — bestaande HTML-mail volstaat als bewijs; PDF kan later.
- Aanpassingen aan partner-portal (partner ziet al "selected" status, geen extra info nodig).

## Resultaat

Op het moment dat een klant een logiesofferte selecteert, ligt er een sluitend, gelogd akkoord op de exact toepasselijke voorwaarden — inclusief annuleringsregime. Bureau Vlieland heeft daarmee verhaalsrecht richting de klant gelijk aan de verplichting richting de partner. Het eind-akkoord blijft bestaan als bevestiging op het totaal, maar is niet langer het enige juridische ankerpunt voor logies.
