# MAP-activiteitentypes als bouwsteen-bron op /partner/aanbod

## Doel

Partners met een MAP-koppeling (`partners.map_tenant_slug` ingevuld) zien hun MAP activity types automatisch op hun aanbod-pagina. Een type kan in twee staten verkeren:

1. **Nog niet gepubliceerd** → kaartje met "MAP"-badge en knop *Verrijken & publiceren*. Open de bestaande Bouwsteen-sheet, voorgevuld met MAP-data; opslaan = nieuw `building_blocks`-record (status `concept`) gekoppeld via `map_activity_type_id`.
2. **Al gekoppeld aan een bouwsteen** → MAP-type wordt niet apart getoond; in plaats daarvan toont de bestaande bouwsteenkaart een extra MAP-badge ("Synchroon met MAP") zodat duidelijk is dat de bron MAP is.

## UX op /partner/aanbod

Lay-out blijft de huidige drie secties (Gepubliceerd / Goedgekeurd / Wacht op goedkeuring), met daaronder een nieuwe sectie:

```
[Gepubliceerd]            ← bestaande bouwstenen
[Goedgekeurd]
[Wacht op goedkeuring]
[Beschikbaar vanuit MAP]  ← nieuw, alleen zichtbaar als partner.map_tenant_slug bestaat
```

De MAP-sectie:
- Titel: "Beschikbaar vanuit MAP" + ondertitel "Activiteitentypes uit MijnActiviteitenPlanner. Verrijk en publiceer ze om als bouwsteen te gebruiken."
- Lege staat (alle types al verrijkt): "Alle MAP-types zijn al toegevoegd aan uw aanbod."
- Per type een kaartje met:
  - MAP-afbeelding (via bestaande `mapImageUrl`)
  - Naam + korte beschrijving (uit MAP)
  - Badge linksboven `MAP` (gekleurd, herkenbaar — accent kleur)
  - Vermelding duur in uur, indien aanwezig
  - Primaire knop *Verrijken & publiceren* → opent `PartnerBlockSheet` met voorgevulde data
  - Disabled / waarschuwing als `IsAvailableOnline === false`

Op bestaande bouwsteenkaart waar `map_activity_type_id` is gevuld: een tweede badge naast de status-badge, tekst "Synchroon met MAP", subtiele accent-styling.

## Gegevensmodel

Eén kolom toevoegen aan `building_blocks`:
- `map_activity_type_id integer NULL` — verwijst naar `MapActivityType.Id` per partner (uniek binnen `provider_id`).
- Unique partial index op `(provider_id, map_activity_type_id) WHERE map_activity_type_id IS NOT NULL` om dubbele koppelingen te voorkomen.
- Geen FK (MAP is extern).

RLS hoeft niet aangepast (kolom valt onder bestaande policies).

## Verrijk-flow

1. Partner klikt *Verrijken & publiceren* op een MAP-kaart.
2. `PartnerBlockSheet` opent met `isNew=true` en een nieuwe prop `prefillFromMap` waarin: naam, beschrijving, duur (in uren → tekst "X uur"), prijs (`PricePerPerson`), max personen (`MaxPersons`), externe boekings-URL (`https://boeking.mijnactiviteitenplanner.nl/{slug}`), `map_activity_type_id`.
3. Sheet werkt verder als bestaande "nieuwe activiteit"-flow → opslaan = `concept` (wacht op goedkeuring).
4. MAP-image wordt automatisch overgenomen door bij het opslaan een serverside-fetch te doen (in een lichte edge function `import-map-image`) die het MAP-bestand ophaalt en in `building-block-images` upload, daarna `image_url` zet. Als import faalt: stille fallback, partner kan handmatig uploaden (huidige flow).
5. Na opslaan refresht de aanbod-pagina; de MAP-kaart verdwijnt uit de MAP-sectie en het nieuwe concept verschijnt onder "Wacht op goedkeuring" met de "Synchroon met MAP"-badge.

## Plaatsing in code

Wijzigingen, allemaal in frontend behalve één migratie + één edge function:

- **Migratie**: kolom `map_activity_type_id` + unique partial index.
- **`src/pages/PartnerBlocks.tsx`**:
  - Haal partner op (incl. `map_tenant_slug`).
  - Gebruik `useMapActivityTypes(slug, !!slug, partnerId)`.
  - Bereken `linkedTypeIds = new Set(blocks.filter(b => b.map_activity_type_id).map(...))`.
  - Filter MAP-types die nog niet gekoppeld zijn → `availableMapTypes`.
  - Render nieuwe sectie met `MapTypeCard`.
  - Geef `prefillFromMap` mee aan `PartnerBlockSheet` als de gebruiker vanaf MAP komt.
- **Nieuw component `src/components/partner-portal/MapTypeCard.tsx`** — visueel duidelijk verschillend (accent-rand + MAP-badge).
- **`PartnerBlockSheet.tsx`**:
  - Nieuwe prop `prefillFromMap?: { ... }`.
  - In `getInitialFormData` voorvullen wanneer prefill aanwezig is.
  - Bij opslaan (alleen wanneer `isNew && prefillFromMap`): set `map_activity_type_id` en roep daarna `import-map-image` edge function aan.
- **`PartnerBuildingBlock` type** — veld `map_activity_type_id?: number | null` toevoegen + select-list in `PartnerBlocks.tsx` uitbreiden.
- **Edge function `import-map-image`** — input `{ blockId, mapImageRef, partnerId, slug }`; haalt bestand op, uploadt naar `building-block-images`, update `building_blocks.image_url`. Service-role key; valideert dat caller admin is óf eigenaar van het block.
- **Bestaande BlockCard** — toon "Synchroon met MAP"-badge wanneer `map_activity_type_id` aanwezig is.

## Buiten scope (expliciet)

- Geen automatische sync van prijs/voorraad uit MAP ná publicatie (partner beheert dat zelf in de bouwsteen).
- Geen tonen op publieke `/partners`-pagina — daar tellen we al `block_count`; dit verandert daar niets.
- Geen automatisch verwijderen van bouwsteen als type uit MAP verdwijnt (handmatig).

## Risico's

- MAP-image-import kan falen bij CORS of niet-bestaande `Image`-referentie → fallback naar handmatig.
- Partners zonder MAP-koppeling zien niets nieuws; geen regressie.
- `useMapActivityTypes` cached 10 minuten → eventueel nieuwe types pas zichtbaar na refresh; acceptabel.
