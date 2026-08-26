# Direct boekbare activiteiten op /bouwstenen

Doel: op de bouwstenen-pagina staan ook de activiteiten die live boekbaar zijn via MijnActiviteitenPlanner (MAP), je kunt filteren op "Direct boekbaar", en zulke blokjes krijgen een reserveerknop die naar de boekpagina gaat met de activiteit al voorgeselecteerd.

## Wat de bezoeker gaat zien

1. **Badge "Direct boekbaar"** op elke bouwsteen waarvoor MAP live tijden heeft in de komende 90 dagen, met daarbij de eerstvolgende datum/tijd ("eerstvolgend: vr 28 aug 10:00").
2. **Extra kaarten** voor MAP-activiteiten die nog geen bouwsteen in het systeem hebben (bijv. TUKTUK-ritten, Kaasbunker, Paal 50). Deze krijgen dezelfde kaartopmaak, met partnernaam, foto uit MAP, prijs per persoon en dezelfde reserveerknop. Ze verschijnen niet dubbel naast een gekoppelde bouwsteen.
3. **Filterknop "Direct boekbaar (n)"** naast de bestaande categoriefilters, plus de bestaande zoek- en categoriefilters die ook op deze nieuwe kaarten werken.
4. **Knop "Direct reserveren"** op boekbare kaarten. Die stuurt naar `/activiteiten-boeken` met de activiteit en datum voorgeselecteerd; daar draait de bestaande boek- en betaalflow. De bestaande knoppen (Meer info / Direct aanvragen / Aan programma) blijven staan voor niet-boekbare bouwstenen.

Bij een storing of leeg MAP-antwoord valt de pagina terug op de huidige weergave — geen badge, geen extra kaarten, geen foutmelding.

## Koppeling bouwsteen ↔ MAP-activiteit

Er is nu nog geen enkele bouwsteen aan een MAP-activiteitstype gekoppeld (het veld `map_activity_type_id` is overal leeg), terwijl 7 partners een MAP-koppeling hebben. Daarom:

- **Automatisch matchen**: eerst op `map_activity_type_id` als die gevuld is, anders op genormaliseerde naam (kleine letters, accenten/leestekens weg) binnen dezelfde partner. Alleen partners met een MAP-slug worden vergeleken, dus geen valse matches.
- **Handmatig vastzetten in admin**: in de bouwsteen-editor komt een keuzelijst "Gekoppelde MAP-activiteit" die de activiteitstypes van de gekozen partner ophaalt. Zo kan een naamverschil eenmalig goed gezet worden. Er staat zichtbaar bij of de koppeling automatisch of handmatig is.

## Technisch

- **Nieuwe hook** `src/hooks/useDirectBookableActivities.ts`: bundelt `useAllMapActivities(vandaag, +90 dagen)` per `ActivityTypeId` + partner en levert per bundel: partner-id/slug, naam, foto, prijs, eerstvolgende departure, totaal beschikbare plekken. Cachet via react-query (staleTime 5 min).
- **Nieuw hulpbestand** `src/lib/directBookable.ts`: normaliseren + matchen van bundels op `BuildingBlock` (`map_activity_type_id` first, dan naam binnen `provider_id`). Unit-tests voor match/geen-match, accenten, en "kopie"-varianten.
- **`src/pages/Bouwstenen.tsx`**: hook + matcher toevoegen; kaartlijst wordt een union van `BuildingBlock`-kaarten en MAP-only kaarten (via een klein `type CatalogCard`); filter-state `onlyBookable`; nieuwe filterknop en badge/reserveerknop in de kaart. Bestaande `HIDDEN_IDS` blijven gerespecteerd.
- **`src/pages/ActiviteitenBoeken.tsx`**: leest query params `?type=<ActivityTypeId>&partner=<slug>&date=<yyyy-mm-dd>` en zet daarmee de datum en zoek/selectie voor, zodat de bezoeker meteen het juiste tijdblok ziet (openen van de detail-sheet met tijden). Geen wijziging aan de boek- of betaallogica.
- **Admin** `src/components/admin/…` bouwsteen-editor: selectveld dat `useMapActivityTypes(partner.map_tenant_slug)` gebruikt en `map_activity_type_id` opslaat. Geen databasewijziging nodig — de kolom bestaat al en staat al in de publieke kolomlijst.
- **SEO**: MAP-only kaarten linken naar de boekpagina (geen nieuwe indexeerbare URL's), dus sitemap en canonicals blijven ongewijzigd.
