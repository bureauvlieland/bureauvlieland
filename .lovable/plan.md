

## Plan: Programma-onderdelen synchroniseren met actuele bouwsteendata

### Probleem
Programma-onderdelen (`program_request_items`) worden aangemaakt met een kopie van de bouwsteendata op dat moment. Als prijzen, locaties of beschrijvingen later worden bijgewerkt in de bouwstenen, blijven de items verouderd. Er is geen knop om items te verversen met actuele data.

### Oplossing: "Synchroniseer met bouwstenen" functie op AdminRequestDetail

**Nieuwe knop** op de programma-tab van het projectdetailscherm: "Synchroniseer bouwstenen" (naast de bestaande "Template toepassen" knop).

**Werking:**
1. Haal alle `program_request_items` op die een `block_id` hebben (= gekoppeld aan een bouwsteen)
2. Haal de actuele `building_blocks` data op voor die block_ids
3. Toon een preview-dialoog met per item wat er zou veranderen (oude waarde → nieuwe waarde)
4. Admin selecteert welke velden gesynchroniseerd worden (standaard alles aan):
   - `admin_price_override` ← `block.price_adult`
   - `price_type` ← `block.price_type`
   - `location_lat/lng/address` ← `block.location_*`
   - `duration` ← `block.duration`
   - `external_url` ← `block.external_url`
   - `admin_price_notes` ← `block.description / short_description`
   - `block_name` ← `block.name`
   - `block_category` ← `block.category`
5. Na bevestiging: batch-update van de geselecteerde items
6. Items met `quoted_price` (partnerprijs) worden overgeslagen — die prijs is definitief

**Wat niet wordt overschreven:**
- `quoted_price` (definitieve partnerprijs)
- `status`, `day_index`, `preferred_time` (planning)
- `override_people`, `customer_notes` (klantdata)

### Bestanden
1. `src/components/admin/SyncBuildingBlocksDialog.tsx` — nieuw: preview + sync dialoog
2. `src/pages/admin/AdminRequestDetail.tsx` — knop toevoegen die de dialoog opent

