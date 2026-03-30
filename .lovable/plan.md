

## Plan: Activiteitentabel vereenvoudigen

### Probleem
De tabel heeft 9+ kolommen met veel visuele ruis: badges, inline-editors, popovers en dubbele statusindicatoren. Op een breed scherm is het nog leesbaar, maar het voelt overweldigend.

### Aanpak — minder kolommen, visuele groepering per dag

**1. Kolom "Gefactureerd door" verwijderen**
Deze info is bijna altijd hetzelfde (bepaald door `invoicing_mode`). Al zichtbaar in het blauwe banner bovenaan. Kolom schrappen uit beide tabel-varianten.

**2. Dag-kolom vervangen door visuele groepering**
In plaats van elke rij "Dag 1", "Dag 1", "Dag 2" te herhalen: een groepskop-rij per dag (`colspan`) met "Dag 1 — do 9 apr." als label. De aparte Dag-kolom vervalt.

**3. Klant-akkoord samenvoegen met status**
De losse "Klant akkoord" / "Wacht op klant" badge integreren als klein icoon (✓ groen / ⏳ amber) direct naast de status-badge, in plaats van eronder als tweede badge.

**4. Tijd-kolom compacter**
De inline-edit popover en confirm-button alleen tonen bij hover op de rij, niet standaard zichtbaar. Scheelt visuele drukte.

### Resultaat
Van 9 kolommen → 7 kolommen (quote-modus) / 6 kolommen (regulier), plus visuele daggroepering die de structuur verduidelijkt.

### Bestanden

| Bestand | Actie |
|---|---|
| `src/pages/admin/AdminRequestDetail.tsx` | Kolom "Gefactureerd door" verwijderen, dag-groepering toevoegen, klant-akkoord icoon inline, tijd-knoppen hover-only |

Eén bestand, refactor van de tabel-sectie.

