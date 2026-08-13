# Geannuleerde onderdelen verbergen + wijzigingen duidelijker in beeld

## 1. Geannuleerde onderdelen uit de lijst

In het Activiteiten-overzicht van een project worden geannuleerde onderdelen nu tussen de actieve regels getoond, wat de lijst rommelig maakt.

- Geannuleerde onderdelen worden standaard niet meer in de dagblokken getoond.
- Onderaan de tabel komt één regel: "3 geannuleerde onderdelen tonen" (klikbaar, onthoudt niks — standaard dicht). Uitgeklapt staan ze grijs en compact onder elkaar, met dag + naam + partner, zodat je ze nog kunt terugvinden of heropenen.
- De teller "Geannuleerd" in het statusoverzicht en de legenda blijven zoals ze zijn, zodat je nooit informatie kwijt bent.
- Dagen waarin álle onderdelen geannuleerd zijn, verdwijnen uit de lijst (staan wel in het uitgeklapte blok).

## 2. Wijzigingen direct zichtbaar in de regel

Nu zie je bij een wijziging alleen een klein pijltje rechts, en pas na "Publiceer & notificeer" verandert de regel echt. Dat wordt:

- **Tijd wijzigen**: de regel springt direct naar de juiste plek in de dag (sortering op de nieuwe tijd), met de nieuwe tijd amber gemarkeerd en de oude tijd doorgehaald ernaast. Onderdelen zonder tijd staan onderaan de dag.
- **Verwijderen**: de hele regel wordt doorgehaald en gedimd met een amber streep links en een chip "Wordt verwijderd". Na publiceren verdwijnt de regel echt.
- **Toevoegen**: groene streep links + chip "Nieuw — nog niet gepubliceerd".
- **Overige wijzigingen** (prijs, aantal personen, dag, partner, opmerking, instructie): amber streep links + chip "Gewijzigd" met de gewijzigde velden erin (bijv. "Gewijzigd: prijs, personen").
- Eén klik op de chip opent dezelfde publiceer-dialoog, zodat de weg naar doorvoeren altijd vanaf de regel zelf loopt.

## 3. Duidelijker "nog niet doorgevoerd"-balk

De bestaande balk boven de tabel krijgt een vaste, opvallender vorm zolang er wijzigingen klaarstaan:

- "3 wijzigingen klaargezet — nog niet doorgevoerd", met knoppen "Publiceer & notificeer" en "Wijzigingen ongedaan maken".
- De balk blijft in beeld bij scrollen binnen de activiteitenkaart, zodat je nooit vergeet te publiceren.

## Technisch

- Alles in `src/pages/admin/AdminRequestDetail.tsx` (Activiteiten-tabel: filtering, dag-groepering, rij-styling) plus een kleine helper voor "effectieve" waarden (pending waarde valt terug op live waarde) en het samenstellen van de wijzigingslabels — bij te plaatsen in `src/lib/` zodat de publiceer-dialoog dezelfde bron gebruikt.
- Geen datamodel- of backendwijzigingen: `pending_*` kolommen en de publiceer-flow (`PublishChangesDialog`, e-mails naar klant/partner) blijven ongewijzigd.
- Sorteren gebeurt alleen in de weergave (op effectieve tijd), niet in de database.
- Unit-tests voor de helper: effectieve tijd/sortering, welke velden als "gewijzigd" gelden, en dat geannuleerde onderdelen buiten de dagweergave vallen.
