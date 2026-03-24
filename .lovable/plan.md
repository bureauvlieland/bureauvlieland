

## Plan: Verloopdatum bewerkbaar maken + verloopstatus-detectie

### Probleem

1. **Verloopdatum niet bewerkbaar**: De "Geldig tot" datum (6 mrt. 2026) wordt alleen getoond als tekst — er is geen manier om deze te verlengen
2. **Geen automatische verloopdetectie**: De offerte is verlopen (vandaag is 24 mrt, geldig tot 6 mrt) maar de status staat nog op "Offerte verstuurd". Dit zou automatisch op "Verlopen" moeten staan, of minimaal een waarschuwing tonen

### Wijzigingen

**1. `src/pages/admin/AdminRequestDetail.tsx` — verloopdatum inline bewerkbaar**

De huidige tekst "Geldig tot: 6 mrt. 2026" vervangen door een klikbare datum met een Popover + Calendar component:
- Klik op de datum → kalender opent → kies nieuwe datum → direct opslaan naar `program_requests.quote_valid_until`
- Als de nieuwe datum in de toekomst ligt en de status "verlopen" is, automatisch terugzetten naar "offerte_verstuurd"
- Visuele indicatie: rode tekst als de datum in het verleden ligt

**2. `src/pages/admin/AdminRequestDetail.tsx` — verlopen-waarschuwing**

In de bestaande statuskaart, als `quote_valid_until < vandaag` en `quote_status === "offerte_verstuurd"`:
- Toon een amberkleurige waarschuwing: "Let op: de geldigheidsdatum is verstreken"
- Optioneel: knop "Markeer als verlopen" of automatisch status aanpassen

### Bestanden
1. `src/pages/admin/AdminRequestDetail.tsx` — bewerkbare datum + verloopwaarschuwing

