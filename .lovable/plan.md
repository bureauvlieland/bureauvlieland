## Plan: Geoapify markers in Word-document

Je hebt een Geoapify API key gedeeld (`5cc50e0…`). Ik sla deze op als secret en pas de edge function aan zodat het kaartje in het Word-document een **rode pin** op de juiste locatie toont.

### Stappen

1. **Secret opslaan** als `GEOAPIFY_API_KEY` (via secrets-tool, zodat de key niet in de codebase staat).
2. **`supabase/functions/generate-program-docx/index.ts`** — `fetchStaticMapPng` vervangen:
   - Primair: Geoapify Static Maps API
     ```
     https://maps.geoapify.com/v1/staticmap
       ?style=osm-bright
       &width=600&height=600
       &center=lonlat:{lng},{lat}
       &zoom=15
       &marker=lonlat:{lng},{lat};color:%23c9602b;size:medium
       &apiKey={GEOAPIFY_API_KEY}
     ```
   - Fallback (als key ontbreekt of fetch faalt): huidige OSM-tegel zonder marker — document blijft genereren.
   - Timeout 5s + nette logging behouden.
3. **Validatie**: Word-document opnieuw genereren voor een test-programma → elk item met coördinaten heeft een zichtbare rode pin op de juiste plek.

### Bestanden
- Edit: `supabase/functions/generate-program-docx/index.ts`
- Nieuw secret: `GEOAPIFY_API_KEY`

Geen schema- of frontend-wijzigingen nodig.
