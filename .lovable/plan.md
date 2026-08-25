# Fix: "Status overrulen" mislukt op Powerkiten-item

## Diagnose (bevestigd in logs en database)

De fout heeft **niets met de prijs** te maken. De edge-function-logs tonen de werkelijke fout:

> Item 9862ee84 (Powerkiten / Vliegeren) kan niet op status "confirmed" worden gezet voordat partner Vlieland Outdoor Center het heeft bevestigd of een tegenvoorstel heeft gedaan.

- Het item is naar de partner gestuurd, maar de partner heeft **nooit gereageerd** (geen offerte, geen prijsbevestiging — vandaar ook "(schatting)" bij de prijs).
- De database-beveiliging `guard_item_status_consistency` (bewust eerder ingebouwd om te vroeg bevestigen te voorkomen) blokkeert die transitie.
- Probleem: die beveiliging blokkeert **ook de admin-override zelf**. De knop "Status overrulen" kan daardoor nooit werken in precies de situatie waarvoor hij bedoeld is: partner reageert niet, admin wil toch bevestigen.

## Aanpak

1. **Nieuwe kolom** `admin_status_override_reason` (tekst, optioneel) op de items-tabel. Alleen de override-functie vult dit; het blijft op het item zichtbaar als audit-spoor.
2. **Trigger aanpassen** (`guard_item_status_consistency`): de blokkade geldt niet als de update tegelijk die override-kolom zet. Gewone partner- en klantflows raken die kolom nooit, dus de bescherming blijft daar volledig intact.
3. **Partner-beveiliging aanscherpen**: de nieuwe kolom komt op de blokkeerlijst van `guard_partner_request_item_self_update`, zodat een partner zichzelf nooit een override kan geven.
4. **Edge function** `override-item-status`: zet de override-kolom mee bij de update (reden van de admin, of "Handmatig bevestigd door admin").
5. **Betere foutmelding**: de admin-toast toont nu alleen "Edge Function returned a non-2xx status code". Voortaan tonen we de echte melding van de server (bijv. wél een prijs- of statushint als die er is).
6. **Verificatie**: typecheck + test-suite + live test van de functie; daarna kun je het Powerkiten-item gewoon via de knop bevestigen.

## Technisch

- Migratie: `ALTER TABLE program_request_items ADD COLUMN admin_status_override_reason text;` + trigger-update + kolom op partner-blokkeerlijst. Geen GRANTs nodig (bestaande tabel).
- `supabase/functions/override-item-status/index.ts`: kolom meesturen in de update; foutmelding uit response uitlezen.
- `src/components/admin/OverrideItemStatusButton.tsx`: server-message in de toast tonen.
- Test: unit-test op de trigger-logica blijft via bestaande vitest-suite groen; gedrag live geverifieerd via edge-function-aanroep.
