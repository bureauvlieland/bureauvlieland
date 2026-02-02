
# Fix: Dubbele Trigger Veroorzaakt 409 Conflict Error

## Probleem Analyse

Bij het indienen van een logiesaanvraag krijg je een **409 Conflict** error met de melding:
```
duplicate key value violates unique constraint "program_requests_linked_accommodation_id_unique"
Key (linked_accommodation_id)=(cbd79a05-...) already exists
```

### Oorzaak

Er zijn **twee database triggers** die dezelfde functie `create_program_for_accommodation()` aanroepen:

| Trigger | Type | Probleem |
|---------|------|----------|
| `auto_create_program_for_accommodation` | BEFORE INSERT | ❌ Foutief - wordt te vroeg uitgevoerd |
| `create_program_for_accommodation_trigger` | AFTER INSERT | ✅ Correct - dit is de bedoelde trigger |

Wanneer een nieuwe logiesaanvraag wordt ingediend:
1. **BEFORE INSERT trigger** probeert een program_request aan te maken
2. **AFTER INSERT trigger** probeert opnieuw een program_request aan te maken
3. → Dubbele insert leidt tot UNIQUE constraint violation

### Database Constraint

De tabel `program_requests` heeft een UNIQUE constraint op `linked_accommodation_id`, wat voorkomt dat meerdere programma's naar dezelfde logiesaanvraag verwijzen. Dit is correct gedrag, maar de dubbele trigger veroorzaakt dat dezelfde aanvraag twee keer wordt geprobeerd.

## Oplossing

Verwijder de incorrecte **BEFORE INSERT** trigger. De AFTER INSERT trigger is de juiste omdat:
- Het `NEW.id` (de accommodation_request ID) dan gegarandeerd bestaat
- De DEFERRABLE foreign key constraint correct kan worden gevalideerd
- Dit overeenkomt met de documentatie in memory/infrastructure/database-constraint-architecture

## Technische Wijziging

### Database Migratie (1 SQL statement)

```sql
-- Verwijder de incorrecte BEFORE INSERT trigger
DROP TRIGGER IF EXISTS auto_create_program_for_accommodation ON accommodation_requests;
```

Dat is alles - de `create_program_for_accommodation_trigger` (AFTER INSERT) blijft behouden en werkt correct.

## Verificatie

Na de fix:
- Nieuwe logiesaanvragen worden correct verwerkt
- Één program_request wordt automatisch aangemaakt per logiesaanvraag
- Geen duplicate key violations meer

## Risico's

| Risico | Impact | Mitigatie |
|--------|--------|-----------|
| Geen | Laag | We verwijderen alleen de overbodige trigger, de correcte blijft behouden |
