## Getroffen dossiers

Bouwsteen `beach-games` ("Beach Games") komt voor in **2 lopende projecten** en in **0 templates**:

| Referentie | Klant | Bedrijf | Project status | Item status |
|---|---|---|---|---|
| BV-2604-0003 | Sylvia Vet | Kuiper Bouw | active | pending |
| BV-2605-0003 | Amy Jellema-Bogaart | — | active | pending |

(Beide items hebben `block_id = beach-games`. Templates / voorbeeldprogramma's bevatten de bouwsteen niet.)

## Vergelijking blokken

| | beach-games | strandspektakel |
|---|---|---|
| Naam | Beach Games | Strandspektakel |
| Prijs p.p. | € 30,00 | € 32,50 |
| Locatie | Strand t.h.v. bushalte Ankerplaats | (idem) |
| Provider | Vlieland Outdoor Center | (idem) |
| `is_active` | **false** | true |
| `is_published` | true | true |

Beide gepubliceerd, maar `beach-games.is_active = false` — daarom zie je 'm niet meer in de configurator. In bestaande projecten blijft hij wel zichtbaar omdat de items een eigen kopie houden van naam/prijs (zie [Item Inheritance memory](mem://data/program-request-item-inheritance)).

## Wijzigingen

### 1. Items vervangen (data update via insert-tool)
Voor de 2 items hierboven, alleen als `quoted_price IS NULL` (= nog geen partner-prijs ingevuld), worden deze velden overschreven met die van Strandspektakel:
- `block_id` → `strandspektakel`
- `block_name` → `Strandspektakel`
- `location_address`, `location_lat`, `location_lng` → uit Strandspektakel (zelfde, maar consistent)
- `duration`, `price_type`, `block_category` → uit Strandspektakel
- `admin_price_override` blijft staan als al ingevuld; anders niet zetten (Bureau bepaalt prijs alsnog)

Status van het item blijft `pending` zodat de partner opnieuw bevestigt.

⚠️ Als één van de 2 items al een `quoted_price` heeft (= partner heeft Beach Games al geprijsd), markeer ik 'm wél met de nieuwe naam, maar laat de prijs staan en plaats een note. Op basis van huidige data: beide hebben `quoted_price = NULL`, dus dit is hypothetisch.

### 2. Bouwsteen `beach-games` uit aanbod
Update op `building_blocks` rij `beach-games`:
- `is_published = false`
- `status = 'concept'`
- `is_active` blijft `false`

Hiermee verdwijnt de bouwsteen uit configurator, MAP, partnerportaal-overzicht, admin-publicatielijst — maar de rij blijft bestaan zodat historische items en logs niets verliezen. Niet hard verwijderen want er zijn nog (geannuleerde/historische) items die ernaar verwijzen.

### 3. Communicatie naar partner
Niet automatisch een mail. Partner (Vlieland Outdoor Center) ziet beide pending items in z'n portaal verschijnen onder de nieuwe naam zodra de admin het opnieuw verstuurt. **Suggestie**: jij verstuurt deze 2 items handmatig opnieuw vanuit het projectdetail (knop "Verstuur naar partner") nadat de update klaar is, zodat de partner de juiste activiteitnaam krijgt.

## Geen code-wijziging
Dit is puur een datamigratie + statuswijziging op één bouwsteen. Geen frontend/backend code aangepast.

## Verificatie achteraf
1. `building_blocks` controleren: `beach-games` heeft `is_published=false`, `status='concept'`.
2. `program_request_items` controleren: 0 rijen met `block_id='beach-games'` in actieve, niet-cancelled projecten.
3. Beide projecten openen en visueel checken dat "Strandspektakel" nu wordt getoond.
