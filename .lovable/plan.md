

# Afwijkende uitvoerder kiezen bij programma-onderdelen

## Probleem
Wanneer Bureau Vlieland een activiteit aan een programma toevoegt of bewerkt, is de uitvoerder altijd gekoppeld aan de bouwsteen (of "Bureau Vlieland" bij bureau-facturatie). Er is geen mogelijkheid om een andere partner als uitvoerder te kiezen. Bijvoorbeeld: een diner dat normaal door Bureau Vlieland wordt geleverd, maar in de praktijk wordt uitgevoerd door Strandhotel Seeduyn omdat zij dit in hun logiesofferte hebben opgenomen.

## Oplossing
Een "Uitvoerder" dropdown toevoegen aan beide admin-sheets, waarmee een partner uit de lijst gekozen kan worden als daadwerkelijke uitvoerder. Deze partner ontvangt dan de notificatie bij akkoord op het programma.

## Technische wijzigingen

### 1. `src/components/admin/AdminAddActivitySheet.tsx`
- Partners ophalen via een query: `supabase.from("partners").select("id, name, email").eq("is_active", true).order("name")`
- Nieuw veld **"Uitvoerder"** toevoegen als dropdown (Select/Combobox), standaard gevuld met de provider van de gekozen bouwsteen
- Optie "Bureau Vlieland" altijd bovenaan
- Bij opslaan: `provider_id`, `provider_name` en `provider_email` worden gezet op de gekozen partner
- Het bestaande "Gefactureerd door" veld (bureau vs partner) blijft, maar de partnernaam past zich aan op de gekozen uitvoerder

### 2. `src/components/admin/AdminEditActivitySheet.tsx`
- Dezelfde partners-query toevoegen
- Nieuw "Uitvoerder" dropdown, standaard gevuld met de huidige `provider_id` van het item
- Bij opslaan: `provider_id`, `provider_name` en `provider_email` bijwerken naar de gekozen partner
- De bestaande "Gefactureerd door" radio wordt aangepast: de partner-optie toont de naam van de gekozen uitvoerder

### 3. Geen database- of backend-wijzigingen nodig
- De kolommen `provider_id`, `provider_name` en `provider_email` bestaan al op `program_request_items`
- De `accept-quote-proposal` edge function gebruikt deze velden al om partners te notificeren, dus de juiste uitvoerder wordt automatisch op de hoogte gebracht bij akkoord

## Resultaat
- Admin kan bij het toevoegen/bewerken van een programma-onderdeel een afwijkende uitvoerder kiezen
- De gekozen uitvoerder wordt automatisch genotificeerd bij akkoord op het programma
- De factuurstroom (bureau vs partner) werkt onafhankelijk van de uitvoerder-keuze

