## Probleem

De knop "Verzamelfactuur" in de inkoopfactuur-inbox roept twee edge functions aan:
- `parse-collective-invoice` (AI-scan + auto-match)
- `finalize-collective-invoice` (opslaan + Snelstart)

Beide bestaan wel in `supabase/functions/` lokaal, maar zijn **niet gedeployd** op Lovable Cloud. Een aanroep geeft een 404 (`NOT_FOUND`) terug, vandaar de generieke "Parse mislukt" toast.

Bewijs:
- `supabase/curl /parse-collective-invoice` → 404 NOT_FOUND
- `supabase/curl /finalize-collective-invoice` → 404 NOT_FOUND
- Geen edge-logs voor beide functions ooit.

## Plan

1. Deploy `parse-collective-invoice` (bestaand bestand in repo, geen wijzigingen).
2. Deploy `finalize-collective-invoice` (idem).
3. Verifieer dat `LOVABLE_API_KEY` als secret aanwezig is (nodig voor de Gemini-scan in parse).
4. Test door opnieuw op "Verzamelfactuur" te klikken op de Doeksen-mail in de inbox; controleer edge-logs voor errors (PDF-base64, AI-respons).

Geen code- of schema-wijzigingen nodig — alleen deploy.

## Eventuele opvolging

Als na deploy de AI alsnog faalt op de PDF (Gemini accepteert PDF-bytes via `image_url` niet altijd), schakelen we over op `application/pdf`-multimodal-input zoals in andere parse-functions in dit project — dat behandelen we pas als de logs dat aantonen.
