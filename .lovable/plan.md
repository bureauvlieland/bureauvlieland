

## Plan: Partner "Over ons" profiel + foto-upload bij kamersoorten

### Huidige situatie
- Partners hebben basale bedrijfsgegevens (naam, adres, KvK) en een korte `accommodation_description` tekst
- Kamersoorten (`partner_room_types`) hebben een `images` JSONB-kolom maar er is geen upload-UI
- Er is geen "Over ons" sectie met bedrijfsfoto's, beschrijving, of locatie
- De `partners` tabel heeft al `image_url` (niet gebruikt in portaal) en locatievelden ontbreken

### Voorstel

**Fase 1: Database — nieuwe velden op `partners` tabel**

Migratie met nieuwe kolommen:
- `about_text` (text) — uitgebreide "Over ons" tekst
- `gallery_images` (jsonb, default `[]`) — array van `{ url, alt? }` objecten
- `location_lat` (numeric) — breedtegraad
- `location_lng` (numeric) — lengtegraad
- `location_description` (text) — korte locatiebeschrijving ("Direct aan het strand")
- `website_url` (text) — website van de partner
- `highlight_features` (jsonb, default `[]`) — USP's/kenmerken ("Eigen restaurant", "Fietsverhuur")

**Fase 2: Storage bucket voor partner-afbeeldingen**

Nieuwe storage bucket `partner-images` (public) met RLS:
- Partners mogen uploaden/verwijderen in hun eigen map (`{partner_id}/...`)
- Publiek leesbaar

**Fase 3: Partner Settings — "Over ons" sectie**

In `PartnerSettingsForm.tsx` een nieuwe Card toevoegen:
- **Over ons tekst** — Textarea voor uitgebreide beschrijving
- **Website URL** — Input
- **Kenmerken/USP's** — Tags die partner kan toevoegen/verwijderen
- **Locatie** — Lat/lng velden (of adres-gebaseerd)
- **Foto's** — Upload-grid (max ~8 foto's), drag-and-drop, verwijderen
  - Uploadt naar `partner-images/{partner_id}/`
  - Slaat URLs op in `gallery_images` JSONB

**Fase 4: Kamertype foto-upload**

In `PartnerRoomTypeSheet.tsx`:
- Foto-uploadsectie toevoegen (max ~4 per kamertype)
- Uploadt naar `partner-images/{partner_id}/rooms/`
- Slaat op in de bestaande `images` JSONB-kolom op `partner_room_types`

**Fase 5: Weergave aan de voorkant**

Nog niet in deze iteratie — eerst de data laten vullen door partners. Daarna gebruiken bij:
- Configurator (BuildingBlockCard)
- Klantportaal (programma-presentatie)
- Offertes (PDF)

### Bestanden

| Bestand | Wat |
|---|---|
| Database migratie | Kolommen + storage bucket + RLS |
| `src/components/partner-portal/PartnerSettingsForm.tsx` | "Over ons" Card met tekst, website, kenmerken, foto-upload |
| `src/components/partner-portal/PartnerRoomTypeSheet.tsx` | Foto-uploadsectie voor kamertypes |
| `src/components/partner-portal/PartnerImageUpload.tsx` (nieuw) | Herbruikbare foto-upload component |
| `src/types/partner.ts` | Nieuwe velden toevoegen aan Partner interface |

