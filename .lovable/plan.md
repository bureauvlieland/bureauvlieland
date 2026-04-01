
Plan: kaartweergave in de admin-activiteitensheet echt corrigeren

Wat ik heb gecontroleerd
- Voor BV-2603-0018 zijn de opgeslagen item-locaties van Zeehondentocht, Fietshuur en beide overtochten gelijk aan de gekoppelde bouwstenen.
- Er is wel een oudere dubbele bouwsteen `fietshuur-weekend`, maar die wordt hier niet gebruikt; dit project gebruikt `fiets-huur`.
- Conclusie: voor dit project zit het probleem niet meer in de data-overname, maar in de kaartweergave zelf.

Waarschijnlijke oorzaak
- `LocationPicker` draait in een sheet/modal met Leaflet.
- De kaart wordt wel geüpdatet met nieuwe coördinaten, maar nooit expliciet “hersteld” nadat de container zichtbaar of van grootte verandert.
- Daardoor kan de kaart visueel verschuiven of een verkeerde uitsnede tonen terwijl adres en coördinaten al correct zijn.
- Dat verklaart ook waarom de bouwsteenkaart goed kan lijken en de programmakaart niet.

Aanpak
1. `src/components/admin/LocationPicker.tsx`
   - Na initialisatie en bij wijziging van `lat/lng` altijd `map.invalidateSize()` uitvoeren.
   - Dat doen op `requestAnimationFrame` plus een korte fallback timeout, daarna `setView(...)` en marker syncen.
   - `lat != null && lng != null` gebruiken in plaats van truthy checks.
   - Optioneel een `ResizeObserver` toevoegen zodat de kaart zichzelf herstelt bij sheets/tabs/resizes.

2. `src/components/admin/AdminEditActivitySheet.tsx`
   - `LocationPicker` een `key={item.id}` geven zodat bij wisselen tussen activiteiten de Leaflet-instance schoon remount en geen oude interne staat meeneemt.

3. Geen automatische bulk-database-update in deze fix
   - Ik heb wel 40 echte locatie-afwijkingen gevonden tussen items en bouwstenen in andere projecten.
   - Die wil ik niet blind overschrijven, omdat item-locaties soms bewust kunnen afwijken.
   - Als vervolgstap is een expliciete sync per project veiliger.

Technische details
- Bestanden:
  - `src/components/admin/LocationPicker.tsx`
  - `src/components/admin/AdminEditActivitySheet.tsx`
- Geen databasewijziging nodig voor BV-2603-0018.
- Mogelijke vervolgstap later: `src/components/admin/SyncBuildingBlocksDialog.tsx` uitbreiden voor gecontroleerde locatie-sync per project.

Verwacht resultaat
- De kaart in “Activiteit bewerken” toont dezelfde locatie als de bouwsteen voor BV-2603-0018.
- Wisselen tussen Zeehondentocht, Fietshuur en ferry-items laat geen oude of visueel verschoven kaartpositie meer zien.
