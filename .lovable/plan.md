

## Productie-Readiness: Afbeeldingen & Testdata

Dit plan behandelt twee onderdelen voor productie-readiness:
1. Partners in staat stellen om afbeeldingen te uploaden met kwaliteitseisen
2. Overzicht van testdata die opgeschoond kan worden

---

### Deel 1: Partner Afbeelding Upload

#### Huidige situatie

De PartnerBlockSheet (`src/components/partner-portal/PartnerBlockSheet.tsx`) heeft **geen** afbeelding upload functionaliteit. Partners zien hun bouwstenen met placeholder afbeeldingen.

De admin BuildingBlockSheet heeft deze functionaliteit al:
- Upload naar `building-block-images` bucket (publieke bucket)
- Opslaan als `{blockId}.{ext}` in storage
- Automatisch updaten van `image_url` veld

#### Implementatie

**1. PartnerBlockSheet uitbreiden met afbeelding upload**

```text
Nieuwe velden toevoegen:
- Afbeelding preview (huidige of placeholder)
- Upload knop met kwaliteitseisen label
- Progress indicator tijdens upload
```

**2. Kwaliteitseisen communiceren**

```text
┌──────────────────────────────────────────┐
│  📷 Afbeelding                           │
│  ┌────────────────────────────────────┐  │
│  │     [Preview afbeelding]          │  │
│  └────────────────────────────────────┘  │
│                                          │
│  [Nieuwe afbeelding uploaden]            │
│                                          │
│  Vereisten:                              │
│  • Minimaal 800 x 600 pixels             │
│  • Formaat: JPG, PNG of WebP             │
│  • Maximaal 5 MB                         │
│  • Landschapsoriëntatie (liggend)        │
│  • Geen tekst of logo's in de afbeelding │
└──────────────────────────────────────────┘
```

**3. Client-side validatie toevoegen**

- Controleren bestandstype (image/jpeg, image/png, image/webp)
- Controleren bestandsgrootte (max 5MB)
- Controleren afmetingen na laden (min 800x600, aspect ratio ~16:9 of ~4:3)
- Waarschuwing bij niet-liggend formaat

**4. Gebruik bestaande hook**

De `useUploadBlockImage` hook in `useBuildingBlocks.ts` kan hergebruikt worden.

#### Bestanden aan te passen

| Bestand | Wijziging |
|---------|-----------|
| `src/components/partner-portal/PartnerBlockSheet.tsx` | Afbeelding upload sectie toevoegen |
| `src/types/partner.ts` | `PartnerBuildingBlock` type controleren (heeft al `image_url`) |

---

### Deel 2: Testdata Overzicht

#### Huidige testdata in de database

**Program Requests (7 records)**
| Reference | Klant | Status | Actie |
|-----------|-------|--------|-------|
| BV-2601-0007 | Test Klant (Test Bedrijf B.V.) | active | Verwijderen |
| BV-2601-0006 | Test Klant Bureau Vlieland | active | Verwijderen |
| BV-2601-0005 | Test Klant Bureau Vlieland | active | Verwijderen |
| BV-2601-0004 | Jan de Vries | active | Verwijderen |
| BV-2601-0003 | Erwin Soolsma (NORISK) | active | Behouden (echte klant?) |
| BV-2601-0002 | Jan de Vries | active | Verwijderen |
| BV-2601-0001 | Jan de Vries | active | Verwijderen |

**Accommodation Requests (3 records)**
| Reference | Klant | Status | Actie |
|-----------|-------|--------|-------|
| LOG-2601-0003 | Jan de Vries | accepted | Verwijderen |
| LOG-2601-0002 | Jan de Vries | quoted | Verwijderen |
| LOG-2601-0001 | Erwin Soolsma | processing | Behouden? |

**Building Blocks met placeholder images**

De meeste bouwstenen hebben `image_asset` maar geen `image_url`. Dit is geen probleem - de `getBlockImage()` utility in `buildingBlockUtils.ts` valt terug op lokale assets. De placeholder wordt alleen getoond als:
- Er geen `image_url` is (storage)
- En het `image_asset` niet in de `assetMap` staat

Bouwstenen met correcte afbeeldingen (via asset of storage):
- beach-games, borrel, ebike-tour, fiets-huur, luxe-lunch
- boot-retour (heeft storage URL)
- vliegeren, rescueboat, silent-disco, strand-bbq
- sunset-dinner, surfen, vliehors-expres, vuurtoren, zeehondentocht

#### Opschoon script (handmatig uit te voeren)

Je kunt de testdata verwijderen via de Cloud View SQL editor:

```sql
-- VOORZICHTIG: Alleen uitvoeren na bevestiging welke records test zijn

-- Verwijder test program request items eerst (cascade)
DELETE FROM program_request_items 
WHERE request_id IN (
  SELECT id FROM program_requests 
  WHERE customer_name LIKE 'Test%' 
     OR customer_name = 'Jan de Vries'
);

-- Verwijder test program request history
DELETE FROM program_request_history 
WHERE request_id IN (
  SELECT id FROM program_requests 
  WHERE customer_name LIKE 'Test%' 
     OR customer_name = 'Jan de Vries'
);

-- Verwijder test program requests
DELETE FROM program_requests 
WHERE customer_name LIKE 'Test%' 
   OR customer_name = 'Jan de Vries';

-- Verwijder test accommodation requests
DELETE FROM accommodation_requests 
WHERE customer_name = 'Jan de Vries';

-- (Optioneel) Verwijder test accommodation quotes
DELETE FROM accommodation_quotes 
WHERE request_id IN (
  SELECT id FROM accommodation_requests 
  WHERE customer_name = 'Jan de Vries'
);
```

---

### Samenvatting implementatie

| Prioriteit | Onderdeel | Impact |
|------------|-----------|--------|
| Hoog | Partner afbeelding upload | Partners kunnen eigen afbeeldingen aanleveren |
| Medium | Testdata opschonen | Schone productie-database |
| Laag | Building block assets verifiëren | Cosmetisch - assets werken al correct |

---

### Technisch overzicht

**Nieuwe functionaliteit:**
- Afbeelding upload met preview in PartnerBlockSheet
- Client-side validatie voor bestandstype, grootte en dimensies
- Kwaliteitseisen communicatie naar partners

**Bestaande infrastructuur (hergebruik):**
- `building-block-images` storage bucket (publiek)
- `useUploadBlockImage` hook
- `getBlockImage()` utility voor fallback logica

