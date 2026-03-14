

# Plan: Per-partner MAP API keys

## Samenvatting

De MAP API vereist per tenant een eigen API key. In plaats van één centrale key slaan we de API key per partner op in de database en passen de edge functions aan om de juiste key per partner te gebruiken.

## Wijzigingen

### 1. Database migratie
- Nieuw veld `map_api_key` (text, nullable) op de `partners` tabel
- De bestaande centrale `MAP_API_KEY` secret kan als fallback blijven bestaan

### 2. Admin UI (`AdminPartnerDetail.tsx`)
- Nieuw wachtwoord-achtig inputveld "MAP API Key" naast de bestaande slug
- Wordt opgeslagen in `partners.map_api_key`

### 3. Edge function: `map-proxy`
- Ontvangt nu ook `partnerId` in de body
- Haalt de `map_api_key` op uit de `partners` tabel via service role client
- Fallback naar de centrale `MAP_API_KEY` secret als er geen partner-specifieke key is

### 4. Edge function: `map-create-booking`
- Zelfde aanpassing: haalt de API key op uit de partner record

### 5. Hook: `useMapActivities.ts`
- `useAllMapActivities`: stuurt `partnerId` mee in de proxy call zodat de edge function de juiste key kan ophalen
- `useMapActivities`: accepteert optioneel `partnerId`

### 6. Booking componenten
- `MapBookingDialog` stuurt `partnerId` mee naar `map-create-booking`

## Technisch detail

De API key wordt **niet** als secret opgeslagen maar in de database, zodat admins het per partner kunnen beheren zonder developer-interventie. Het veld wordt in de admin UI als password-type getoond. De edge functions gebruiken de service role om de key op te halen — deze is nooit zichtbaar voor de client.

## Bestanden

| Actie | Bestand |
|-------|---------|
| Migratie | `map_api_key` kolom op partners |
| Edit | `supabase/functions/map-proxy/index.ts` |
| Edit | `supabase/functions/map-create-booking/index.ts` |
| Edit | `src/pages/admin/AdminPartnerDetail.tsx` |
| Edit | `src/hooks/useMapActivities.ts` |
| Edit | `src/components/map/MapBookingDialog.tsx` |

