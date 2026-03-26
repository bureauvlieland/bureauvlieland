

## Plan: Fix tabelkoppen + verduidelijk activiteiten-badges

### Probleem 1: Ontbrekende kolom "Klant"
De tabelheaders missen de kolom "Klant". De volgorde in de headers is:
`Referentie(s) → Logies → Activiteiten → Datum(s)`

Maar de cellen renderen:
`Referentie(s) → **Klantnaam** → Logies → Activiteiten → Datum(s)`

Er is dus een header "Klant" vergeten. Daardoor schuiven alle koppen één kolom op.

### Probleem 2: Activiteiten-badges verwarring
De badges ⏳5 ✅4 tonen **partnerstatus** (wacht op bevestiging partner / partner bevestigd). Op de detailpagina staat "Offerte-status: Bevestigd" — dat gaat over **klantgoedkeuring** van het onderdeel, een ander concept. De telling ⏳5 ✅4 klopt wél (5 in afwachting bij partner, 4 bevestigd door partner).

### Wijzigingen

**`src/pages/admin/AdminProjects.tsx`**:
1. Voeg `<TableHead>Klant</TableHead>` toe tussen "Referentie(s)" en "Logies" (rond regel 535)
2. Pas `colSpan` aan in de lege-rij cell (van 11 naar 12)

### Resultaat
Headers kloppen weer: Type | Status | Gereed | Referentie(s) | **Klant** | Logies | Activiteiten | Datum(s) | Personen

### Bestanden
1. `src/pages/admin/AdminProjects.tsx`

