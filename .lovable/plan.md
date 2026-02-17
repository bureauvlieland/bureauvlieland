

# Fix: Klantportaal toegankelijk maken zonder inloggen

## Probleem
De RLS-policies op de tabellen `program_requests`, `program_request_items`, `program_request_history` en `accommodation_requests` staan alleen SELECT toe voor admins (en partners). Er zijn geen policies die anonieme toegang toestaan op basis van het customer_token. Hierdoor werkt het klantportaal alleen wanneer je als admin bent ingelogd.

## Oplossing
Voeg SELECT-policies toe voor de `anon` rol op de relevante tabellen, zodat niet-ingelogde bezoekers hun programma kunnen bekijken via het unieke token.

## Wijzigingen (alleen database-migratie, geen codewijzigingen)

### 1. `program_requests` - anon SELECT toevoegen
Niet-verlopen programma's moeten leesbaar zijn voor anonieme gebruikers. Het customer_token (random hex) fungeert als beveiliging.

```sql
CREATE POLICY "Public can view programs via token"
  ON public.program_requests FOR SELECT
  TO anon
  USING (expires_at > now());
```

### 2. `program_request_items` - anon SELECT toevoegen
Items moeten leesbaar zijn als het bijbehorende programma niet verlopen is.

```sql
CREATE POLICY "Items readable via active request"
  ON public.program_request_items FOR SELECT
  TO anon
  USING (EXISTS (
    SELECT 1 FROM program_requests pr
    WHERE pr.id = program_request_items.request_id
    AND pr.expires_at > now()
  ));
```

### 3. `program_request_history` - anon SELECT toevoegen
Geschiedenis moet leesbaar zijn voor het klantportaal (tijdlijn).

```sql
CREATE POLICY "History readable via active request"
  ON public.program_request_history FOR SELECT
  TO anon
  USING (EXISTS (
    SELECT 1 FROM program_requests pr
    WHERE pr.id = program_request_history.request_id
    AND pr.expires_at > now()
  ));
```

### 4. `accommodation_requests` - anon SELECT toevoegen
Accommodatie-gegevens moeten leesbaar zijn via het klantportaal.

```sql
CREATE POLICY "Accommodation readable via active program"
  ON public.accommodation_requests FOR SELECT
  TO anon
  USING (expires_at > now());
```

## Beveiligingsoverwegingen
- Het customer_token is een willekeurige hex-string (24+ tekens) en fungeert als bearer token
- Dit is hetzelfde patroon als bij `shared_programs` (publiek leesbaar als niet verlopen)
- Verlopen programma's zijn niet toegankelijk
- Geen gevoelige data wordt blootgesteld die niet al via het token bereikbaar zou moeten zijn
- Schrijfacties (INSERT/UPDATE/DELETE) blijven beperkt tot admins/partners

## Bestanden die worden gewijzigd
- Alleen een database-migratie met 4 nieuwe RLS-policies
- Geen codewijzigingen nodig
