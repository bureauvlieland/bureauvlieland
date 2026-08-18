# Foto Café Boven vervangen in de klantportaal-sidebar

De huidige afbeelding in de Café Boven-tip is een screenshot-in-screenshot (je ziet de kaart met titel nog een keer in de foto), dus die klopt niet.

## Wat we doen

- De aangeleverde foto (sfeerbeeld feestavond in Café Boven) wordt als nieuwe afbeelding gebruikt in de Café Boven-tip in de klantportaal-sidebar.
- De foto wordt als CDN-asset toegevoegd (niet als binair bestand in de code) en de oude `cafe-boven.jpg` wordt opgeruimd, zodat er geen ongebruikte afbeelding blijft staan.
- Bijschrift, link en styling blijven precies zoals ze nu zijn.

## Technisch

- `lovable-assets create` op de upload → `src/assets/cafe-boven-feestavond.jpg.asset.json`.
- `src/components/customer-portal/ProgramSidebar.tsx`: import vervangen door het asset-pointerbestand en `src={...url}` gebruiken; alt-tekst iets specifieker ("Feestavond in Café Boven op Vlieland").
- Oude `src/assets/cafe-boven.jpg` verwijderen (alleen hier gebruikt).

Als je deze foto ook op andere plekken (bijv. het logiesportaal of de website) wilt gebruiken, zeg het — dan neem ik die mee.
