

## Plan: Fix withdraw — voeg `withdrawn` toe aan database constraint

### Probleem
De edge function probeert de status op `withdrawn` te zetten, maar de database heeft een CHECK constraint die alleen deze waarden toestaat: `pending`, `submitted`, `selected`, `rejected`, `expired`, `declined`.

### Oplossing
Eén database migratie die de bestaande CHECK constraint vervangt door een versie die ook `withdrawn` bevat.

```sql
ALTER TABLE accommodation_quotes DROP CONSTRAINT accommodation_quotes_status_check;
ALTER TABLE accommodation_quotes ADD CONSTRAINT accommodation_quotes_status_check 
  CHECK (status = ANY (ARRAY['pending','submitted','selected','rejected','expired','declined','withdrawn']));
```

### Daarnaast: fix `logEmail` aanroep in edge function
De `withdraw-accommodation-quote` edge function roept `logEmail(supabase, {...})` aan met twee argumenten, maar de gedeelde `logEmail` functie in `_shared/email-logger.ts` accepteert maar één argument (een `EmailLogEntry` object) en maakt intern een eigen Supabase client aan. Dit moet gecorrigeerd worden — verwijder het eerste `supabase` argument. Ook ontbreekt het verplichte `sent_by` veld.

### Bestanden
1. Database migratie — constraint updaten
2. `supabase/functions/withdraw-accommodation-quote/index.ts` — `logEmail` aanroep fixen

