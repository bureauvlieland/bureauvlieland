

## Plan: Kaartweergave in bewerkingssheet toont locatie van vorig item

### Probleem

De `LocationPicker` initialiseert de Leaflet-kaart in een `useEffect` met **lege dependency array** (`[]`). Dat betekent dat de kaart alleen bij de eerste mount de `lat`/`lng` props gebruikt. Wanneer je achtereenvolgens twee items bewerkt (bijv. eerst "Overtocht Harlingen → Vlieland" en dan "Fietshuur"), blijft de kaart op de vorige locatie staan terwijl het adresveld wél correct bijwerkt.

### Oplossing

In `src/components/admin/LocationPicker.tsx` een extra `useEffect` toevoegen die reageert op wijzigingen in `lat` en `lng`:
- Bestaande marker verplaatsen naar de nieuwe coördinaten
- Kaart centreren op de nieuwe locatie
- Bij `null`-coördinaten: marker verwijderen en terugvallen op Vlieland-centrum

### Wijzigingen

| Bestand | Actie |
|---|---|
| `src/components/admin/LocationPicker.tsx` | `useEffect` toevoegen die bij verandering van `lat`/`lng` de marker en kaartview bijwerkt |

Eén bestand, kleine toevoeging.

