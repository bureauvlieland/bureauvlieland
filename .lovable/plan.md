

## Plan: Logies overzicht — badge kleur + pending teller

### Wijzigingen

**`src/pages/admin/AdminAccommodation.tsx`**:

1. **"Geaccepteerd" badge groene kleur** — Pas `STATUS_CONFIG.accepted` aan van `variant: "default"` naar een custom className met groene styling (bijv. `bg-green-100 text-green-800`), vergelijkbaar met hoe "Maatwerk" en "Direct" badges al custom kleuren gebruiken.

2. **Pending count toevoegen aan quoteCounts** — In de `quoteCounts` query (regel 112-124), tel ook `pending` quotes mee (status `"pending"` of `"requested"` — quotes die verstuurd zijn naar partners maar nog geen reactie hebben).

3. **Pending tonen in Offertes kolom** — Na `{submitted}/{total} ontvangen` en de afgewezen-teller, voeg ook het aantal pending toe, bijv. `· 3 in afwachting` in een amber/neutrale kleur.

### Resultaat
- "Geaccepteerd" badge wordt groen i.p.v. standaard donker
- Offertes kolom toont: `2/6 ontvangen · 1 afgewezen · 3 in afwachting`

### Bestanden
1. `src/pages/admin/AdminAccommodation.tsx`
2. `src/pages/admin/AdminAccommodationDetail.tsx` (zelfde STATUS_CONFIG sync)

