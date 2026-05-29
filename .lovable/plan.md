## Probleem

De "Actualiseer" knop op de Werkbank geeft `Failed to send a request to the Edge Function`. Oorzaak: de edge functie `reconcile-admin-todos` bestaat wel in de code (`supabase/functions/reconcile-admin-todos/index.ts`) maar is nog **nooit gedeployed** — er staan geen logs voor en de functie ontbreekt op de server. De vorige aanpassing heeft alleen het bestand bijgewerkt zonder een nieuwe deploy te triggeren.

## Oplossing

1. **Forceer een deploy van `reconcile-admin-todos`** via de deploy tool (`supabase--deploy_edge_functions`), zodat de functie beschikbaar wordt op de Cloud.
2. **Verifieer** dat de functie reageert door hem direct aan te roepen (`supabase--curl_edge_functions` met `POST /reconcile-admin-todos`) en de response (closed/created/scanned) te checken.
3. Als de deploy alsnog faalt: edge function logs ophalen en lockfile / imports controleren (esm.sh `@supabase/supabase-js@2.45.0` werkt elders in het project, dus geen wijziging verwacht).

## Buiten scope

- Geen wijziging aan de werking van de knop of UI in `AdminWerkbank.tsx`.
- Geen wijziging aan `useReconcileTodos.ts` — de hook is correct.
