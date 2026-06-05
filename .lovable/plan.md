## Probleem

Twee edge functions zijn **niet gedeployed** en geven 404:
- `parse-bank-statement` (wordt aangeroepen bij upload van .camt053-bestand)
- `match-bank-lines` (wordt aangeroepen door parse-bank-statement)

Hierdoor mislukt het uploaden van .camt053 bankafschriften stilletjes.

## Oorzaak

Beide bestanden importeren `corsHeaders` uit `npm:@supabase/supabase-js@2/cors` — dat subpath bestaat niet in het pakket, waardoor de deploy faalt. Alle andere (wel werkende) edge functions definiëren `corsHeaders` gewoon inline.

## Oplossing

1. In `supabase/functions/parse-bank-statement/index.ts` en `supabase/functions/match-bank-lines/index.ts`:
   - Verwijder de import `import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'`
   - Vervang door inline definitie:
     ```ts
     const corsHeaders = {
       "Access-Control-Allow-Origin": "*",
       "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
     };
     ```
2. Beide functies opnieuw deployen.
3. Verifiëren met een test-call (verwacht 401 zonder auth = bewijs van deploy).
4. Eventueel bevestigen door een .camt053 te uploaden in de UI.

## Scope

Alleen de twee genoemde edge function bestanden — geen frontend, geen DB.