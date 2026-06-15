## Doel

Wanneer je als admin een programma-onderdeel of losse kostenpost verwijdert, moet dat dezelfde flow volgen als het *toevoegen* of *wijzigen* van een onderdeel: eerst stagen → dan in de **"Wijzigingen publiceren & notificeren"**-dialog bewust kiezen of klant en/of partner een gebundelde mail krijgen, met optionele toelichting en dry-run.

## Huidige situatie

- **Toevoegen / wijzigen** → schrijft `pending_*` velden (o.a. `pending_added`, `pending_marked_for_removal`, `pending_preferred_time`, …) en verschijnt in `PublishChangesDialog` → admin kiest ontvangers → `publish-program-changes` edge function publiceert + mailt gebundeld.
- **Verwijderen (prullenbak-icoon)** → roept direct `notify-partner-item-deletion` aan. Dat:
  - verwijdert het item meteen (hard delete),
  - stuurt automatisch een annuleringsmail naar de betrokken partner,
  - stuurt **geen** mail naar de klant,
  - biedt **geen** keuze, toelichting of dry-run.

Alle benodigde infrastructuur bestaat al:
- kolom `pending_marked_for_removal` in `program_request_items`,
- `PublishChangesDialog` toont al `− Geannuleerd` voor zo'n item,
- `publish-program-changes` verwijdert items waarvoor `pending_marked_for_removal = true` en mailt klant + geselecteerde partners gebundeld.

Alleen de delete-knoppen in `AdminRequestDetail.tsx` slaan deze flow over.

## Wijzigingen

### 1. Programma-onderdeel verwijderen (`src/pages/admin/AdminRequestDetail.tsx`, ~regel 2422-2441)

Prullenbak-`onClick` vervangen door:
- `update program_request_items set pending_marked_for_removal = true where id = item.id`
- `fetchRequestData()` zodat het item in de UI een "Markering: te verwijderen"-staat krijgt (zelfde gedrag als pending-add/pending-edit).
- Toast: *"Gemarkeerd voor verwijdering — open 'Publiceer wijzigingen' om door te voeren."*
- Bij een tweede klik op hetzelfde item: markering ongedaan maken (`pending_marked_for_removal = false`) → toggle-gedrag, consistent met andere pending edits.

De bestaande "Publiceer wijzigingen"-knop bovenaan de pagina (die `pendingItems` telt) pikt het automatisch op; vanuit de dialog wordt het item dan échte hard-deleted door `publish-program-changes` én — afhankelijk van de aangevinkte ontvangers — krijgen klant en/of partner één gebundelde mail.

### 2. Losse kostenpost verwijderen (`extraCosts`, ~regel 2738-2756)

Losse kosten (`block_type = "bureau" / extra_cost`) zijn nooit zichtbaar voor partners en hebben geen klant-portaal-impact — daar is staging overkill. Toch consistent maken:
- Eenvoudige `confirm()`-bevestiging toevoegen ("Weet je zeker dat je deze kostenpost wilt verwijderen?") en daarna direct `delete from program_request_items where id = item.id` via de client (geen edge function nodig, geen mail).
- Reden: deze posten staan los van klant/partner-communicatie; ze door de publiceer-dialog jagen zou alleen ruis geven.

### 3. Geen wijzigingen aan

- `notify-partner-item-deletion` edge function (blijft beschikbaar voor de bestaande legacy-/bulk-paden en projectverwijdering).
- `PublishChangesDialog` zelf (toont al `− Geannuleerd`).
- `publish-program-changes` edge function (handelt removal al af).

## UX-detail

In de itemrij van een onderdeel met `pending_marked_for_removal = true` is het handig dat de prullenbak-knop visueel omschakelt naar bijv. een "Herstel"-icoon (undo) met tooltip *"Markering verwijderen ongedaan maken"*. Dat sluit aan bij hoe andere pending-edits al getoond worden in dezelfde tabel.

## Te raken bestanden

- `src/pages/admin/AdminRequestDetail.tsx` (twee delete-handlers + kleine UI-tweak voor undo-staat van de prullenbak).
